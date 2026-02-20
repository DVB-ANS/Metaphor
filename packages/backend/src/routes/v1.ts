// ─── V1 Routes — On-chain aggregated data for frontend ──────────────
// Returns real on-chain data. Empty arrays / zero stats when nothing exists.

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { ethers } from 'ethers';
import { getContract, ADDRESSES } from '../config.js';
import { listReports, getReport } from '../services/ai-client.js';
import { cantonClient } from '../services/canton-client.js';

const router: RouterType = Router();

// ─── Helpers ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, string> = { 0: 'active', 1: 'attention', 2: 'matured' };

async function fetchAllTokens() {
  const factory = getContract('TokenFactory', ADDRESSES.tokenFactory);
  const addrs: string[] = await factory.getAllTokens();
  return Promise.all(
    addrs.map(async (addr) => {
      const token = getContract('RWAToken', addr);
      const [name, symbol, totalSupply, [isin, rate, maturity, issuer]] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
        token.getMetadata(),
      ]);
      return {
        address: addr,
        name,
        symbol,
        isin,
        rate: Number(rate),
        maturity: Number(maturity),
        maturityDate: maturity > 0 ? new Date(Number(maturity) * 1000).toISOString().slice(0, 10) : null,
        issuer,
        totalSupply: totalSupply.toString(),
      };
    }),
  );
}

async function fetchAllVaults() {
  const vm = getContract('VaultManager', ADDRESSES.vaultManager);
  const nextId = Number(await vm.nextVaultId());
  const vaults = [];
  for (let i = 0; i < nextId; i++) {
    try {
      const [owner, status, createdAt] = await vm.getVaultInfo(i);
      const tokenAddrs: string[] = await vm.getVaultTokens(i);

      let totalValue = 0;
      const assets = await Promise.all(
        tokenAddrs.map(async (addr, idx) => {
          try {
            const token = getContract('RWAToken', addr);
            const balance = await vm.getVaultBalance(i, addr);
            const balNum = Number(ethers.formatUnits(balance, 18));
            totalValue += balNum;
            const [name, [, rate, maturity]] = await Promise.all([
              token.name(),
              token.getMetadata(),
            ]);
            return {
              id: `asset-${i}-${idx}`,
              name,
              type: 'corporate-bond' as const,
              allocation: 0, // calculated below
              value: balNum,
              rating: 'N/A',
              couponRate: Number(rate) / 100,
              maturityDate: maturity > 0 ? new Date(Number(maturity) * 1000).toISOString().slice(0, 10) : 'N/A',
              jurisdiction: 'N/A',
            };
          } catch {
            return null;
          }
        }),
      );

      const validAssets = assets.filter(Boolean) as NonNullable<(typeof assets)[number]>[];
      // Calculate allocations
      if (totalValue > 0) {
        for (const a of validAssets) {
          a.allocation = Math.round((a.value / totalValue) * 100);
        }
      }

      vaults.push({
        id: `vault-${i}`,
        onChainId: i,
        name: `Vault #${i}`,
        totalValue,
        riskScore: null,
        riskLevel: null,
        status: STATUS_MAP[Number(status)] || 'active',
        assetCount: validAssets.length,
        yieldYTD: null,
        createdAt: createdAt > 0 ? new Date(Number(createdAt) * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        assets: validAssets,
        owner,
      });
    } catch {
      // skip inaccessible vaults
    }
  }
  return vaults;
}

async function fetchAllPayments() {
  try {
    const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler);
    const count = Number(await scheduler.bondCount());
    const payments: any[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count; i++) {
      try {
        const bond = await scheduler.getBond(i);
        const dates: bigint[] = await scheduler.getPaymentDates(i);
        const couponAmount = await scheduler.getCouponAmount(i);

        for (const date of dates) {
          const ts = Number(date);
          const payment = await scheduler.getPayment(i, date);
          const dateStr = new Date(ts * 1000).toISOString().slice(0, 10);
          const daysUntil = Math.max(0, Math.ceil((ts - now) / 86400));
          const status = ts <= now ? 'completed' : 'scheduled';
          payments.push({
            id: `pay-${i}-${ts}`,
            assetName: `Bond #${i}`,
            amount: Number(ethers.formatUnits(couponAmount, 18)),
            date: dateStr,
            daysUntil,
            vaultId: `bond-${i}`,
            vaultName: `Bond #${i}`,
            status,
          });
        }
      } catch {
        // skip inaccessible bonds
      }
    }
    return payments;
  } catch {
    return [];
  }
}

// ─── GET /v1/dashboard ───────────────────────────────────────────────

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    let vaults: any[] = [];
    let tokens: any[] = [];
    let payments: any[] = [];

    try { vaults = await fetchAllVaults(); } catch { /* empty */ }
    try { tokens = await fetchAllTokens(); } catch { /* empty */ }
    try { payments = await fetchAllPayments(); } catch { /* empty */ }

    const aiReports = listReports();
    const latestReport = aiReports.length > 0 ? aiReports[aiReports.length - 1] : null;

    const totalValue = vaults.reduce((s, v) => s + v.totalValue, 0);
    const upcomingPayments = payments.filter((p) => p.status === 'scheduled');

    res.json({
      stats: {
        totalValue,
        yieldYTD: 0,
        activeVaults: vaults.filter((v) => v.status === 'active').length,
        tokenizedAssets: tokens.length,
        upcomingPayments: upcomingPayments.length,
      },
      vaults,
      upcomingPayments: upcomingPayments.slice(0, 5),
      latestAIAnalysis: latestReport
        ? {
            vaultName: latestReport.vaultId,
            score: latestReport.riskScore,
            riskLevel: latestReport.riskLevel,
            recommendations: latestReport.recommendations.length,
            date: latestReport.createdAt,
          }
        : null,
    });
  } catch (err: any) {
    res.json({
      stats: { totalValue: 0, yieldYTD: 0, activeVaults: 0, tokenizedAssets: 0, upcomingPayments: 0 },
      vaults: [],
      upcomingPayments: [],
      latestAIAnalysis: null,
    });
  }
});

// ─── GET /v1/vaults ──────────────────────────────────────────────────

router.get('/vaults', async (_req: Request, res: Response) => {
  try {
    const vaults = await fetchAllVaults();
    res.json(vaults);
  } catch {
    res.json([]);
  }
});

// ─── GET /v1/vaults/:id ─────────────────────────────────────────────

router.get('/vaults/:id', async (req: Request, res: Response) => {
  try {
    const vaults = await fetchAllVaults();
    const vault = vaults.find((v) => v.id === req.params.id);
    if (!vault) {
      res.status(404).json({ error: 'Vault not found' });
      return;
    }
    res.json(vault);
  } catch {
    res.status(404).json({ error: 'Vault not found' });
  }
});

// ─── GET /v1/tokens ──────────────────────────────────────────────────

router.get('/tokens', async (_req: Request, res: Response) => {
  try {
    const tokens = await fetchAllTokens();
    res.json(tokens);
  } catch {
    res.json([]);
  }
});

// ─── GET /v1/payments ────────────────────────────────────────────────

router.get('/payments', async (req: Request, res: Response) => {
  try {
    let payments = await fetchAllPayments();
    const { vaultId } = req.query;
    if (vaultId) {
      payments = payments.filter((p) => p.vaultId === vaultId);
    }
    res.json(payments);
  } catch {
    res.json([]);
  }
});

// ─── GET /v1/ai/reports ──────────────────────────────────────────────

router.get('/ai/reports', (req: Request, res: Response) => {
  try {
    const { vaultId } = req.query;
    const reports = listReports(vaultId as string | undefined);
    res.json(reports);
  } catch {
    res.json([]);
  }
});

// ─── GET /v1/ai/reports/:id ─────────────────────────────────────────

router.get('/ai/reports/:id', (req: Request, res: Response) => {
  const report = getReport(req.params.id as string);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json(report);
});

// ─── GET /v1/ai/score-history ────────────────────────────────────────

router.get('/ai/score-history', (_req: Request, res: Response) => {
  res.json([]);
});

// ─── GET /v1/canton/vaults ───────────────────────────────────────────

router.get('/canton/vaults', async (_req: Request, res: Response) => {
  try {
    const result = await cantonClient.query('ConfidentialVault', 'admin');
    res.json(result);
  } catch {
    res.json([]);
  }
});

// ─── GET /v1/admin/wallets ───────────────────────────────────────────

router.get('/admin/wallets', (_req: Request, res: Response) => {
  res.json([]);
});

export default router;

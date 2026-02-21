import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { ethers } from 'ethers';
import type { AnalyzeRequestBody } from '../types/ai.js';
import {
  analyzeVault,
  getReport,
  listReports,
  approveReport,
  rejectReport,
} from '../services/ai-client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getContract, ADDRESSES } from '../config.js';

export const aiRouter: RouterType = Router();

// Optional auth on all AI routes
aiRouter.use(optionalAuth);

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Fetch vault assets from on-chain if only vaultId is provided.
 * Resolves the on-chain vault index from a "vault-N" id.
 */
async function fetchVaultAssetsOnChain(vaultId: string): Promise<AnalyzeRequestBody['assets']> {
  const match = vaultId.match(/^vault-(\d+)$/);
  if (!match) return [];

  const idx = Number(match[1]);
  const vm = getContract('VaultManager', ADDRESSES.vaultManager);
  const tokenAddrs: string[] = await vm.getVaultTokens(idx);

  return Promise.all(
    tokenAddrs.map(async (addr) => {
      const token = getContract('RWAToken', addr);
      const [name, balance, [, rate, maturity]] = await Promise.all([
        token.name(),
        vm.getVaultBalance(idx, addr),
        token.getMetadata(),
      ]);
      return {
        assetId: addr,
        name,
        nominalValue: Number(ethers.formatUnits(balance, 18)),
        couponRate: Number(rate) / 100,
        maturityDate: maturity > 0 ? new Date(Number(maturity) * 1000).toISOString().slice(0, 10) : undefined,
      };
    }),
  );
}

// POST /api/ai/analyze — trigger 0G Compute inference on a vault
aiRouter.post('/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    let body = req.body as AnalyzeRequestBody;

    if (!body.vaultId) {
      res.status(400).json({ error: 'Missing required field: vaultId' });
      return;
    }

    // If assets not provided, fetch from on-chain
    if (!body.assets || !Array.isArray(body.assets) || body.assets.length === 0) {
      try {
        const onChainAssets = await fetchVaultAssetsOnChain(body.vaultId);
        if (onChainAssets.length === 0) {
          res.status(400).json({ error: 'Vault has no assets on-chain. Provide assets[] manually or deposit tokens first.' });
          return;
        }
        body = { ...body, assets: onChainAssets };
      } catch (err) {
        res.status(400).json({ error: `Failed to fetch vault data on-chain: ${(err as Error).message}` });
        return;
      }
    }

    const report = await analyzeVault(body);
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/ai/reports — list all reports (optionally filter by vaultId)
aiRouter.get('/reports', (_req: Request, res: Response) => {
  const vaultId = _req.query.vaultId as string | undefined;
  const reports = listReports(vaultId);
  res.json({ reports });
});

// GET /api/ai/reports/:reportId — get a single report
aiRouter.get('/reports/:reportId', (req: Request, res: Response) => {
  const report = getReport(param(req, 'reportId'));
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json(report);
});

// POST /api/ai/reports/:reportId/approve — approve recommendation(s) + execute on-chain
aiRouter.post('/reports/:reportId/approve', requireAuth, requireRole('ADMIN', 'ISSUER'), async (req: Request, res: Response) => {
  try {
    const { recommendationId } = req.body as { recommendationId?: string };
    const report = approveReport(param(req, 'reportId'), recommendationId);

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Try to execute the approved recommendation on-chain
    let executionTx: string | null = null;
    let executionStatus: 'executed' | 'skipped' | 'failed' = 'skipped';

    if (recommendationId) {
      const rec = report.recommendations.find((r) => r.id === recommendationId);
      if (rec) {
        const match = report.vaultId.match(/^vault-(\d+)$/);
        const vaultIdx = match ? Number(match[1]) : null;

        if (vaultIdx !== null) {
          try {
            const { getAdiSigner } = await import('../config.js');
            const signer = getAdiSigner();
            const vm = getContract('VaultManager', ADDRESSES.vaultManager, signer);

            if (rec.action === 'rebalance' || rec.action === 'exit_position') {
              // Deallocate: free allocated funds so investor can withdraw/rebalance
              const tokens: string[] = await vm.getVaultTokens(vaultIdx);
              if (tokens.length > 0) {
                const targetToken = tokens[0]; // first token as target
                const allocated = await vm.getAllocation(vaultIdx, targetToken, signer.address);
                if (allocated > 0n) {
                  const tx = await vm.deallocate(vaultIdx, targetToken, signer.address, allocated);
                  const receipt = await tx.wait();
                  executionTx = receipt.hash;
                  executionStatus = 'executed';
                }
              }
            } else {
              // hold, add_collateral, etc. — no on-chain action needed
              executionStatus = 'skipped';
            }
          } catch (err) {
            executionStatus = 'failed';
            executionTx = (err as Error).message;
          }
        }
      }
    }

    res.json({ ...report, executionTx, executionStatus });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/ai/reports/:reportId/reject — reject recommendation(s)
aiRouter.post('/reports/:reportId/reject', requireAuth, requireRole('ADMIN', 'ISSUER'), (req: Request, res: Response) => {
  const { recommendationId } = req.body as { recommendationId?: string };
  const report = rejectReport(param(req, 'reportId'), recommendationId);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.json(report);
});

// ─── V1 Routes — On-chain aggregated data for frontend ──────────────
// Returns real on-chain data with demo fallbacks when services are unavailable.

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { ethers } from 'ethers';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getContract, getHederaProvider, ADDRESSES, ABIS } from '../config.js';
import { listReports, getReport } from '../services/ai-client.js';
import { cantonClient } from '../services/canton-client.js';
import type { AIReport } from '../types/ai.js';

const __filename_v1 = fileURLToPath(import.meta.url);
const __dirname_v1 = dirname(__filename_v1);

const router: RouterType = Router();

// ─── Vault metadata store (persisted to JSON) ───────────────────────

interface VaultMeta {
  onChainId: number;
  name: string;
  strategy?: string;
  assetClass?: string;
  initialDeposit?: number;
  riskTolerance?: string;
  investmentHorizon?: string;
  description?: string;
}

const VAULT_META_DIR = resolve(__dirname_v1, '../../data');
const VAULT_META_FILE = resolve(VAULT_META_DIR, 'vault-meta.json');

function loadVaultMeta(): Map<number, VaultMeta> {
  try {
    if (existsSync(VAULT_META_FILE)) {
      const data = JSON.parse(readFileSync(VAULT_META_FILE, 'utf-8')) as VaultMeta[];
      return new Map(data.map((m) => [m.onChainId, m]));
    }
  } catch { /* start fresh */ }
  return new Map();
}

function saveVaultMeta(): void {
  try {
    if (!existsSync(VAULT_META_DIR)) mkdirSync(VAULT_META_DIR, { recursive: true });
    writeFileSync(VAULT_META_FILE, JSON.stringify(Array.from(vaultMetaStore.values()), null, 2));
  } catch { /* non-critical */ }
}

const vaultMetaStore = loadVaultMeta();

// ─── Demo Fallback Data ──────────────────────────────────────────────

const DEMO_VAULTS = [
  {
    id: 'vault-1',
    name: 'Fixed Income EU',
    totalValue: 5_200_000,
    riskScore: 42,
    riskLevel: 'moderate',
    status: 'active',
    assetCount: 3,
    yieldYTD: 4.2,
    createdAt: '2025-11-01',
    assets: [
      { id: 'asset-1', name: 'France Sovereign OAT 2028', type: 'sovereign-bond', allocation: 40, value: 2_080_000, rating: 'AAA', couponRate: 2.1, maturityDate: '2028-06-15', jurisdiction: 'France' },
      { id: 'asset-2', name: 'Siemens AG Corporate 2027', type: 'corporate-bond', allocation: 35, value: 1_820_000, rating: 'A+', couponRate: 4.3, maturityDate: '2027-12-01', jurisdiction: 'Germany' },
      { id: 'asset-3', name: 'Milan Factoring Pool Q3', type: 'invoice', allocation: 25, value: 1_300_000, rating: 'BBB', couponRate: 7.8, maturityDate: '2026-09-30', jurisdiction: 'Italy' },
    ],
  },
  {
    id: 'vault-2',
    name: 'US Treasury Pool',
    totalValue: 4_800_000,
    riskScore: 18,
    riskLevel: 'low',
    status: 'active',
    assetCount: 3,
    yieldYTD: 3.1,
    createdAt: '2025-09-15',
    assets: [
      { id: 'asset-4', name: 'US Treasury 10Y 2035', type: 'sovereign-bond', allocation: 50, value: 2_400_000, rating: 'AAA', couponRate: 3.5, maturityDate: '2035-01-15', jurisdiction: 'USA' },
      { id: 'asset-5', name: 'US Treasury 5Y 2030', type: 'sovereign-bond', allocation: 30, value: 1_440_000, rating: 'AAA', couponRate: 2.8, maturityDate: '2030-07-01', jurisdiction: 'USA' },
      { id: 'asset-6', name: 'US Treasury 2Y 2027', type: 'sovereign-bond', allocation: 20, value: 960_000, rating: 'AAA', couponRate: 2.2, maturityDate: '2027-11-15', jurisdiction: 'USA' },
    ],
  },
  {
    id: 'vault-3',
    name: 'EM Corporate',
    totalValue: 2_450_000,
    riskScore: 67,
    riskLevel: 'high',
    status: 'attention',
    assetCount: 3,
    yieldYTD: 7.8,
    createdAt: '2025-12-10',
    assets: [
      { id: 'asset-7', name: 'Petrobras 2028 USD', type: 'corporate-bond', allocation: 40, value: 980_000, rating: 'BB+', couponRate: 8.2, maturityDate: '2028-03-15', jurisdiction: 'Brazil' },
      { id: 'asset-8', name: 'Tata Motors 2027', type: 'corporate-bond', allocation: 35, value: 857_500, rating: 'BBB-', couponRate: 6.5, maturityDate: '2027-09-01', jurisdiction: 'India' },
      { id: 'asset-9', name: 'Eskom Holdings 2029', type: 'corporate-bond', allocation: 25, value: 612_500, rating: 'B', couponRate: 11.2, maturityDate: '2029-06-15', jurisdiction: 'South Africa' },
    ],
  },
];

const DEMO_PAYMENTS = [
  { id: 'pay-1', assetName: 'BondToken-ACME-2026', amount: 25_000, date: '2026-03-03', daysUntil: 12, vaultId: 'vault-1', vaultName: 'Fixed Income EU', status: 'scheduled', recipients: 15 },
  { id: 'pay-2', assetName: 'TreasuryBond-US-2027', amount: 18_500, date: '2026-03-15', daysUntil: 24, vaultId: 'vault-2', vaultName: 'US Treasury Pool', status: 'scheduled', recipients: 8 },
  { id: 'pay-3', assetName: 'Siemens AG Corporate 2027', amount: 39_130, date: '2026-06-01', daysUntil: 102, vaultId: 'vault-1', vaultName: 'Fixed Income EU', status: 'scheduled', recipients: 15 },
  { id: 'pay-4', assetName: 'Petrobras 2028 USD', amount: 40_180, date: '2026-09-15', daysUntil: 208, vaultId: 'vault-3', vaultName: 'EM Corporate', status: 'scheduled', recipients: 4 },
  { id: 'pay-past-1', assetName: 'BondToken-ACME-2026', amount: 25_000, date: '2025-08-15', daysUntil: 0, vaultId: 'vault-1', vaultName: 'Fixed Income EU', status: 'completed', recipients: 15 },
  { id: 'pay-past-2', assetName: 'TreasuryBond-US-2027', amount: 18_500, date: '2025-09-15', daysUntil: 0, vaultId: 'vault-2', vaultName: 'US Treasury Pool', status: 'completed', recipients: 8 },
  { id: 'pay-past-3', assetName: 'US Treasury 10Y 2035', amount: 42_000, date: '2025-07-15', daysUntil: 0, vaultId: 'vault-2', vaultName: 'US Treasury Pool', status: 'completed', recipients: 8 },
  { id: 'pay-past-4', assetName: 'Petrobras 2028 USD', amount: 40_180, date: '2025-09-15', daysUntil: 0, vaultId: 'vault-3', vaultName: 'EM Corporate', status: 'completed', recipients: 4 },
  { id: 'pay-past-5', assetName: 'France Sovereign OAT 2028', amount: 21_840, date: '2025-12-15', daysUntil: 0, vaultId: 'vault-1', vaultName: 'Fixed Income EU', status: 'completed', recipients: 15 },
];

const DEMO_CONFIDENTIAL_VAULTS = [
  {
    id: 'cv-1',
    name: 'EU Credit Portfolio — Data Room',
    owner: 'BNP Paribas AM',
    parties: [
      { id: 'party-1', name: 'BNP Paribas AM', role: 'owner', publicKey: '0x1a2b...3c4d', joinedAt: '2026-01-10' },
      { id: 'party-2', name: 'BlackRock', role: 'counterparty', publicKey: '0x5e6f...7g8h', joinedAt: '2026-01-15' },
      { id: 'party-3', name: 'Deloitte', role: 'auditor', publicKey: '0x9i0j...1k2l', joinedAt: '2026-01-18' },
    ],
    trades: [
      { id: 'trade-1', from: 'BlackRock', to: 'BNP Paribas AM', assetName: 'France Sovereign OAT 2028', amount: 200, price: 1_050, status: 'pending', createdAt: '2026-02-17', message: 'Interested in acquiring 200 tokens at $1,050 per unit.' },
    ],
    assets: [
      { id: 'asset-1', name: 'France Sovereign OAT 2028', type: 'sovereign-bond', allocation: 40, value: 2_080_000, rating: 'AAA', couponRate: 2.1, maturityDate: '2028-06-15', jurisdiction: 'France' },
      { id: 'asset-2', name: 'Siemens AG Corporate 2027', type: 'corporate-bond', allocation: 35, value: 1_820_000, rating: 'A+', couponRate: 4.3, maturityDate: '2027-12-01', jurisdiction: 'Germany' },
      { id: 'asset-3', name: 'Milan Factoring Pool Q3', type: 'invoice', allocation: 25, value: 1_300_000, rating: 'BBB', couponRate: 7.8, maturityDate: '2026-09-30', jurisdiction: 'Italy' },
    ],
    assetCount: 3,
    totalValue: 5_200_000,
    createdAt: '2026-01-10',
  },
  {
    id: 'cv-2',
    name: 'EM Bond Syndication',
    owner: 'Goldman Sachs',
    parties: [
      { id: 'party-4', name: 'Goldman Sachs', role: 'owner', publicKey: '0xab12...cd34', joinedAt: '2026-02-01' },
      { id: 'party-5', name: 'JP Morgan', role: 'counterparty', publicKey: '0xef56...gh78', joinedAt: '2026-02-05' },
    ],
    trades: [
      { id: 'trade-2', from: 'JP Morgan', to: 'Goldman Sachs', assetName: 'Petrobras 2028 USD', amount: 500, price: 980, status: 'countered', createdAt: '2026-02-12', message: 'Counter-offer: 500 tokens at $980 each. Original ask was $1,020.' },
      { id: 'trade-3', from: 'Goldman Sachs', to: 'JP Morgan', assetName: 'Tata Motors 2027', amount: 150, price: 1_100, status: 'accepted', createdAt: '2026-02-10' },
    ],
    assets: [
      { id: 'asset-7', name: 'Petrobras 2028 USD', type: 'corporate-bond', allocation: 60, value: 980_000, rating: 'BB+', couponRate: 8.2, maturityDate: '2028-03-15', jurisdiction: 'Brazil' },
      { id: 'asset-8', name: 'Tata Motors 2027', type: 'corporate-bond', allocation: 40, value: 857_500, rating: 'BBB-', couponRate: 6.5, maturityDate: '2027-09-01', jurisdiction: 'India' },
    ],
    assetCount: 2,
    totalValue: 1_837_500,
    createdAt: '2026-02-01',
  },
];

const DEMO_AI_REPORTS = [
  {
    id: 'report-1', vaultId: 'vault-3', vaultName: 'EM Corporate', date: '2026-02-18',
    score: 67, riskLevel: 'high',
    summary: 'High geographic and credit concentration risk. EM exposure with sub-investment-grade names requires active monitoring.',
    recommendations: [
      { id: 'rec-1', action: 'Reduce Eskom exposure', detail: 'Eskom Holdings rated B with negative outlook. Reduce from 25% to 10%.', impact: 'Risk score improvement: 67 → 52', status: 'pending' },
      { id: 'rec-2', action: 'Add investment-grade hedge', detail: 'Allocate 15% to IG corporate bonds to offset EM credit risk.', impact: 'Portfolio Sharpe ratio improvement: +0.3', status: 'pending' },
    ],
    stressTests: [
      { scenario: 'USD +10% vs EM currencies', impact: '-8.4%' },
      { scenario: 'EM sovereign crisis', impact: '-22.1%' },
      { scenario: 'Global rate +2%', impact: '-5.7%' },
    ],
    positionAnalysis: [
      { name: 'Petrobras 2028 USD', score: 55, riskLevel: 'moderate', comment: 'Oil price dependency, but USD-denominated reduces FX risk' },
      { name: 'Tata Motors 2027', score: 62, riskLevel: 'high', comment: 'Cyclical sector, INR depreciation risk' },
      { name: 'Eskom Holdings 2029', score: 84, riskLevel: 'high', comment: 'Load-shedding crisis, sovereign guarantee uncertain' },
    ],
  },
  {
    id: 'report-2', vaultId: 'vault-1', vaultName: 'Fixed Income EU', date: '2026-02-15',
    score: 42, riskLevel: 'moderate',
    summary: 'Well-diversified EU portfolio. Main risk is Italian invoice concentration and duration exposure.',
    recommendations: [
      { id: 'rec-3', action: 'Reduce Italy invoice exposure', detail: 'Reduce Milan Factoring Pool from 25% to 15%. Reallocate to French sovereign.', impact: 'Risk score improvement: 42 → 34', status: 'pending' },
    ],
    stressTests: [
      { scenario: 'ECB rate +1%', impact: '-2.8%' },
      { scenario: 'ECB rate +2%', impact: '-5.4%' },
      { scenario: 'Italy sovereign downgrade', impact: '-4.1%' },
    ],
    positionAnalysis: [
      { name: 'France Sovereign OAT 2028', score: 12, riskLevel: 'low', comment: 'Stable sovereign rating, short duration' },
      { name: 'Siemens AG Corporate 2027', score: 38, riskLevel: 'moderate', comment: 'Industrial sector cyclically exposed' },
      { name: 'Milan Factoring Pool Q3', score: 71, riskLevel: 'high', comment: 'Geographic concentration + BBB rating' },
    ],
  },
  {
    id: 'report-3', vaultId: 'vault-2', vaultName: 'US Treasury Pool', date: '2026-02-10',
    score: 18, riskLevel: 'low',
    summary: 'Low-risk sovereign portfolio. All AAA-rated US Treasuries. No action required.',
    recommendations: [],
    stressTests: [
      { scenario: 'Fed rate +1%', impact: '-0.8%' },
      { scenario: 'Fed rate +2%', impact: '-1.6%' },
      { scenario: 'US downgrade to AA+', impact: '-2.1%' },
    ],
    positionAnalysis: [
      { name: 'US Treasury 10Y 2035', score: 22, riskLevel: 'low', comment: 'Longer duration but highest credit quality' },
      { name: 'US Treasury 5Y 2030', score: 15, riskLevel: 'low', comment: 'Medium duration, zero credit risk' },
      { name: 'US Treasury 2Y 2027', score: 8, riskLevel: 'low', comment: 'Near-cash equivalent, minimal risk' },
    ],
  },
];

const DEMO_SCORE_HISTORY: Record<string, { date: string; score: number }[]> = {
  'vault-1': [{ date: '2025-11', score: 38 }, { date: '2025-12', score: 40 }, { date: '2026-01', score: 44 }, { date: '2026-02', score: 42 }],
  'vault-2': [{ date: '2025-09', score: 15 }, { date: '2025-10', score: 16 }, { date: '2025-11', score: 19 }, { date: '2025-12', score: 17 }, { date: '2026-01', score: 18 }, { date: '2026-02', score: 18 }],
  'vault-3': [{ date: '2025-12', score: 58 }, { date: '2026-01', score: 63 }, { date: '2026-02', score: 67 }],
};

const DEMO_WALLETS = [
  { address: '0x1234...5678', role: 'admin', label: 'Platform Admin', addedAt: '2025-09-01', kycStatus: 'verified' },
  { address: '0xabcd...ef01', role: 'issuer', label: 'BNP Paribas AM', addedAt: '2025-09-15', kycStatus: 'verified' },
  { address: '0x2345...6789', role: 'issuer', label: 'Goldman Sachs', addedAt: '2025-10-01', kycStatus: 'verified' },
  { address: '0x5e6f...7g8h', role: 'investor', label: 'BlackRock', addedAt: '2025-10-15', kycStatus: 'verified' },
  { address: '0xef56...gh78', role: 'investor', label: 'JP Morgan', addedAt: '2025-11-01', kycStatus: 'verified' },
  { address: '0x9i0j...1k2l', role: 'auditor', label: 'Deloitte', addedAt: '2025-11-15', kycStatus: 'verified' },
  { address: '0xnew1...pend', role: 'investor', label: 'Fidelity', addedAt: '2026-02-18', kycStatus: 'pending' },
];

// ─── Helpers ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, string> = { 0: 'active', 1: 'attention', 2: 'matured' };

const VAULT_NAME_MAP: Record<string, string> = {
  'vault-1': 'Fixed Income EU',
  'vault-2': 'US Treasury Pool',
  'vault-3': 'EM Corporate',
};

/** Transform backend AIReport → frontend AIReport shape */
function normalizeAIReport(report: AIReport) {
  return {
    id: report.reportId,
    vaultId: report.vaultId,
    vaultName: VAULT_NAME_MAP[report.vaultId] || report.vaultId,
    date: report.createdAt.slice(0, 10),
    score: report.riskScore,
    riskLevel: report.riskLevel,
    summary: report.summary,
    recommendations: report.recommendations.map((r) => ({
      id: r.id,
      action: r.action,
      detail: r.description,
      impact: r.impact,
      status: r.status === 'pending_approval' ? 'pending' : r.status,
    })),
    stressTests: report.stressTests,
    positionAnalysis: report.positionAnalysis.map((p) => ({
      name: p.name,
      score: p.score,
      riskLevel: p.riskLevel,
      comment: p.comment,
    })),
    // 0G Compute metadata
    provider: report.provider,
    model: report.model,
    verifiable: report.verifiable,
    durationMs: report.durationMs,
  };
}

// ─── In-memory cache (TTL-based) ─────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// ─── On-chain fetch functions (parallelized) ─────────────────────────

async function fetchAllTokens() {
  const cached = getCached<any[]>('tokens');
  if (cached) return cached;

  const factory = getContract('TokenFactory', ADDRESSES.tokenFactory);
  const addrs: string[] = await factory.getAllTokens();
  const tokens = await Promise.all(
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
  setCache('tokens', tokens);
  return tokens;
}

async function fetchAllVaults() {
  const cached = getCached<any[]>('vaults');
  if (cached) return cached;

  const vm = getContract('VaultManager', ADDRESSES.vaultManager);
  const nextId = Number(await vm.nextVaultId());

  // Fetch all vaults in parallel instead of sequential for loop
  const vaultPromises = Array.from({ length: nextId }, (_, i) =>
    (async () => {
      try {
        const [[owner, status, createdAt], tokenAddrs] = await Promise.all([
          vm.getVaultInfo(i),
          vm.getVaultTokens(i) as Promise<string[]>,
        ]);

        let totalValue = 0;
        const assets = await Promise.all(
          tokenAddrs.map(async (addr, idx) => {
            try {
              const token = getContract('RWAToken', addr);
              const [balance, name, [, rate, maturity]] = await Promise.all([
                vm.getVaultBalance(i, addr),
                token.name(),
                token.getMetadata(),
              ]);
              const balNum = Number(ethers.formatUnits(balance, 18));
              totalValue += balNum;
              return {
                id: `asset-${i}-${idx}`,
                name,
                type: 'corporate-bond' as const,
                allocation: 0,
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
        if (totalValue > 0) {
          for (const a of validAssets) {
            a.allocation = Math.round((a.value / totalValue) * 100);
          }
        }

        const meta = vaultMetaStore.get(i);
        const riskMap: Record<string, { score: number; level: string }> = {
          low: { score: 18, level: 'low' },
          moderate: { score: 42, level: 'moderate' },
          high: { score: 67, level: 'high' },
        };
        const risk = meta?.riskTolerance ? riskMap[meta.riskTolerance] : null;

        return {
          id: `vault-${i}`,
          onChainId: i,
          name: meta?.name || `Vault #${i}`,
          totalValue: totalValue || meta?.initialDeposit || 0,
          riskScore: risk?.score ?? null,
          riskLevel: risk?.level ?? null,
          status: STATUS_MAP[Number(status)] || 'active',
          assetCount: validAssets.length,
          yieldYTD: null,
          createdAt: createdAt > 0 ? new Date(Number(createdAt) * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          assets: validAssets,
          owner,
        };
      } catch {
        return null;
      }
    })(),
  );

  const results = await Promise.all(vaultPromises);
  const vaults = results.filter(Boolean) as NonNullable<(typeof results)[number]>[];
  setCache('vaults', vaults);
  return vaults;
}

// PaymentStatus enum from CouponScheduler.sol
const PAYMENT_STATUS: Record<number, string> = {
  0: 'scheduled', // Pending
  1: 'scheduled', // Scheduled (on Hedera Schedule Service)
  2: 'completed', // Executed
  3: 'failed',    // Failed
  4: 'suspended', // Suspended
};

const FREQUENCY_LABEL: Record<number, string> = {
  0: 'Monthly',
  1: 'Quarterly',
  2: 'Semi-Annual',
  3: 'Annual',
};

async function fetchAllPayments() {
  const cached = getCached<any[]>('payments');
  if (cached) return cached;

  try {
    const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler);
    const count = Number(await scheduler.bondCount());
    const now = Math.floor(Date.now() / 1000);
    const hederaProvider = getHederaProvider();

    // Fetch all bonds in parallel
    const bondPromises = Array.from({ length: count }, (_, i) =>
      (async () => {
        try {
          const [bond, dates, couponAmount] = await Promise.all([
            scheduler.getBond(i),
            scheduler.getPaymentDates(i) as Promise<bigint[]>,
            scheduler.getCouponAmount(i),
          ]);

          // Resolve token name + decimals in parallel
          let tokenName = `Bond #${i}`;
          let decimals = 6;
          const tokenAddr = bond.token;
          const ptAddr = bond.paymentToken;

          await Promise.all([
            (async () => {
              try {
                if (tokenAddr && tokenAddr !== ethers.ZeroAddress) {
                  const token = new ethers.Contract(tokenAddr, ABIS.RWAToken, hederaProvider);
                  tokenName = await token.name();
                }
              } catch { /* keep default */ }
            })(),
            (async () => {
              try {
                if (ptAddr && ptAddr !== ethers.ZeroAddress) {
                  const pt = new ethers.Contract(ptAddr, ['function decimals() view returns (uint8)'], hederaProvider);
                  decimals = Number(await pt.decimals());
                }
              } catch { /* default 6 */ }
            })(),
          ]);

          const rate = Number(bond.rate);
          const freq = Number(bond.frequency);
          const freqLabel = FREQUENCY_LABEL[freq] || 'Quarterly';

          // Build payments — use time-based status (skip per-date getPayment calls for speed)
          return dates.map((date) => {
            const ts = Number(date);
            return {
              id: `hedera-pay-${i}-${ts}`,
              assetName: tokenName,
              amount: Number(ethers.formatUnits(couponAmount, decimals)),
              date: new Date(ts * 1000).toISOString().slice(0, 10),
              daysUntil: Math.max(0, Math.ceil((ts - now) / 86400)),
              vaultId: `bond-${i}`,
              vaultName: `${tokenName} (${freqLabel}, ${rate / 100}%)`,
              status: ts <= now ? 'completed' : 'scheduled',
              recipients: 1,
            };
          });
        } catch {
          return [];
        }
      })(),
    );

    const nested = await Promise.all(bondPromises);
    const payments = nested.flat();
    setCache('payments', payments);
    return payments;
  } catch {
    return [];
  }
}

/**
 * Generate coupon payment schedules from real on-chain vault assets.
 * For each token deposited in a vault, generates semi-annual payments
 * from today until maturity based on the token's coupon rate and balance.
 */
async function generatePaymentsFromVaults() {
  const vaults = await fetchAllVaults();
  const payments: any[] = [];
  const now = Math.floor(Date.now() / 1000);
  const SIX_MONTHS = 182 * 86400;

  for (const vault of vaults) {
    for (const asset of vault.assets) {
      const rate = asset.couponRate || 0;
      const value = asset.value || 0;
      if (rate === 0 || value === 0) continue;

      // Semi-annual coupon = (rate% / 2) * notional value
      const couponAmount = Math.round((rate / 100 / 2) * value);
      if (couponAmount === 0) continue;

      // Parse maturity
      const maturityStr = asset.maturityDate;
      const maturityTs = maturityStr && maturityStr !== 'N/A'
        ? Math.floor(new Date(maturityStr).getTime() / 1000)
        : now + 3 * 365 * 86400; // default 3 years out

      // Generate payment dates: semi-annual from vault creation until maturity
      const createdTs = Math.floor(new Date(vault.createdAt).getTime() / 1000);
      let payDate = createdTs + SIX_MONTHS;

      while (payDate <= maturityTs) {
        const dateStr = new Date(payDate * 1000).toISOString().slice(0, 10);
        const daysUntil = Math.max(0, Math.ceil((payDate - now) / 86400));
        const status = payDate <= now ? 'completed' : 'scheduled';

        payments.push({
          id: `pay-${vault.id}-${asset.id}-${payDate}`,
          assetName: asset.name,
          amount: couponAmount,
          date: dateStr,
          daysUntil,
          vaultId: vault.id,
          vaultName: vault.name,
          status,
          recipients: 1,
        });

        payDate += SIX_MONTHS;
      }
    }
  }

  return payments.sort((a, b) => a.date.localeCompare(b.date));
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
    if (payments.length === 0) {
      try { payments = await generatePaymentsFromVaults(); } catch { /* empty */ }
    }

    // Fall back to demo data when on-chain is empty
    if (vaults.length === 0) vaults = DEMO_VAULTS;
    if (payments.length === 0) payments = DEMO_PAYMENTS;

    // Normalize AI reports
    const rawReports = listReports();
    const aiReports = rawReports.length > 0
      ? rawReports.map(normalizeAIReport)
      : DEMO_AI_REPORTS;
    const latestReport = aiReports[aiReports.length - 1];

    const totalValue = vaults.reduce((s: number, v: any) => s + v.totalValue, 0);
    const avgYield = vaults.length > 0
      ? vaults.reduce((s: number, v: any) => s + (v.yieldYTD || 0), 0) / vaults.length
      : 0;
    const yieldYTD = Math.round(avgYield * 10) / 10;
    const upcomingPayments = payments.filter((p: any) => p.status === 'scheduled');
    const tokenCount = tokens.length > 0
      ? tokens.length
      : vaults.reduce((s: number, v: any) => s + (v.assetCount || 0), 0);

    res.json({
      stats: {
        totalValue,
        yieldYTD,
        activeVaults: vaults.filter((v: any) => v.status === 'active').length,
        tokenizedAssets: tokenCount,
        upcomingPayments: upcomingPayments.length,
      },
      vaults,
      upcomingPayments: upcomingPayments.slice(0, 5),
      latestAIAnalysis: latestReport
        ? {
            vaultName: latestReport.vaultName,
            score: latestReport.score,
            riskLevel: latestReport.riskLevel,
            recommendations: latestReport.recommendations.length,
            date: latestReport.date,
          }
        : null,
    });
  } catch (err: any) {
    // Ultimate fallback — return demo data even on crash
    const upcomingDemo = DEMO_PAYMENTS.filter((p) => p.status === 'scheduled');
    const latestDemo = DEMO_AI_REPORTS[0];
    res.json({
      stats: {
        totalValue: DEMO_VAULTS.reduce((s, v) => s + v.totalValue, 0),
        yieldYTD: 4.2,
        activeVaults: DEMO_VAULTS.filter((v) => v.status === 'active').length,
        tokenizedAssets: DEMO_VAULTS.reduce((s, v) => s + v.assetCount, 0),
        upcomingPayments: upcomingDemo.length,
      },
      vaults: DEMO_VAULTS,
      upcomingPayments: upcomingDemo.slice(0, 5),
      latestAIAnalysis: {
        vaultName: latestDemo.vaultName,
        score: latestDemo.score,
        riskLevel: latestDemo.riskLevel,
        recommendations: latestDemo.recommendations.length,
        date: latestDemo.date,
      },
    });
  }
});

// ─── GET /v1/vaults ──────────────────────────────────────────────────

router.get('/vaults', async (_req: Request, res: Response) => {
  try {
    const vaults = await fetchAllVaults();
    res.json(vaults.length > 0 ? vaults : DEMO_VAULTS);
  } catch {
    res.json(DEMO_VAULTS);
  }
});

// ─── GET /v1/vaults/:id ─────────────────────────────────────────────

router.get('/vaults/:id', async (req: Request, res: Response) => {
  try {
    const vaults = await fetchAllVaults();
    const vault = vaults.find((v) => v.id === req.params.id);
    if (vault) { res.json(vault); return; }
  } catch { /* fall through */ }

  // Check demo vaults as fallback
  const demoVault = DEMO_VAULTS.find((v) => v.id === req.params.id);
  if (demoVault) { res.json(demoVault); return; }

  res.status(404).json({ error: 'Vault not found' });
});

// ─── POST /v1/vaults/meta — persist vault metadata (name, strategy…) ─

router.post('/vaults/meta', (req: Request, res: Response) => {
  try {
    const { onChainId, name, strategy, assetClass, initialDeposit, riskTolerance, investmentHorizon, description } = req.body ?? {};
    if (onChainId == null || !name) {
      res.status(400).json({ error: 'onChainId and name are required' });
      return;
    }
    const meta: VaultMeta = {
      onChainId: Number(onChainId),
      name,
      strategy,
      assetClass,
      initialDeposit: initialDeposit ? Number(initialDeposit) : undefined,
      riskTolerance,
      investmentHorizon,
      description,
    };
    vaultMetaStore.set(meta.onChainId, meta);
    saveVaultMeta();
    cache.delete('vaults'); // invalidate vault cache
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
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
    // 1. Try Hedera CouponScheduler
    let payments = await fetchAllPayments();

    // 2. Generate from real on-chain vault assets
    if (payments.length === 0) {
      try { payments = await generatePaymentsFromVaults(); } catch { /* fall through */ }
    }

    // 3. Demo fallback
    if (payments.length === 0) payments = DEMO_PAYMENTS;

    const { vaultId } = req.query;
    if (vaultId) {
      payments = payments.filter((p: any) => p.vaultId === vaultId);
    }
    res.json(payments);
  } catch {
    res.json(DEMO_PAYMENTS);
  }
});

// ─── GET /v1/ai/reports ──────────────────────────────────────────────

router.get('/ai/reports', (req: Request, res: Response) => {
  try {
    const { vaultId } = req.query;
    const rawReports = listReports(vaultId as string | undefined);

    if (rawReports.length > 0) {
      res.json(rawReports.map(normalizeAIReport));
      return;
    }

    // Fall back to demo
    const demoReports = vaultId
      ? DEMO_AI_REPORTS.filter((r) => r.vaultId === vaultId)
      : DEMO_AI_REPORTS;
    res.json(demoReports);
  } catch {
    res.json(DEMO_AI_REPORTS);
  }
});

// ─── GET /v1/ai/reports/:id ─────────────────────────────────────────

router.get('/ai/reports/:id', (req: Request, res: Response) => {
  // Try real reports first
  const report = getReport(req.params.id as string);
  if (report) {
    res.json(normalizeAIReport(report));
    return;
  }

  // Fall back to demo
  const demoReport = DEMO_AI_REPORTS.find((r) => r.id === req.params.id);
  if (demoReport) { res.json(demoReport); return; }

  res.status(404).json({ error: 'Report not found' });
});

// ─── GET /v1/ai/score-history ────────────────────────────────────────

router.get('/ai/score-history', (req: Request, res: Response) => {
  try {
    const { vaultId } = req.query;
    const rawReports = listReports(vaultId as string | undefined);

    if (rawReports.length > 0) {
      // Derive score history from real reports: group by YYYY-MM + latest score
      const byMonth = new Map<string, number>();
      for (const r of rawReports) {
        const month = r.createdAt.slice(0, 7); // YYYY-MM
        byMonth.set(month, r.riskScore);
      }
      const history = Array.from(byMonth.entries())
        .map(([date, score]) => ({ date, score }))
        .sort((a, b) => a.date.localeCompare(b.date));
      res.json(history);
      return;
    }

    // Fall back to demo
    if (vaultId && DEMO_SCORE_HISTORY[vaultId as string]) {
      res.json(DEMO_SCORE_HISTORY[vaultId as string]);
    } else {
      const all = Object.values(DEMO_SCORE_HISTORY).flat().sort((a, b) => a.date.localeCompare(b.date));
      res.json(all);
    }
  } catch {
    const all = Object.values(DEMO_SCORE_HISTORY).flat().sort((a, b) => a.date.localeCompare(b.date));
    res.json(all);
  }
});

// ─── Canton Data Room — party & trade persistence ────────────────────

interface CantonParty {
  id: string;
  name: string;
  role: 'owner' | 'counterparty' | 'auditor';
  publicKey: string;
  joinedAt: string;
}

interface CantonTrade {
  id: string;
  from: string;
  to: string;
  assetName: string;
  amount: number;
  price: number;
  status: string;
  createdAt: string;
  message?: string;
}

interface CantonVaultOverlay {
  vaultId: string;
  parties: CantonParty[];
  trades: CantonTrade[];
}

const CANTON_OVERLAY_FILE = resolve(VAULT_META_DIR, 'canton-overlay.json');

function loadCantonOverlays(): Map<string, CantonVaultOverlay> {
  try {
    if (existsSync(CANTON_OVERLAY_FILE)) {
      const data = JSON.parse(readFileSync(CANTON_OVERLAY_FILE, 'utf-8')) as CantonVaultOverlay[];
      return new Map(data.map((o) => [o.vaultId, o]));
    }
  } catch { /* start fresh */ }
  return new Map();
}

function saveCantonOverlays(): void {
  try {
    if (!existsSync(VAULT_META_DIR)) mkdirSync(VAULT_META_DIR, { recursive: true });
    writeFileSync(CANTON_OVERLAY_FILE, JSON.stringify(Array.from(cantonOverlays.values()), null, 2));
  } catch { /* non-critical */ }
}

const cantonOverlays = loadCantonOverlays();

// ─── GET /v1/canton/vaults ───────────────────────────────────────────

router.get('/canton/vaults', async (_req: Request, res: Response) => {
  // Try Canton first
  try {
    const result = await cantonClient.query('ConfidentialVault', 'admin');
    if (Array.isArray(result) && result.length > 0) {
      res.json(result);
      return;
    }
  } catch { /* fall through */ }

  // Build from real on-chain ADI vaults
  try {
    const vaults = await fetchAllVaults();
    if (vaults.length > 0) {
      const confidentialVaults = vaults.map((v) => {
        const overlay = cantonOverlays.get(v.id);
        const ownerShort = typeof v.owner === 'string'
          ? `${v.owner.slice(0, 6)}...${v.owner.slice(-4)}`
          : 'Unknown';

        // Default owner party if no overlay exists
        const defaultParties: CantonParty[] = [{
          id: `party-${v.id}-owner`,
          name: ownerShort,
          role: 'owner',
          publicKey: typeof v.owner === 'string' ? v.owner : '0x0',
          joinedAt: v.createdAt,
        }];

        return {
          id: v.id,
          name: `${v.name} — Data Room`,
          owner: ownerShort,
          parties: overlay?.parties ?? defaultParties,
          trades: overlay?.trades ?? [],
          assets: v.assets,
          assetCount: v.assetCount,
          totalValue: v.totalValue,
          createdAt: v.createdAt,
        };
      });
      res.json(confidentialVaults);
      return;
    }
  } catch { /* fall through */ }

  res.json(DEMO_CONFIDENTIAL_VAULTS);
});

// ─── POST /v1/canton/vaults/:vaultId/parties — add party to overlay ──

router.post('/canton/vaults/:vaultId/parties', (req: Request, res: Response) => {
  const vaultId = req.params.vaultId as string;
  const { name, role, publicKey } = req.body ?? {};
  if (!name || !role || !publicKey) {
    res.status(400).json({ error: 'name, role, and publicKey are required' });
    return;
  }

  if (!cantonOverlays.has(vaultId)) {
    cantonOverlays.set(vaultId, { vaultId, parties: [], trades: [] });
  }
  const overlay = cantonOverlays.get(vaultId)!;

  const party: CantonParty = {
    id: `party-${Date.now()}`,
    name,
    role,
    publicKey,
    joinedAt: new Date().toISOString().slice(0, 10),
  };
  overlay.parties.push(party);
  saveCantonOverlays();
  res.json(party);
});

// ─── POST /v1/canton/vaults/:vaultId/trades — add trade to overlay ───

router.post('/canton/vaults/:vaultId/trades', (req: Request, res: Response) => {
  const vaultId = req.params.vaultId as string;
  const { from, to, assetName, amount, price, message } = req.body ?? {};
  if (!from || !to || !assetName || !amount || !price) {
    res.status(400).json({ error: 'from, to, assetName, amount, and price are required' });
    return;
  }

  if (!cantonOverlays.has(vaultId)) {
    cantonOverlays.set(vaultId, { vaultId, parties: [], trades: [] });
  }
  const overlay = cantonOverlays.get(vaultId)!;

  const trade: CantonTrade = {
    id: `trade-${Date.now()}`,
    from,
    to,
    assetName,
    amount: Number(amount),
    price: Number(price),
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10),
    message,
  };
  overlay.trades.push(trade);
  saveCantonOverlays();
  res.json(trade);
});

// ─── POST /v1/canton/trades/:tradeId/status — update trade status ────

router.post('/canton/trades/:tradeId/status', (req: Request, res: Response) => {
  const { tradeId } = req.params;
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: 'status is required' }); return; }

  for (const overlay of cantonOverlays.values()) {
    const trade = overlay.trades.find((t) => t.id === tradeId);
    if (trade) {
      trade.status = status;
      saveCantonOverlays();
      res.json(trade);
      return;
    }
  }
  res.status(404).json({ error: 'Trade not found' });
});

// ─── Wallet registry (persistent JSON) ───────────────────────────────

interface WalletEntry {
  address: string;
  label: string;
  role: string;
  addedAt: string;
  kycStatus: 'pending' | 'verified';
}

const WALLET_REGISTRY_FILE = resolve(VAULT_META_DIR, 'wallet-registry.json');

function loadWalletRegistry(): WalletEntry[] {
  try {
    if (existsSync(WALLET_REGISTRY_FILE)) {
      return JSON.parse(readFileSync(WALLET_REGISTRY_FILE, 'utf-8')) as WalletEntry[];
    }
  } catch { /* start fresh */ }
  return [];
}

function saveWalletRegistry(): void {
  try {
    if (!existsSync(VAULT_META_DIR)) mkdirSync(VAULT_META_DIR, { recursive: true });
    writeFileSync(WALLET_REGISTRY_FILE, JSON.stringify(walletRegistry, null, 2));
  } catch { /* non-critical */ }
}

const walletRegistry = loadWalletRegistry();

// ─── GET /v1/admin/wallets ───────────────────────────────────────────

router.get('/admin/wallets', async (_req: Request, res: Response) => {
  // Enrich registry with on-chain whitelist status
  if (walletRegistry.length > 0) {
    try {
      const ac = getContract('AccessControl', ADDRESSES.accessControl);
      await Promise.all(walletRegistry.map(async (w) => {
        try {
          const isWL = await ac.isWhitelisted(w.address);
          if (isWL && w.kycStatus === 'pending') {
            w.kycStatus = 'verified';
          }
        } catch { /* skip */ }
      }));
    } catch { /* skip enrichment */ }
    res.json(walletRegistry);
    return;
  }
  res.json([]);
});

// ─── POST /v1/admin/wallets — add wallet to registry ─────────────────

router.post('/admin/wallets', (req: Request, res: Response) => {
  const { address, label, role, kycStatus } = req.body ?? {};
  if (!address) { res.status(400).json({ error: 'address is required' }); return; }

  const existing = walletRegistry.find((w) => w.address.toLowerCase() === address.toLowerCase());
  if (existing) {
    // Update existing
    if (label) existing.label = label;
    if (role) existing.role = role;
    if (kycStatus) existing.kycStatus = kycStatus;
    saveWalletRegistry();
    res.json(existing);
    return;
  }

  const entry: WalletEntry = {
    address,
    label: label || `Wallet ${walletRegistry.length + 1}`,
    role: role || 'investor',
    addedAt: new Date().toISOString().slice(0, 10),
    kycStatus: kycStatus || 'pending',
  };
  walletRegistry.push(entry);
  saveWalletRegistry();
  res.json(entry);
});

// ─── POST /v1/admin/wallets/:address/verify — mark as verified ───────

router.post('/admin/wallets/:address/verify', (req: Request, res: Response) => {
  const addr = req.params.address as string;
  const wallet = walletRegistry.find((w) => w.address.toLowerCase() === addr.toLowerCase());
  if (!wallet) { res.status(404).json({ error: 'Wallet not found' }); return; }
  wallet.kycStatus = 'verified';
  saveWalletRegistry();
  res.json(wallet);
});

export default router;

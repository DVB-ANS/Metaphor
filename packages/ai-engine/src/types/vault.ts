import { z } from 'zod';

// --- Asset Position (from ADI RWAToken on-chain metadata) ---

export const AssetPositionSchema = z.object({
  tokenAddress: z.string(),
  name: z.string(),
  symbol: z.string(),
  isin: z.string(),
  rate: z.number().int().min(0), // basis points (500 = 5%)
  maturity: z.number().int(), // unix timestamp
  issuer: z.string(),
  balance: z.number().min(0), // tokens held in vault
  totalSupply: z.number().min(0),
  allocationPct: z.number().min(0).max(100), // % of vault value
});

export type AssetPosition = z.infer<typeof AssetPositionSchema>;

// --- Yield Snapshot (from Hedera YieldDistributor) ---

export const YieldSnapshotSchema = z.object({
  snapshotId: z.number().int(),
  token: z.string(),
  paymentToken: z.string(),
  totalYield: z.number().min(0),
  totalSupply: z.number().min(0),
  timestamp: z.number().int(),
  holderCount: z.number().int().min(0),
});

export type YieldSnapshot = z.infer<typeof YieldSnapshotSchema>;

// --- Vault Data (aggregated input for AI analysis) ---

export const VaultStatusSchema = z.enum(['Active', 'Paused', 'Closed']);

export type VaultStatus = z.infer<typeof VaultStatusSchema>;

export const VaultDataSchema = z.object({
  vaultId: z.string(),
  vaultName: z.string(),
  owner: z.string(),
  status: VaultStatusSchema,
  totalValue: z.number().min(0), // USD
  assets: z.array(AssetPositionSchema).min(1),
  yieldHistory: z.array(YieldSnapshotSchema).optional(),
  createdAt: z.number().int().optional(),
});

export type VaultData = z.infer<typeof VaultDataSchema>;

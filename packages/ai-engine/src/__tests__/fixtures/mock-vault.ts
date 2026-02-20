import { type VaultData } from '../../types/vault';

/** Realistic multi-asset vault for testing */
export const MOCK_VAULT: VaultData = {
  vaultId: 'vault-001',
  vaultName: 'Fixed Income Europe Q1',
  owner: '0x1234567890abcdef1234567890abcdef12345678',
  status: 'Active',
  totalValue: 10_000_000,
  createdAt: Math.floor(Date.now() / 1000) - 90 * 86400, // 90 days ago
  assets: [
    {
      tokenAddress: '0xAAA0000000000000000000000000000000000001',
      name: 'French Sovereign Bond 2028',
      symbol: 'GOV-FR-2028',
      isin: 'FR0014001NN8',
      rate: 210, // 2.10%
      maturity: Math.floor(Date.now() / 1000) + 2 * 365 * 86400, // 2 years
      issuer: '0xISSUER_FRANCE',
      balance: 4_000_000,
      totalSupply: 50_000_000,
      allocationPct: 40,
    },
    {
      tokenAddress: '0xAAA0000000000000000000000000000000000002',
      name: 'German Corporate Bond 2027',
      symbol: 'CORP-DE-2027',
      isin: 'DE000A1EWWW0',
      rate: 430, // 4.30%
      maturity: Math.floor(Date.now() / 1000) + 1.5 * 365 * 86400, // 1.5 years
      issuer: '0xISSUER_GERMANY',
      balance: 3_500_000,
      totalSupply: 20_000_000,
      allocationPct: 35,
    },
    {
      tokenAddress: '0xAAA0000000000000000000000000000000000003',
      name: 'Italian Invoice Factoring 2026',
      symbol: 'INV-IT-2026',
      isin: 'IT0005422891',
      rate: 780, // 7.80%
      maturity: Math.floor(Date.now() / 1000) + 0.5 * 365 * 86400, // 6 months
      issuer: '0xISSUER_ITALY',
      balance: 2_500_000,
      totalSupply: 10_000_000,
      allocationPct: 25,
    },
  ],
  yieldHistory: [
    {
      snapshotId: 0,
      token: '0xAAA0000000000000000000000000000000000001',
      paymentToken: '0xUSDC',
      totalYield: 42_000,
      totalSupply: 50_000_000,
      timestamp: Math.floor(Date.now() / 1000) - 30 * 86400,
      holderCount: 15,
    },
  ],
};

/** Single-asset vault (concentration risk) */
export const CONCENTRATED_VAULT: VaultData = {
  vaultId: 'vault-002',
  vaultName: 'High Yield Single Position',
  owner: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
  status: 'Active',
  totalValue: 2_000_000,
  assets: [
    {
      tokenAddress: '0xBBB0000000000000000000000000000000000001',
      name: 'Emerging Market Bond 2029',
      symbol: 'EM-2029',
      isin: 'XS1234567890',
      rate: 950, // 9.50%
      maturity: Math.floor(Date.now() / 1000) + 3 * 365 * 86400,
      issuer: '0xISSUER_EM',
      balance: 2_000_000,
      totalSupply: 5_000_000,
      allocationPct: 100,
    },
  ],
};

/** Low-risk diversified vault */
export const SAFE_VAULT: VaultData = {
  vaultId: 'vault-003',
  vaultName: 'Treasury Conservative',
  owner: '0x9999999999999999999999999999999999999999',
  status: 'Active',
  totalValue: 50_000_000,
  assets: [
    {
      tokenAddress: '0xCCC0000000000000000000000000000000000001',
      name: 'US Treasury 2026',
      symbol: 'UST-2026',
      isin: 'US912828Z999',
      rate: 180, // 1.80%
      maturity: Math.floor(Date.now() / 1000) + 0.5 * 365 * 86400,
      issuer: '0xISSUER_US',
      balance: 25_000_000,
      totalSupply: 100_000_000,
      allocationPct: 50,
    },
    {
      tokenAddress: '0xCCC0000000000000000000000000000000000002',
      name: 'German Bund 2027',
      symbol: 'BUND-2027',
      isin: 'DE0001102481',
      rate: 150, // 1.50%
      maturity: Math.floor(Date.now() / 1000) + 1 * 365 * 86400,
      issuer: '0xISSUER_BUND',
      balance: 25_000_000,
      totalSupply: 200_000_000,
      allocationPct: 50,
    },
  ],
};

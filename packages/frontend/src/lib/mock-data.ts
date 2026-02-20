export type VaultStatus = 'active' | 'attention' | 'matured';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface Vault {
  id: string;
  name: string;
  totalValue: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: VaultStatus;
  assetCount: number;
  yieldYTD: number;
}

export interface UpcomingPayment {
  id: string;
  assetName: string;
  amount: number;
  date: string;
  daysUntil: number;
  vaultName: string;
}

export interface AIAnalysis {
  vaultName: string;
  score: number;
  riskLevel: RiskLevel;
  recommendations: number;
  date: string;
}

export interface PortfolioStats {
  totalValue: number;
  yieldYTD: number;
  activeVaults: number;
  tokenizedAssets: number;
  upcomingPayments: number;
}

export const mockVaults: Vault[] = [
  {
    id: 'vault-1',
    name: 'Fixed Income EU',
    totalValue: 5_200_000,
    riskScore: 42,
    riskLevel: 'moderate',
    status: 'active',
    assetCount: 5,
    yieldYTD: 4.2,
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
  },
  {
    id: 'vault-3',
    name: 'EM Corporate',
    totalValue: 2_450_000,
    riskScore: 67,
    riskLevel: 'high',
    status: 'attention',
    assetCount: 4,
    yieldYTD: 7.8,
  },
];

export const mockUpcomingPayments: UpcomingPayment[] = [
  {
    id: 'pay-1',
    assetName: 'BondToken-ACME-2026',
    amount: 25_000,
    date: '2026-03-03',
    daysUntil: 12,
    vaultName: 'Fixed Income EU',
  },
  {
    id: 'pay-2',
    assetName: 'TreasuryBond-US-2027',
    amount: 18_500,
    date: '2026-03-15',
    daysUntil: 24,
    vaultName: 'US Treasury Pool',
  },
];

export const mockAIAnalysis: AIAnalysis = {
  vaultName: 'EM Corporate',
  score: 67,
  riskLevel: 'high',
  recommendations: 1,
  date: '2026-02-18',
};

export const mockPortfolioStats: PortfolioStats = {
  totalValue: 12_450_000,
  yieldYTD: 4.2,
  activeVaults: 3,
  tokenizedAssets: 12,
  upcomingPayments: 2,
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'text-green-500';
    case 'moderate':
      return 'text-yellow-500';
    case 'high':
      return 'text-red-500';
  }
}

export function getStatusBadgeVariant(
  status: VaultStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'attention':
      return 'destructive';
    case 'matured':
      return 'secondary';
  }
}

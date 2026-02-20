// ─── Base Types ───────────────────────────────────────────────

export type VaultStatus = 'active' | 'attention' | 'matured';
export type RiskLevel = 'low' | 'moderate' | 'high';
export type AssetType = 'corporate-bond' | 'sovereign-bond' | 'invoice' | 'real-estate';
export type Role = 'admin' | 'issuer' | 'investor' | 'auditor';
export type VisibilityLevel = 'owner' | 'counterparty' | 'auditor';
export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'countered';
export type PaymentStatus = 'scheduled' | 'completed' | 'failed';

// ─── Vault Types ──────────────────────────────────────────────

export interface VaultAsset {
  id: string;
  name: string;
  type: AssetType;
  allocation: number; // percentage
  value: number;
  rating: string;
  couponRate: number;
  maturityDate: string;
  jurisdiction: string;
}

export interface Vault {
  id: string;
  name: string;
  totalValue: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: VaultStatus;
  assetCount: number;
  yieldYTD: number;
  createdAt: string;
  assets: VaultAsset[];
}

// ─── Payment Types ────────────────────────────────────────────

export interface Payment {
  id: string;
  assetName: string;
  amount: number;
  date: string;
  daysUntil: number;
  vaultId: string;
  vaultName: string;
  status: PaymentStatus;
  recipients?: number;
}

// ─── AI Types ─────────────────────────────────────────────────

export interface AIRecommendation {
  id: string;
  action: string;
  detail: string;
  impact: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AIReport {
  id: string;
  vaultId: string;
  vaultName: string;
  date: string;
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  recommendations: AIRecommendation[];
  stressTests: { scenario: string; impact: string }[];
  positionAnalysis: { name: string; score: number; riskLevel: RiskLevel; comment: string }[];
}

export interface ScoreHistory {
  date: string;
  score: number;
}

// ─── Canton / Data Room Types ─────────────────────────────────

export interface Party {
  id: string;
  name: string;
  role: VisibilityLevel;
  publicKey: string;
  joinedAt: string;
}

export interface TradeProposal {
  id: string;
  from: string;
  to: string;
  assetName: string;
  amount: number;
  price: number;
  status: TradeStatus;
  createdAt: string;
  message?: string;
}

export interface ConfidentialVault {
  id: string;
  name: string;
  owner: string;
  parties: Party[];
  trades: TradeProposal[];
  assetCount: number;
  totalValue: number;
  createdAt: string;
}

// ─── Whitelist Types ──────────────────────────────────────────

export interface WhitelistedWallet {
  address: string;
  role: Role;
  label: string;
  addedAt: string;
  kycStatus: 'verified' | 'pending';
}

// ─── Portfolio Stats ──────────────────────────────────────────

export interface PortfolioStats {
  totalValue: number;
  yieldYTD: number;
  activeVaults: number;
  tokenizedAssets: number;
  upcomingPayments: number;
}

export interface AIAnalysis {
  vaultName: string;
  score: number;
  riskLevel: RiskLevel;
  recommendations: number;
  date: string;
}

// ─── Mock Data ────────────────────────────────────────────────

export const mockVaults: Vault[] = [
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
      {
        id: 'asset-1',
        name: 'France Sovereign OAT 2028',
        type: 'sovereign-bond',
        allocation: 40,
        value: 2_080_000,
        rating: 'AAA',
        couponRate: 2.1,
        maturityDate: '2028-06-15',
        jurisdiction: 'France',
      },
      {
        id: 'asset-2',
        name: 'Siemens AG Corporate 2027',
        type: 'corporate-bond',
        allocation: 35,
        value: 1_820_000,
        rating: 'A+',
        couponRate: 4.3,
        maturityDate: '2027-12-01',
        jurisdiction: 'Germany',
      },
      {
        id: 'asset-3',
        name: 'Milan Factoring Pool Q3',
        type: 'invoice',
        allocation: 25,
        value: 1_300_000,
        rating: 'BBB',
        couponRate: 7.8,
        maturityDate: '2026-09-30',
        jurisdiction: 'Italy',
      },
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
      {
        id: 'asset-4',
        name: 'US Treasury 10Y 2035',
        type: 'sovereign-bond',
        allocation: 50,
        value: 2_400_000,
        rating: 'AAA',
        couponRate: 3.5,
        maturityDate: '2035-01-15',
        jurisdiction: 'USA',
      },
      {
        id: 'asset-5',
        name: 'US Treasury 5Y 2030',
        type: 'sovereign-bond',
        allocation: 30,
        value: 1_440_000,
        rating: 'AAA',
        couponRate: 2.8,
        maturityDate: '2030-07-01',
        jurisdiction: 'USA',
      },
      {
        id: 'asset-6',
        name: 'US Treasury 2Y 2027',
        type: 'sovereign-bond',
        allocation: 20,
        value: 960_000,
        rating: 'AAA',
        couponRate: 2.2,
        maturityDate: '2027-11-15',
        jurisdiction: 'USA',
      },
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
      {
        id: 'asset-7',
        name: 'Petrobras 2028 USD',
        type: 'corporate-bond',
        allocation: 40,
        value: 980_000,
        rating: 'BB+',
        couponRate: 8.2,
        maturityDate: '2028-03-15',
        jurisdiction: 'Brazil',
      },
      {
        id: 'asset-8',
        name: 'Tata Motors 2027',
        type: 'corporate-bond',
        allocation: 35,
        value: 857_500,
        rating: 'BBB-',
        couponRate: 6.5,
        maturityDate: '2027-09-01',
        jurisdiction: 'India',
      },
      {
        id: 'asset-9',
        name: 'Eskom Holdings 2029',
        type: 'corporate-bond',
        allocation: 25,
        value: 612_500,
        rating: 'B',
        couponRate: 11.2,
        maturityDate: '2029-06-15',
        jurisdiction: 'South Africa',
      },
    ],
  },
];

export const mockPayments: Payment[] = [
  // Upcoming
  {
    id: 'pay-1',
    assetName: 'BondToken-ACME-2026',
    amount: 25_000,
    date: '2026-03-03',
    daysUntil: 12,
    vaultId: 'vault-1',
    vaultName: 'Fixed Income EU',
    status: 'scheduled',
    recipients: 15,
  },
  {
    id: 'pay-2',
    assetName: 'TreasuryBond-US-2027',
    amount: 18_500,
    date: '2026-03-15',
    daysUntil: 24,
    vaultId: 'vault-2',
    vaultName: 'US Treasury Pool',
    status: 'scheduled',
    recipients: 8,
  },
  {
    id: 'pay-3',
    assetName: 'Siemens AG Corporate 2027',
    amount: 39_130,
    date: '2026-06-01',
    daysUntil: 102,
    vaultId: 'vault-1',
    vaultName: 'Fixed Income EU',
    status: 'scheduled',
    recipients: 15,
  },
  {
    id: 'pay-4',
    assetName: 'Petrobras 2028 USD',
    amount: 40_180,
    date: '2026-09-15',
    daysUntil: 208,
    vaultId: 'vault-3',
    vaultName: 'EM Corporate',
    status: 'scheduled',
    recipients: 4,
  },
  // Past
  {
    id: 'pay-past-1',
    assetName: 'BondToken-ACME-2026',
    amount: 25_000,
    date: '2025-08-15',
    daysUntil: 0,
    vaultId: 'vault-1',
    vaultName: 'Fixed Income EU',
    status: 'completed',
    recipients: 15,
  },
  {
    id: 'pay-past-2',
    assetName: 'TreasuryBond-US-2027',
    amount: 18_500,
    date: '2025-09-15',
    daysUntil: 0,
    vaultId: 'vault-2',
    vaultName: 'US Treasury Pool',
    status: 'completed',
    recipients: 8,
  },
  {
    id: 'pay-past-3',
    assetName: 'US Treasury 10Y 2035',
    amount: 42_000,
    date: '2025-07-15',
    daysUntil: 0,
    vaultId: 'vault-2',
    vaultName: 'US Treasury Pool',
    status: 'completed',
    recipients: 8,
  },
  {
    id: 'pay-past-4',
    assetName: 'Petrobras 2028 USD',
    amount: 40_180,
    date: '2025-09-15',
    daysUntil: 0,
    vaultId: 'vault-3',
    vaultName: 'EM Corporate',
    status: 'completed',
    recipients: 4,
  },
  {
    id: 'pay-past-5',
    assetName: 'France Sovereign OAT 2028',
    amount: 21_840,
    date: '2025-12-15',
    daysUntil: 0,
    vaultId: 'vault-1',
    vaultName: 'Fixed Income EU',
    status: 'completed',
    recipients: 15,
  },
];

export const mockAIReports: AIReport[] = [
  {
    id: 'report-1',
    vaultId: 'vault-3',
    vaultName: 'EM Corporate',
    date: '2026-02-18',
    score: 67,
    riskLevel: 'high',
    summary:
      'High geographic and credit concentration risk. EM exposure with sub-investment-grade names requires active monitoring.',
    recommendations: [
      {
        id: 'rec-1',
        action: 'Reduce Eskom exposure',
        detail: 'Eskom Holdings rated B with negative outlook. Reduce from 25% to 10%.',
        impact: 'Risk score improvement: 67 → 52',
        status: 'pending',
      },
      {
        id: 'rec-2',
        action: 'Add investment-grade hedge',
        detail: 'Allocate 15% to IG corporate bonds to offset EM credit risk.',
        impact: 'Portfolio Sharpe ratio improvement: +0.3',
        status: 'pending',
      },
    ],
    stressTests: [
      { scenario: 'USD +10% vs EM currencies', impact: '-8.4%' },
      { scenario: 'EM sovereign crisis', impact: '-22.1%' },
      { scenario: 'Global rate +2%', impact: '-5.7%' },
    ],
    positionAnalysis: [
      {
        name: 'Petrobras 2028 USD',
        score: 55,
        riskLevel: 'moderate',
        comment: 'Oil price dependency, but USD-denominated reduces FX risk',
      },
      {
        name: 'Tata Motors 2027',
        score: 62,
        riskLevel: 'high',
        comment: 'Cyclical sector, INR depreciation risk',
      },
      {
        name: 'Eskom Holdings 2029',
        score: 84,
        riskLevel: 'high',
        comment: 'Load-shedding crisis, sovereign guarantee uncertain',
      },
    ],
  },
  {
    id: 'report-2',
    vaultId: 'vault-1',
    vaultName: 'Fixed Income EU',
    date: '2026-02-15',
    score: 42,
    riskLevel: 'moderate',
    summary:
      'Well-diversified EU portfolio. Main risk is Italian invoice concentration and duration exposure.',
    recommendations: [
      {
        id: 'rec-3',
        action: 'Reduce Italy invoice exposure',
        detail: 'Reduce Milan Factoring Pool from 25% to 15%. Reallocate to French sovereign.',
        impact: 'Risk score improvement: 42 → 34',
        status: 'pending',
      },
    ],
    stressTests: [
      { scenario: 'ECB rate +1%', impact: '-2.8%' },
      { scenario: 'ECB rate +2%', impact: '-5.4%' },
      { scenario: 'Italy sovereign downgrade', impact: '-4.1%' },
    ],
    positionAnalysis: [
      {
        name: 'France Sovereign OAT 2028',
        score: 12,
        riskLevel: 'low',
        comment: 'Stable sovereign rating, short duration',
      },
      {
        name: 'Siemens AG Corporate 2027',
        score: 38,
        riskLevel: 'moderate',
        comment: 'Industrial sector cyclically exposed',
      },
      {
        name: 'Milan Factoring Pool Q3',
        score: 71,
        riskLevel: 'high',
        comment: 'Geographic concentration + BBB rating',
      },
    ],
  },
  {
    id: 'report-3',
    vaultId: 'vault-2',
    vaultName: 'US Treasury Pool',
    date: '2026-02-10',
    score: 18,
    riskLevel: 'low',
    summary: 'Low-risk sovereign portfolio. All AAA-rated US Treasuries. No action required.',
    recommendations: [],
    stressTests: [
      { scenario: 'Fed rate +1%', impact: '-0.8%' },
      { scenario: 'Fed rate +2%', impact: '-1.6%' },
      { scenario: 'US downgrade to AA+', impact: '-2.1%' },
    ],
    positionAnalysis: [
      {
        name: 'US Treasury 10Y 2035',
        score: 22,
        riskLevel: 'low',
        comment: 'Longer duration but highest credit quality',
      },
      {
        name: 'US Treasury 5Y 2030',
        score: 15,
        riskLevel: 'low',
        comment: 'Medium duration, zero credit risk',
      },
      {
        name: 'US Treasury 2Y 2027',
        score: 8,
        riskLevel: 'low',
        comment: 'Near-cash equivalent, minimal risk',
      },
    ],
  },
];

export const mockScoreHistory: Record<string, ScoreHistory[]> = {
  'vault-1': [
    { date: '2025-11', score: 38 },
    { date: '2025-12', score: 40 },
    { date: '2026-01', score: 44 },
    { date: '2026-02', score: 42 },
  ],
  'vault-2': [
    { date: '2025-09', score: 15 },
    { date: '2025-10', score: 16 },
    { date: '2025-11', score: 19 },
    { date: '2025-12', score: 17 },
    { date: '2026-01', score: 18 },
    { date: '2026-02', score: 18 },
  ],
  'vault-3': [
    { date: '2025-12', score: 58 },
    { date: '2026-01', score: 63 },
    { date: '2026-02', score: 67 },
  ],
};

export const mockConfidentialVaults: ConfidentialVault[] = [
  {
    id: 'cv-1',
    name: 'EU Credit Portfolio — Data Room',
    owner: 'BNP Paribas AM',
    parties: [
      {
        id: 'party-1',
        name: 'BNP Paribas AM',
        role: 'owner',
        publicKey: '0x1a2b...3c4d',
        joinedAt: '2026-01-10',
      },
      {
        id: 'party-2',
        name: 'BlackRock',
        role: 'counterparty',
        publicKey: '0x5e6f...7g8h',
        joinedAt: '2026-01-15',
      },
      {
        id: 'party-3',
        name: 'Deloitte',
        role: 'auditor',
        publicKey: '0x9i0j...1k2l',
        joinedAt: '2026-01-18',
      },
    ],
    trades: [
      {
        id: 'trade-1',
        from: 'BlackRock',
        to: 'BNP Paribas AM',
        assetName: 'France Sovereign OAT 2028',
        amount: 200,
        price: 1_050,
        status: 'pending',
        createdAt: '2026-02-17',
        message: 'Interested in acquiring 200 tokens at $1,050 per unit.',
      },
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
      {
        id: 'party-4',
        name: 'Goldman Sachs',
        role: 'owner',
        publicKey: '0xab12...cd34',
        joinedAt: '2026-02-01',
      },
      {
        id: 'party-5',
        name: 'JP Morgan',
        role: 'counterparty',
        publicKey: '0xef56...gh78',
        joinedAt: '2026-02-05',
      },
    ],
    trades: [
      {
        id: 'trade-2',
        from: 'JP Morgan',
        to: 'Goldman Sachs',
        assetName: 'Petrobras 2028 USD',
        amount: 500,
        price: 980,
        status: 'countered',
        createdAt: '2026-02-12',
        message: 'Counter-offer: 500 tokens at $980 each. Original ask was $1,020.',
      },
      {
        id: 'trade-3',
        from: 'Goldman Sachs',
        to: 'JP Morgan',
        assetName: 'Tata Motors 2027',
        amount: 150,
        price: 1_100,
        status: 'accepted',
        createdAt: '2026-02-10',
      },
    ],
    assetCount: 2,
    totalValue: 1_837_500,
    createdAt: '2026-02-01',
  },
];

export const mockWhitelistedWallets: WhitelistedWallet[] = [
  {
    address: '0x1234...5678',
    role: 'admin',
    label: 'Platform Admin',
    addedAt: '2025-09-01',
    kycStatus: 'verified',
  },
  {
    address: '0xabcd...ef01',
    role: 'issuer',
    label: 'BNP Paribas AM',
    addedAt: '2025-09-15',
    kycStatus: 'verified',
  },
  {
    address: '0x2345...6789',
    role: 'issuer',
    label: 'Goldman Sachs',
    addedAt: '2025-10-01',
    kycStatus: 'verified',
  },
  {
    address: '0x5e6f...7g8h',
    role: 'investor',
    label: 'BlackRock',
    addedAt: '2025-10-15',
    kycStatus: 'verified',
  },
  {
    address: '0xef56...gh78',
    role: 'investor',
    label: 'JP Morgan',
    addedAt: '2025-11-01',
    kycStatus: 'verified',
  },
  {
    address: '0x9i0j...1k2l',
    role: 'auditor',
    label: 'Deloitte',
    addedAt: '2025-11-15',
    kycStatus: 'verified',
  },
  {
    address: '0xnew1...pend',
    role: 'investor',
    label: 'Fidelity',
    addedAt: '2026-02-18',
    kycStatus: 'pending',
  },
];

export const mockPortfolioStats: PortfolioStats = {
  totalValue: 12_450_000,
  yieldYTD: 4.2,
  activeVaults: 3,
  tokenizedAssets: 9,
  upcomingPayments: 4,
};

export const mockAIAnalysis: AIAnalysis = {
  vaultName: 'EM Corporate',
  score: 67,
  riskLevel: 'high',
  recommendations: 2,
  date: '2026-02-18',
};

// ─── Helpers ──────────────────────────────────────────────────

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

export function getRiskBg(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-500';
    case 'moderate':
      return 'bg-yellow-500';
    case 'high':
      return 'bg-red-500';
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

export function getAssetTypeLabel(type: AssetType): string {
  switch (type) {
    case 'corporate-bond':
      return 'Corporate Bond';
    case 'sovereign-bond':
      return 'Sovereign Bond';
    case 'invoice':
      return 'Invoice';
    case 'real-estate':
      return 'Real Estate';
  }
}

export function getTradeStatusVariant(
  status: TradeStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending':
      return 'outline';
    case 'accepted':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'countered':
      return 'secondary';
  }
}

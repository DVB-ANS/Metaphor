// ─── AI / 0G Labs Types ──────────────────────────────────────
// Maps to Dev B's 0G Compute response structure

export type RiskLevel = 'low' | 'moderate' | 'high';
export type RecommendationStatus = 'pending_approval' | 'approved' | 'rejected';
export type ReportStatus = 'pending_approval' | 'approved' | 'rejected' | 'partial';

export interface AnalyzeRequestBody {
  vaultId: string;
  assets: {
    assetId: string;
    name?: string;
    nominalValue: number;
    couponRate: number;
    maturityDate?: string;
    rating?: string;
    jurisdiction?: string;
  }[];
}

export interface AIRecommendation {
  id: string;
  action: string;
  description: string;
  impact: string;
  status: RecommendationStatus;
}

export interface StressTest {
  scenario: string;
  impact: string;
}

export interface PositionAnalysis {
  assetId: string;
  name: string;
  score: number;
  riskLevel: RiskLevel;
  comment: string;
}

export interface AIReport {
  reportId: string;
  vaultId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  recommendations: AIRecommendation[];
  stressTests: StressTest[];
  positionAnalysis: PositionAnalysis[];
  status: ReportStatus;
  createdAt: string;
  // 0G Compute metadata
  provider?: string;
  model?: string;
  verifiable?: boolean;
  durationMs?: number;
}

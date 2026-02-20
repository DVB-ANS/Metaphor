import { z } from 'zod';

// --- Risk Levels ---

export const RiskLevelSchema = z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// --- Per-asset risk analysis ---

export const AssetRiskSchema = z.object({
  isin: z.string(),
  name: z.string(),
  score: z.number().min(1).max(100),
  reasoning: z.string(),
});

export type AssetRisk = z.infer<typeof AssetRiskSchema>;

// --- Actionable recommendation ---

export const RecommendationActionSchema = z.enum([
  'REBALANCE',
  'EXIT_POSITION',
  'ADD_COLLATERAL',
  'HOLD',
]);

export const RecommendationPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const RecommendationSchema = z.object({
  action: RecommendationActionSchema,
  targetAsset: z.string(), // ISIN of the asset concerned
  description: z.string(),
  impact: z.string(), // e.g. "Reduce risk score by ~8 points"
  priority: RecommendationPrioritySchema,
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// --- Stress test scenario ---

export const StressScenarioSchema = z.object({
  scenario: z.string(), // e.g. "ECB +2% rate hike"
  impactPct: z.number(), // e.g. -5.4
  riskScoreAfter: z.number().min(1).max(100),
});

export type StressScenario = z.infer<typeof StressScenarioSchema>;

// --- Full risk report (LLM output) ---

export const RiskReportSchema = z.object({
  globalScore: z.number().min(1).max(100),
  riskLevel: RiskLevelSchema,
  assetAnalysis: z.array(AssetRiskSchema).min(1),
  recommendations: z.array(RecommendationSchema),
  stressTests: z.array(StressScenarioSchema),
});

export type RiskReport = z.infer<typeof RiskReportSchema>;

// --- Enriched report with metadata (returned to the caller) ---

export interface AnalysisResult {
  report: RiskReport;
  generatedAt: string; // ISO 8601
  model: string; // 0G model used
  provider: string; // 0G provider address
  verifiable: boolean; // TeeML verification
  durationMs: number; // inference time
}

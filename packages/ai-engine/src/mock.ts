import { type VaultData } from './types/vault';
import {
  type RiskReport,
  type RiskLevel,
  type StressScenario,
} from './types/report';

/**
 * Generate a deterministic mock risk report based on vault data.
 * Used when ZG_USE_MOCK=true or when the 0G testnet is unavailable.
 */
export function generateMockRiskReport(vault: VaultData): RiskReport {
  const assetAnalysis = vault.assets.map((asset) => {
    const score = computeMockAssetScore(asset.rate, asset.maturity, asset.allocationPct);
    return {
      isin: asset.isin,
      name: asset.name,
      score,
      reasoning: generateMockReasoning(score, asset.rate, asset.allocationPct),
    };
  });

  const globalScore = Math.round(
    assetAnalysis.reduce((sum, a) => {
      const weight =
        vault.assets.find((v) => v.isin === a.isin)?.allocationPct ?? 0;
      return sum + a.score * (weight / 100);
    }, 0),
  );

  const riskLevel = scoreToLevel(globalScore);

  const recommendations = generateMockRecommendations(assetAnalysis, vault);
  const stressTests = generateMockStressTests(vault);

  return {
    globalScore,
    riskLevel,
    assetAnalysis,
    recommendations,
    stressTests,
  };
}

export function generateMockStressTests(vault: VaultData): StressScenario[] {
  const avgRate =
    vault.assets.reduce((sum, a) => sum + a.rate, 0) / vault.assets.length;
  const baseScore = Math.round(avgRate / 10); // rough proxy

  return [
    {
      scenario: 'Central bank rate +1%',
      impactPct: -2.5,
      riskScoreAfter: Math.min(100, baseScore + 8),
    },
    {
      scenario: 'Central bank rate +2%',
      impactPct: -5.1,
      riskScoreAfter: Math.min(100, baseScore + 16),
    },
    {
      scenario: 'Default of highest-risk issuer',
      impactPct: -(vault.assets.reduce((max, a) => Math.max(max, a.allocationPct), 0)),
      riskScoreAfter: Math.min(100, baseScore + 30),
    },
    {
      scenario: 'Sectoral crisis (most exposed sector)',
      impactPct: -8.5,
      riskScoreAfter: Math.min(100, baseScore + 20),
    },
  ];
}

// --- Helpers ---

function computeMockAssetScore(
  rateBps: number,
  maturityTimestamp: number,
  allocationPct: number,
): number {
  let score = 20; // base

  // Higher coupon = higher risk
  if (rateBps > 800) score += 30;
  else if (rateBps > 500) score += 15;
  else if (rateBps > 300) score += 5;

  // Longer maturity = higher risk
  const yearsToMaturity =
    (maturityTimestamp - Date.now() / 1000) / (365 * 24 * 3600);
  if (yearsToMaturity > 5) score += 15;
  else if (yearsToMaturity > 2) score += 8;

  // Concentration penalty
  if (allocationPct > 40) score += 20;
  else if (allocationPct > 25) score += 10;

  return Math.max(1, Math.min(100, score));
}

function scoreToLevel(score: number): RiskLevel {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

function generateMockReasoning(
  score: number,
  rateBps: number,
  allocationPct: number,
): string {
  const parts: string[] = [];

  if (score <= 25) parts.push('Low risk profile.');
  else if (score <= 50) parts.push('Moderate risk exposure.');
  else parts.push('Elevated risk detected.');

  if (rateBps > 600) parts.push(`High coupon rate (${(rateBps / 100).toFixed(1)}%) suggests higher credit risk.`);
  if (allocationPct > 30) parts.push(`Concentration at ${allocationPct.toFixed(0)}% warrants diversification.`);

  return parts.join(' ');
}

function generateMockRecommendations(
  assetAnalysis: { isin: string; name: string; score: number }[],
  vault: VaultData,
) {
  const sorted = [...assetAnalysis].sort((a, b) => b.score - a.score);
  const recommendations = [];

  const riskiest = sorted[0];
  if (riskiest && riskiest.score > 40) {
    const asset = vault.assets.find((a) => a.isin === riskiest.isin);
    recommendations.push({
      action: 'REBALANCE' as const,
      targetAsset: riskiest.isin,
      description: `Reduce ${riskiest.name} exposure from ${asset?.allocationPct.toFixed(0)}% to ${Math.max(5, (asset?.allocationPct ?? 20) - 10).toFixed(0)}%.`,
      impact: `Reduce global risk score by approximately ${Math.round(riskiest.score * 0.15)} points`,
      priority: 'HIGH' as const,
    });
  }

  if (sorted.length > 1 && sorted[1].score > 50) {
    recommendations.push({
      action: 'EXIT_POSITION' as const,
      targetAsset: sorted[1].isin,
      description: `Consider exiting ${sorted[1].name} due to elevated risk score.`,
      impact: `Reduce global risk score by approximately ${Math.round(sorted[1].score * 0.1)} points`,
      priority: 'MEDIUM' as const,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      action: 'HOLD' as const,
      targetAsset: sorted[0]?.isin ?? '',
      description: 'Portfolio is well balanced. No immediate action required.',
      impact: 'No change to risk score',
      priority: 'LOW' as const,
    });
  }

  return recommendations;
}

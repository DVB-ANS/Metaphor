import { type VaultData } from './types/vault';
import {
  type RiskReport,
  type RiskLevel,
  type StressScenario,
} from './types/report';

/**
 * Generate a deterministic mock risk report based on vault data.
 * Used when ZG_USE_MOCK=true or when the 0G testnet is unavailable.
 *
 * Produces realistic institutional-grade analysis using actual asset parameters.
 */
export function generateMockRiskReport(vault: VaultData): RiskReport {
  const assetAnalysis = vault.assets.map((asset) => {
    const score = computeMockAssetScore(asset.rate, asset.maturity, asset.allocationPct);
    return {
      isin: asset.isin,
      name: asset.name,
      score,
      reasoning: generateMockReasoning(score, asset),
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
  const totalValue = vault.totalValue || 1;
  const avgRate = vault.assets.length > 0
    ? vault.assets.reduce((sum, a) => sum + a.rate, 0) / vault.assets.length
    : 0;
  const maxAlloc = vault.assets.reduce((max, a) => Math.max(max, a.allocationPct), 0);
  const avgDuration = vault.assets.length > 0
    ? vault.assets.reduce((sum, a) => sum + Math.max(0, (a.maturity - Date.now() / 1000) / (365 * 86400)), 0) / vault.assets.length
    : 2;

  // Duration-adjusted rate sensitivity
  const rateImpact1 = -(avgDuration * 0.9 + avgRate / 200);
  const rateImpact2 = -(avgDuration * 1.8 + avgRate / 100);

  const baseScore = Math.round(
    vault.assets.length > 0
      ? vault.assets.reduce((sum, a) => sum + computeMockAssetScore(a.rate, a.maturity, a.allocationPct), 0) / vault.assets.length
      : 30,
  );

  return [
    {
      scenario: `Fed/ECB rate hike +100bps`,
      impactPct: Math.round(rateImpact1 * 10) / 10,
      riskScoreAfter: Math.min(100, baseScore + 8),
    },
    {
      scenario: `Aggressive tightening +250bps`,
      impactPct: Math.round(rateImpact2 * 10) / 10,
      riskScoreAfter: Math.min(100, baseScore + 18),
    },
    {
      scenario: `Default of largest position (${maxAlloc.toFixed(0)}% exposure)`,
      impactPct: Math.round(-maxAlloc * 0.85 * 10) / 10,
      riskScoreAfter: Math.min(100, baseScore + 30),
    },
    {
      scenario: `Credit spread widening +200bps`,
      impactPct: Math.round(-(avgDuration * 1.5) * 10) / 10,
      riskScoreAfter: Math.min(100, baseScore + 14),
    },
  ];
}

// --- Helpers ---

function computeMockAssetScore(
  rateBps: number,
  maturityTimestamp: number,
  allocationPct: number,
): number {
  let score = 15; // base — investment-grade starting point

  // Coupon rate proxy for credit risk (higher yield = higher risk)
  if (rateBps > 800) score += 30;      // HY territory
  else if (rateBps > 500) score += 20;  // crossover
  else if (rateBps > 300) score += 10;  // BBB
  else if (rateBps > 100) score += 5;   // A-rated

  // Duration risk
  const yearsToMaturity =
    (maturityTimestamp - Date.now() / 1000) / (365 * 86400);
  if (yearsToMaturity > 10) score += 20;
  else if (yearsToMaturity > 5) score += 12;
  else if (yearsToMaturity > 2) score += 6;

  // Concentration penalty
  if (allocationPct > 50) score += 25;
  else if (allocationPct > 30) score += 15;
  else if (allocationPct > 20) score += 5;

  return Math.max(1, Math.min(100, score));
}

function scoreToLevel(score: number): RiskLevel {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

function formatRate(bps: number): string {
  return (bps / 100).toFixed(2) + '%';
}

function formatYears(maturityTs: number): string {
  const years = (maturityTs - Date.now() / 1000) / (365 * 86400);
  if (years < 0) return 'matured';
  if (years < 1) return `${Math.round(years * 12)}mo`;
  return `${years.toFixed(1)}yr`;
}

function impliedRating(rateBps: number): string {
  if (rateBps <= 150) return 'AAA/AA';
  if (rateBps <= 300) return 'A';
  if (rateBps <= 500) return 'BBB';
  if (rateBps <= 700) return 'BB';
  if (rateBps <= 1000) return 'B';
  return 'CCC';
}

function generateMockReasoning(
  score: number,
  asset: { name: string; rate: number; maturity: number; allocationPct: number; balance: number; issuer: string },
): string {
  const rate = formatRate(asset.rate);
  const duration = formatYears(asset.maturity);
  const rating = impliedRating(asset.rate);
  const alloc = asset.allocationPct.toFixed(0);
  const parts: string[] = [];

  // Credit assessment
  if (asset.rate <= 300) {
    parts.push(`Investment-grade profile (implied ${rating}) with ${rate} coupon.`);
  } else if (asset.rate <= 600) {
    parts.push(`Crossover credit (implied ${rating}) at ${rate} — above median for the maturity bucket.`);
  } else {
    parts.push(`High-yield exposure (implied ${rating}) with ${rate} coupon signals elevated default probability.`);
  }

  // Duration
  const years = (asset.maturity - Date.now() / 1000) / (365 * 86400);
  if (years > 5) {
    parts.push(`Long duration (${duration}) increases interest rate sensitivity; DV01 exposure is significant.`);
  } else if (years > 2) {
    parts.push(`Medium duration (${duration}) — moderate rate sensitivity within acceptable range.`);
  } else if (years > 0) {
    parts.push(`Short duration (${duration}) limits mark-to-market volatility.`);
  }

  // Concentration
  if (asset.allocationPct > 40) {
    parts.push(`Position represents ${alloc}% of vault — well above single-name concentration limit (typically 20-25%).`);
  } else if (asset.allocationPct > 25) {
    parts.push(`${alloc}% allocation approaches concentration threshold; monitor for further buildup.`);
  }

  // Issuer/jurisdiction
  if (asset.issuer && asset.issuer !== 'Unknown') {
    parts.push(`Jurisdiction: ${asset.issuer}.`);
  }

  return parts.join(' ');
}

function generateMockRecommendations(
  assetAnalysis: { isin: string; name: string; score: number }[],
  vault: VaultData,
) {
  const sorted = [...assetAnalysis].sort((a, b) => b.score - a.score);
  const recommendations = [];
  const totalValue = vault.totalValue || 1;

  // Recommendation 1: Rebalance riskiest position
  const riskiest = sorted[0];
  if (riskiest && riskiest.score > 35) {
    const asset = vault.assets.find((a) => a.isin === riskiest.isin);
    const currentAlloc = asset?.allocationPct ?? 20;
    const targetAlloc = Math.max(5, currentAlloc - Math.round(currentAlloc * 0.3));
    const reductionValue = Math.round(((currentAlloc - targetAlloc) / 100) * totalValue);

    recommendations.push({
      action: 'REBALANCE' as const,
      targetAsset: riskiest.isin,
      description: `Reduce ${riskiest.name} from ${currentAlloc.toFixed(0)}% to ${targetAlloc}% allocation. Reallocate $${reductionValue.toLocaleString()} to shorter-duration investment-grade positions to improve portfolio Sharpe ratio.`,
      impact: `Expected risk score reduction: ${riskiest.score}/100 → ${Math.round(riskiest.score * 0.7)}/100 (global: -${Math.round(riskiest.score * 0.15 * currentAlloc / 100)} pts)`,
      priority: 'HIGH' as const,
    });
  }

  // Recommendation 2: Exit if secondary position is very risky
  if (sorted.length > 1 && sorted[1].score > 55) {
    const asset = vault.assets.find((a) => a.isin === sorted[1].isin);
    const exitValue = Math.round((asset?.allocationPct ?? 10) / 100 * totalValue);

    recommendations.push({
      action: 'EXIT_POSITION' as const,
      targetAsset: sorted[1].isin,
      description: `Exit ${sorted[1].name} (score: ${sorted[1].score}/100). Implied rating below investment-grade threshold. Redeploy $${exitValue.toLocaleString()} to diversified IG credit ETF or sovereign bonds.`,
      impact: `Portfolio credit quality improvement: remove ${(asset?.allocationPct ?? 10).toFixed(0)}% sub-IG exposure. VaR(95) reduction estimated at ${Math.round(sorted[1].score * 0.2)}bps`,
      priority: 'MEDIUM' as const,
    });
  }

  // Recommendation 3: Duration management if weighted avg duration is long
  const avgDuration = vault.assets.length > 0
    ? vault.assets.reduce((sum, a) => sum + Math.max(0, (a.maturity - Date.now() / 1000) / (365 * 86400)) * a.allocationPct, 0) / 100
    : 0;
  if (avgDuration > 4) {
    recommendations.push({
      action: 'REBALANCE' as const,
      targetAsset: sorted[0]?.isin ?? '',
      description: `Portfolio weighted average duration is ${avgDuration.toFixed(1)} years — above target range (2-4yr). Consider shortening via swap to 2Y sovereign or floating-rate notes to reduce DV01.`,
      impact: `Rate sensitivity reduction: current DV01 ~$${Math.round(avgDuration * totalValue / 10000).toLocaleString()} → target ~$${Math.round(3 * totalValue / 10000).toLocaleString()}`,
      priority: 'MEDIUM' as const,
    });
  }

  // Default: portfolio is well positioned
  if (recommendations.length === 0) {
    recommendations.push({
      action: 'HOLD' as const,
      targetAsset: sorted[0]?.isin ?? '',
      description: 'Portfolio risk metrics are within acceptable bounds. Current allocation is diversified with appropriate duration and credit exposure. Continue monitoring quarterly.',
      impact: 'No material change to risk profile. Maintain current positions through next coupon cycle.',
      priority: 'LOW' as const,
    });
  }

  return recommendations;
}

// ─── 0G Compute AI Client + In-Memory Store ─────────────────
// Forwards analysis requests to 0G Compute when available.
// Stores reports in memory for retrieval by the frontend / Dev B.

import type { AIReport, AnalyzeRequestBody } from '../types/ai.js';

const ZG_COMPUTE_ENDPOINT = process.env.ZG_COMPUTE_ENDPOINT;
const ZG_API_KEY = process.env.ZG_API_KEY;

// In-memory report store (replaced by DB in production)
const reports = new Map<string, AIReport>();

let reportCounter = 0;

function nextReportId(): string {
  reportCounter++;
  return `report-${String(reportCounter).padStart(3, '0')}`;
}

/**
 * Trigger an analysis via 0G Compute.
 * If 0G is not configured, returns a structured placeholder
 * so Dev B can still test the flow end-to-end.
 */
export async function analyzeVault(body: AnalyzeRequestBody): Promise<AIReport> {
  const reportId = nextReportId();

  let report: AIReport;

  if (ZG_COMPUTE_ENDPOINT && ZG_API_KEY) {
    // ─── Forward to 0G Compute ─────────────────────────────
    const res = await fetch(ZG_COMPUTE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZG_API_KEY}`,
      },
      body: JSON.stringify({
        vaultId: body.vaultId,
        assets: body.assets,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`0G Compute error (${res.status}): ${text}`);
    }

    const inference = (await res.json()) as {
      riskScore: number;
      recommendations: { action: string; description: string; impact: string }[];
      stressTests: { scenario: string; impact: string }[];
      positionAnalysis?: { assetId: string; name: string; score: number; riskLevel: string; comment: string }[];
    };

    report = {
      reportId,
      vaultId: body.vaultId,
      riskScore: inference.riskScore,
      riskLevel: inference.riskScore < 30 ? 'low' : inference.riskScore < 60 ? 'moderate' : 'high',
      summary: `AI analysis completed for vault ${body.vaultId}. Risk score: ${inference.riskScore}.`,
      recommendations: inference.recommendations.map((r, i) => ({
        id: `${reportId}-rec-${i + 1}`,
        action: r.action,
        description: r.description,
        impact: r.impact,
        status: 'pending_approval' as const,
      })),
      stressTests: inference.stressTests,
      positionAnalysis: inference.positionAnalysis?.map((p) => ({
        ...p,
        riskLevel: p.riskLevel as 'low' | 'moderate' | 'high',
      })) || [],
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };
  } else {
    // ─── Mock response for dev/testing ─────────────────────
    const totalNominal = body.assets.reduce((sum, a) => sum + a.nominalValue, 0);
    const avgCoupon =
      body.assets.length > 0
        ? body.assets.reduce((sum, a) => sum + a.couponRate, 0) / body.assets.length
        : 0;
    const riskScore = Math.min(100, Math.round(avgCoupon * 10 + body.assets.length * 5));

    report = {
      reportId,
      vaultId: body.vaultId,
      riskScore,
      riskLevel: riskScore < 30 ? 'low' : riskScore < 60 ? 'moderate' : 'high',
      summary: `[Mock] Analysis for vault ${body.vaultId}. ${body.assets.length} assets, total nominal $${totalNominal.toLocaleString()}. Risk score: ${riskScore}.`,
      recommendations: body.assets
        .filter((a) => a.couponRate > 6)
        .map((a, i) => ({
          id: `${reportId}-rec-${i + 1}`,
          action: 'rebalance',
          description: `High coupon asset ${a.assetId} (${a.couponRate}%) suggests elevated credit risk. Consider reducing exposure.`,
          impact: `~${(a.couponRate * 0.5).toFixed(1)}% risk reduction`,
          status: 'pending_approval' as const,
        })),
      stressTests: [
        { scenario: 'Interest rate +1%', impact: `-${(totalNominal * 0.02 / totalNominal * 100).toFixed(1)}%` },
        { scenario: 'Credit spread widening +100bps', impact: `-${(totalNominal * 0.04 / totalNominal * 100).toFixed(1)}%` },
        { scenario: 'Sovereign default (largest exposure)', impact: `-${(totalNominal * 0.15 / totalNominal * 100).toFixed(1)}%` },
      ],
      positionAnalysis: body.assets.map((a) => ({
        assetId: a.assetId,
        name: a.assetId,
        score: Math.min(100, Math.round(a.couponRate * 12)),
        riskLevel: (a.couponRate < 3 ? 'low' : a.couponRate < 6 ? 'moderate' : 'high') as 'low' | 'moderate' | 'high',
        comment: `[Mock] Coupon rate ${a.couponRate}%, nominal $${a.nominalValue.toLocaleString()}.`,
      })),
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };
  }

  reports.set(reportId, report);
  return report;
}

// ─── Seed demo reports on startup ─────────────────────────────
// Ensures the AI endpoints have data from the start for the frontend demo.
(function seedDemoReports() {
  const seed: AIReport[] = [
    {
      reportId: 'report-1',
      vaultId: 'vault-3',
      riskScore: 67,
      riskLevel: 'high',
      summary: 'High geographic and credit concentration risk. EM exposure with sub-investment-grade names requires active monitoring.',
      recommendations: [
        { id: 'rec-1', action: 'Reduce Eskom exposure', description: 'Eskom Holdings rated B with negative outlook. Reduce from 25% to 10%.', impact: 'Risk score improvement: 67 → 52', status: 'pending_approval' },
        { id: 'rec-2', action: 'Add investment-grade hedge', description: 'Allocate 15% to IG corporate bonds to offset EM credit risk.', impact: 'Portfolio Sharpe ratio improvement: +0.3', status: 'pending_approval' },
      ],
      stressTests: [
        { scenario: 'USD +10% vs EM currencies', impact: '-8.4%' },
        { scenario: 'EM sovereign crisis', impact: '-22.1%' },
        { scenario: 'Global rate +2%', impact: '-5.7%' },
      ],
      positionAnalysis: [
        { assetId: 'asset-7', name: 'Petrobras 2028 USD', score: 55, riskLevel: 'moderate', comment: 'Oil price dependency, but USD-denominated reduces FX risk' },
        { assetId: 'asset-8', name: 'Tata Motors 2027', score: 62, riskLevel: 'high', comment: 'Cyclical sector, INR depreciation risk' },
        { assetId: 'asset-9', name: 'Eskom Holdings 2029', score: 84, riskLevel: 'high', comment: 'Load-shedding crisis, sovereign guarantee uncertain' },
      ],
      status: 'pending_approval',
      createdAt: '2026-02-18',
    },
    {
      reportId: 'report-2',
      vaultId: 'vault-1',
      riskScore: 42,
      riskLevel: 'moderate',
      summary: 'Well-diversified EU portfolio. Main risk is Italian invoice concentration and duration exposure.',
      recommendations: [
        { id: 'rec-3', action: 'Reduce Italy invoice exposure', description: 'Reduce Milan Factoring Pool from 25% to 15%. Reallocate to French sovereign.', impact: 'Risk score improvement: 42 → 34', status: 'pending_approval' },
      ],
      stressTests: [
        { scenario: 'ECB rate +1%', impact: '-2.8%' },
        { scenario: 'ECB rate +2%', impact: '-5.4%' },
        { scenario: 'Italy sovereign downgrade', impact: '-4.1%' },
      ],
      positionAnalysis: [
        { assetId: 'asset-1', name: 'France Sovereign OAT 2028', score: 12, riskLevel: 'low', comment: 'Stable sovereign rating, short duration' },
        { assetId: 'asset-2', name: 'Siemens AG Corporate 2027', score: 38, riskLevel: 'moderate', comment: 'Industrial sector cyclically exposed' },
        { assetId: 'asset-3', name: 'Milan Factoring Pool Q3', score: 71, riskLevel: 'high', comment: 'Geographic concentration + BBB rating' },
      ],
      status: 'pending_approval',
      createdAt: '2026-02-15',
    },
    {
      reportId: 'report-3',
      vaultId: 'vault-2',
      riskScore: 18,
      riskLevel: 'low',
      summary: 'Low-risk sovereign portfolio. All AAA-rated US Treasuries. No action required.',
      recommendations: [],
      stressTests: [
        { scenario: 'Fed rate +1%', impact: '-0.8%' },
        { scenario: 'Fed rate +2%', impact: '-1.6%' },
        { scenario: 'US downgrade to AA+', impact: '-2.1%' },
      ],
      positionAnalysis: [
        { assetId: 'asset-4', name: 'US Treasury 10Y 2035', score: 22, riskLevel: 'low', comment: 'Longer duration but highest credit quality' },
        { assetId: 'asset-5', name: 'US Treasury 5Y 2030', score: 15, riskLevel: 'low', comment: 'Medium duration, zero credit risk' },
        { assetId: 'asset-6', name: 'US Treasury 2Y 2027', score: 8, riskLevel: 'low', comment: 'Near-cash equivalent, minimal risk' },
      ],
      status: 'pending_approval',
      createdAt: '2026-02-10',
    },
  ];

  for (const r of seed) {
    reports.set(r.reportId, r);
  }
  reportCounter = seed.length;
})();

export function getReport(reportId: string): AIReport | undefined {
  return reports.get(reportId);
}

export function listReports(vaultId?: string): AIReport[] {
  const all = Array.from(reports.values());
  if (vaultId) {
    return all.filter((r) => r.vaultId === vaultId);
  }
  return all;
}

export function approveReport(reportId: string, recommendationId?: string): AIReport | undefined {
  const report = reports.get(reportId);
  if (!report) return undefined;

  if (recommendationId) {
    const rec = report.recommendations.find((r) => r.id === recommendationId);
    if (rec) rec.status = 'approved';
    // Update overall status
    const allDecided = report.recommendations.every((r) => r.status !== 'pending_approval');
    if (allDecided) {
      report.status = report.recommendations.some((r) => r.status === 'rejected') ? 'partial' : 'approved';
    }
  } else {
    report.recommendations.forEach((r) => (r.status = 'approved'));
    report.status = 'approved';
  }

  return report;
}

export function rejectReport(reportId: string, recommendationId?: string): AIReport | undefined {
  const report = reports.get(reportId);
  if (!report) return undefined;

  if (recommendationId) {
    const rec = report.recommendations.find((r) => r.id === recommendationId);
    if (rec) rec.status = 'rejected';
    const allDecided = report.recommendations.every((r) => r.status !== 'pending_approval');
    if (allDecided) {
      report.status = report.recommendations.some((r) => r.status === 'approved') ? 'partial' : 'rejected';
    }
  } else {
    report.recommendations.forEach((r) => (r.status = 'rejected'));
    report.status = 'rejected';
  }

  return report;
}

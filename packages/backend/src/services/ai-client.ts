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

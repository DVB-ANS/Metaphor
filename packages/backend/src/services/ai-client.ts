// ─── 0G Compute AI Client + Persistent Store ────────────────
// Adapter layer: converts backend types ↔ ai-engine types,
// delegates analysis to the ai-engine package (mock or live 0G Compute).
//
// IMPORTANT: We avoid static `import ... from 'ai-engine'` because the
// barrel re-exports from 0g-client, which loads @0glabs/0g-serving-broker
// — a package with broken ESM distribution. Instead:
//   - Types use `import type` (erased at compile time, no runtime load)
//   - Mock mode imports `ai-engine/dist/mock.js` directly (zero deps)
//   - Live mode dynamically imports the full barrel only when needed

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AIReport, AnalyzeRequestBody } from '../types/ai.js';
import type { VaultData, RiskReport } from 'ai-engine';
import type { AnalysisResult } from 'ai-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Mock mode flag (set from index.ts after initialization) ─────
let useMock = true;

export function setUseMock(val: boolean): void {
  useMock = val;
}

// ─── Persistent report store ─────────────────────────────────
const DATA_DIR = resolve(__dirname, '../../data');
const REPORTS_FILE = resolve(DATA_DIR, 'ai-reports.json');

function loadReports(): Map<string, AIReport> {
  try {
    if (existsSync(REPORTS_FILE)) {
      const data = JSON.parse(readFileSync(REPORTS_FILE, 'utf-8')) as AIReport[];
      return new Map(data.map((r) => [r.reportId, r]));
    }
  } catch { /* start fresh */ }
  return new Map();
}

function saveReports(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(REPORTS_FILE, JSON.stringify(Array.from(reports.values()), null, 2));
  } catch { /* non-critical */ }
}

const reports = loadReports();

let reportCounter = reports.size;

function nextReportId(): string {
  reportCounter++;
  return `report-${String(reportCounter).padStart(3, '0')}`;
}

// ─── Adapter: AnalyzeRequestBody → VaultData ─────────────────

function requestBodyToVaultData(body: AnalyzeRequestBody): VaultData {
  const totalValue = body.assets.reduce((sum, a) => sum + a.nominalValue, 0);

  const assets = body.assets.map((a, i) => {
    const allocationPct = totalValue > 0 ? (a.nominalValue / totalValue) * 100 : 100 / body.assets.length;
    const maturityTs = a.maturityDate ? Math.floor(new Date(a.maturityDate).getTime() / 1000) : Math.floor(Date.now() / 1000) + 2 * 365 * 86400;
    const rateBps = Math.round(a.couponRate * 100);

    return {
      tokenAddress: a.assetId,
      name: a.name || a.assetId,
      symbol: `RWA-${i}`,
      isin: a.name?.match(/[A-Z]{2}\d{10}/)
        ? a.name.match(/[A-Z]{2}\d{10}/)![0]
        : `XX${a.assetId.slice(2, 12).toUpperCase()}`,
      rate: rateBps,
      maturity: maturityTs,
      issuer: a.jurisdiction || 'Unknown',
      balance: a.nominalValue,
      totalSupply: a.nominalValue,
      allocationPct: Math.round(allocationPct * 10) / 10,
    };
  });

  return {
    vaultId: body.vaultId,
    vaultName: `Vault ${body.vaultId}`,
    owner: '0x0000000000000000000000000000000000000000',
    status: 'Active',
    totalValue,
    assets,
  };
}

// ─── Call ai-engine (mock or live) ───────────────────────────

async function callAiEngine(vaultData: VaultData): Promise<AnalysisResult> {
  if (useMock) {
    // Import mock directly — avoids loading 0g-client + @0glabs/0g-serving-broker
    const { generateMockRiskReport } = await import('ai-engine/dist/mock.js');
    const startTime = Date.now();
    const report: RiskReport = generateMockRiskReport(vaultData);
    return {
      report,
      generatedAt: new Date().toISOString(),
      model: 'mock-local',
      provider: 'mock',
      verifiable: false,
      durationMs: Date.now() - startTime,
    };
  }

  // Live mode — load full ai-engine (includes 0g-client)
  const { analyzeVault: aiEngineAnalyze } = await import('ai-engine');
  return aiEngineAnalyze(vaultData, { useMock: false });
}

// ─── Adapter: AnalysisResult → AIReport ──────────────────────

function analysisResultToAIReport(result: AnalysisResult, body: AnalyzeRequestBody): AIReport {
  const reportId = nextReportId();
  const { report } = result;

  // globalScore → riskScore
  const riskScore = report.globalScore;

  // Risk level: ai-engine uses uppercase + CRITICAL; backend uses lowercase without CRITICAL
  const rawLevel = report.riskLevel.toLowerCase();
  const riskLevel = (rawLevel === 'critical' ? 'high' : rawLevel) as 'low' | 'moderate' | 'high';

  // Summary
  const summary = `AI analysis completed for vault ${body.vaultId}. Risk score: ${riskScore}/100 (${riskLevel}). ${report.assetAnalysis.length} assets analyzed. Provider: ${result.provider}, model: ${result.model}.`;

  // assetAnalysis[] → positionAnalysis[]
  const positionAnalysis = report.assetAnalysis.map((a) => {
    const assetScore = a.score;
    const assetLevel = (assetScore < 30 ? 'low' : assetScore < 60 ? 'moderate' : 'high') as 'low' | 'moderate' | 'high';
    const bodyAsset = body.assets.find((ba) => ba.name === a.name || ba.assetId === a.isin);
    return {
      assetId: bodyAsset?.assetId || a.isin,
      name: a.name,
      score: assetScore,
      riskLevel: assetLevel,
      comment: a.reasoning,
    };
  });

  // recommendations[] → add id + status
  const recommendations = report.recommendations.map((r, i) => ({
    id: `${reportId}-rec-${i + 1}`,
    action: r.action.toLowerCase(),
    description: r.description,
    impact: r.impact,
    status: 'pending_approval' as const,
  }));

  // stressTests[] → impactPct (number) → impact (string)
  const stressTests = report.stressTests.map((s) => ({
    scenario: s.scenario,
    impact: `${s.impactPct > 0 ? '+' : ''}${s.impactPct.toFixed(1)}%`,
  }));

  return {
    reportId,
    vaultId: body.vaultId,
    riskScore,
    riskLevel,
    summary,
    recommendations,
    stressTests,
    positionAnalysis,
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Trigger an analysis via ai-engine (0G Compute or mock).
 */
export async function analyzeVault(body: AnalyzeRequestBody): Promise<AIReport> {
  const vaultData = requestBodyToVaultData(body);
  const result = await callAiEngine(vaultData);
  const report = analysisResultToAIReport(result, body);

  reports.set(report.reportId, report);
  saveReports();
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
    const allDecided = report.recommendations.every((r) => r.status !== 'pending_approval');
    if (allDecided) {
      report.status = report.recommendations.some((r) => r.status === 'rejected') ? 'partial' : 'approved';
    }
  } else {
    report.recommendations.forEach((r) => (r.status = 'approved'));
    report.status = 'approved';
  }

  saveReports();
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

  saveReports();
  return report;
}

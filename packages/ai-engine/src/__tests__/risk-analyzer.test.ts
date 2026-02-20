import { describe, it, expect } from 'vitest';
import { formatVaultForPrompt, analyzeVault } from '../risk-analyzer';
import { RiskReportSchema } from '../types/report';
import { MOCK_VAULT, CONCENTRATED_VAULT, SAFE_VAULT } from './fixtures/mock-vault';

describe('formatVaultForPrompt', () => {
  it('includes vault name and total value', () => {
    const prompt = formatVaultForPrompt(MOCK_VAULT);
    expect(prompt).toContain('Fixed Income Europe Q1');
    expect(prompt).toContain('10,000,000');
  });

  it('includes all asset ISINs', () => {
    const prompt = formatVaultForPrompt(MOCK_VAULT);
    expect(prompt).toContain('FR0014001NN8');
    expect(prompt).toContain('DE000A1EWWW0');
    expect(prompt).toContain('IT0005422891');
  });

  it('formats coupon rate from basis points to percent', () => {
    const prompt = formatVaultForPrompt(MOCK_VAULT);
    expect(prompt).toContain('2.10%');
    expect(prompt).toContain('4.30%');
    expect(prompt).toContain('7.80%');
  });

  it('includes allocation percentages', () => {
    const prompt = formatVaultForPrompt(MOCK_VAULT);
    expect(prompt).toContain('40.0%');
    expect(prompt).toContain('35.0%');
    expect(prompt).toContain('25.0%');
  });

  it('includes yield history when present', () => {
    const prompt = formatVaultForPrompt(MOCK_VAULT);
    expect(prompt).toContain('YIELD HISTORY');
    expect(prompt).toContain('Snapshot #0');
    expect(prompt).toContain('15 holders');
  });

  it('omits yield history section when empty', () => {
    const prompt = formatVaultForPrompt(CONCENTRATED_VAULT);
    expect(prompt).not.toContain('YIELD HISTORY');
  });
});

describe('analyzeVault (mock mode)', () => {
  it('returns a valid RiskReport for a multi-asset vault', async () => {
    const result = await analyzeVault(MOCK_VAULT, { useMock: true });

    expect(result.model).toBe('mock-local');
    expect(result.provider).toBe('mock');
    expect(result.verifiable).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.generatedAt).toBeTruthy();

    // Validate report against Zod schema
    const parsed = RiskReportSchema.safeParse(result.report);
    expect(parsed.success).toBe(true);
  });

  it('returns one analysis per asset', async () => {
    const result = await analyzeVault(MOCK_VAULT, { useMock: true });
    expect(result.report.assetAnalysis).toHaveLength(3);

    const isins = result.report.assetAnalysis.map((a) => a.isin);
    expect(isins).toContain('FR0014001NN8');
    expect(isins).toContain('DE000A1EWWW0');
    expect(isins).toContain('IT0005422891');
  });

  it('scores concentrated vault higher risk than diversified', async () => {
    const concentrated = await analyzeVault(CONCENTRATED_VAULT, { useMock: true });
    const safe = await analyzeVault(SAFE_VAULT, { useMock: true });

    expect(concentrated.report.globalScore).toBeGreaterThan(safe.report.globalScore);
  });

  it('always includes stress tests', async () => {
    const result = await analyzeVault(MOCK_VAULT, { useMock: true });
    expect(result.report.stressTests.length).toBeGreaterThanOrEqual(4);
  });

  it('always includes at least one recommendation', async () => {
    const result = await analyzeVault(MOCK_VAULT, { useMock: true });
    expect(result.report.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('risk level matches score thresholds', async () => {
    const result = await analyzeVault(SAFE_VAULT, { useMock: true });
    const score = result.report.globalScore;

    if (score <= 25) expect(result.report.riskLevel).toBe('LOW');
    else if (score <= 50) expect(result.report.riskLevel).toBe('MODERATE');
    else if (score <= 75) expect(result.report.riskLevel).toBe('HIGH');
    else expect(result.report.riskLevel).toBe('CRITICAL');
  });
});

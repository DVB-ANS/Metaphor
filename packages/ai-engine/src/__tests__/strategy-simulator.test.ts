import { describe, it, expect } from 'vitest';
import { simulateStress, buildScenariosPrompt } from '../strategy-simulator';
import { StressScenarioSchema } from '../types/report';
import { MOCK_VAULT, CONCENTRATED_VAULT } from './fixtures/mock-vault';
import { z } from 'zod';

const StressArraySchema = z.array(StressScenarioSchema);

describe('buildScenariosPrompt', () => {
  it('returns default message when no custom scenarios', () => {
    const prompt = buildScenariosPrompt();
    expect(prompt).toContain('default');
  });

  it('returns default message for empty array', () => {
    const prompt = buildScenariosPrompt([]);
    expect(prompt).toContain('default');
  });

  it('formats custom scenarios as numbered list', () => {
    const prompt = buildScenariosPrompt(['Rate hike +3%', 'Oil crisis']);
    expect(prompt).toContain('1. Rate hike +3%');
    expect(prompt).toContain('2. Oil crisis');
  });
});

describe('simulateStress (mock mode)', () => {
  it('returns valid stress scenarios for a multi-asset vault', async () => {
    const result = await simulateStress(MOCK_VAULT, { useMock: true });

    expect(result.model).toBe('mock-local');
    expect(result.provider).toBe('mock');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // Validate each scenario against Zod schema
    const parsed = StressArraySchema.safeParse(result.scenarios);
    expect(parsed.success).toBe(true);
  });

  it('returns at least 4 default scenarios', async () => {
    const result = await simulateStress(MOCK_VAULT, { useMock: true });
    expect(result.scenarios.length).toBeGreaterThanOrEqual(4);
  });

  it('includes rate hike and default scenarios', async () => {
    const result = await simulateStress(MOCK_VAULT, { useMock: true });
    const names = result.scenarios.map((s) => s.scenario.toLowerCase());

    expect(names.some((n) => n.includes('rate'))).toBe(true);
    expect(names.some((n) => n.includes('default'))).toBe(true);
  });

  it('all impact percentages are negative (adverse scenarios)', async () => {
    const result = await simulateStress(MOCK_VAULT, { useMock: true });
    for (const scenario of result.scenarios) {
      expect(scenario.impactPct).toBeLessThanOrEqual(0);
    }
  });

  it('risk scores after stress are higher than or equal to 1', async () => {
    const result = await simulateStress(MOCK_VAULT, { useMock: true });
    for (const scenario of result.scenarios) {
      expect(scenario.riskScoreAfter).toBeGreaterThanOrEqual(1);
      expect(scenario.riskScoreAfter).toBeLessThanOrEqual(100);
    }
  });

  it('concentrated vault shows higher default impact', async () => {
    const diversified = await simulateStress(MOCK_VAULT, { useMock: true });
    const concentrated = await simulateStress(CONCENTRATED_VAULT, { useMock: true });

    const diversifiedDefault = diversified.scenarios.find((s) =>
      s.scenario.toLowerCase().includes('default'),
    );
    const concentratedDefault = concentrated.scenarios.find((s) =>
      s.scenario.toLowerCase().includes('default'),
    );

    // 100% allocation default should have worse impact than 40% max
    expect(concentratedDefault!.impactPct).toBeLessThan(diversifiedDefault!.impactPct);
  });
});

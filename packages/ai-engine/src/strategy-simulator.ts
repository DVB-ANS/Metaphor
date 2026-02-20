import { type VaultData } from './types/vault';
import { type StressScenario, StressScenarioSchema } from './types/report';
import { STRESS_TEST_SYSTEM_PROMPT } from './prompts/stress-test';
import { infer, getActiveProvider } from './0g-client';
import { formatVaultForPrompt } from './risk-analyzer';
import { generateMockStressTests } from './mock';
import { z } from 'zod';

// --- Response schema for stress test endpoint ---

const StressTestResponseSchema = z.object({
  stressTests: z.array(StressScenarioSchema).min(1),
});

// --- JSON parsing ---

function parseStressTests(raw: string): StressScenario[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);
  const result = StressTestResponseSchema.parse(parsed);
  return result.stressTests;
}

// --- Custom scenarios ---

export function buildScenariosPrompt(customScenarios?: string[]): string {
  if (!customScenarios || customScenarios.length === 0) {
    return 'Use the default stress test scenarios.';
  }

  return [
    'Simulate the following scenarios:',
    ...customScenarios.map((s, i) => `${i + 1}. ${s}`),
  ].join('\n');
}

// --- Main simulation function ---

export interface StressTestResult {
  scenarios: StressScenario[];
  generatedAt: string;
  model: string;
  provider: string;
  durationMs: number;
}

export async function simulateStress(
  vault: VaultData,
  options: { useMock?: boolean; customScenarios?: string[] } = {},
): Promise<StressTestResult> {
  const startTime = Date.now();
  const vaultDescription = formatVaultForPrompt(vault);
  const scenariosPrompt = buildScenariosPrompt(options.customScenarios);
  const userContent = `${vaultDescription}\n\n${scenariosPrompt}`;
  const provider = getActiveProvider();

  let content: string;
  let model: string;

  if (options.useMock) {
    const mockScenarios = generateMockStressTests(vault);
    content = JSON.stringify({ stressTests: mockScenarios });
    model = 'mock-local';
  } else {
    if (!provider) {
      throw new Error('No active provider. Call selectProvider() first.');
    }

    const result = await infer(provider.address, [
      { role: 'system', content: STRESS_TEST_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]);
    content = result.content;
    model = result.model;
  }

  // Parse and validate
  let scenarios: StressScenario[];
  try {
    scenarios = parseStressTests(content);
  } catch {
    if (!options.useMock && provider) {
      const retryResult = await infer(provider.address, [
        { role: 'system', content: STRESS_TEST_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
        {
          role: 'user',
          content:
            'Your previous response was not valid JSON. Please respond with ONLY a valid JSON object with a "stressTests" array. No markdown, no extra text.',
        },
      ]);
      scenarios = parseStressTests(retryResult.content);
      model = retryResult.model;
    } else {
      throw new Error('Failed to parse stress test response.');
    }
  }

  return {
    scenarios,
    generatedAt: new Date().toISOString(),
    model,
    provider: provider?.address ?? 'mock',
    durationMs: Date.now() - startTime,
  };
}

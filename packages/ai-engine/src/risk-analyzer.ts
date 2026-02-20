import { type VaultData } from './types/vault';
import {
  type RiskReport,
  type AnalysisResult,
  RiskReportSchema,
} from './types/report';
import { RISK_ANALYSIS_SYSTEM_PROMPT } from './prompts/risk-analysis';
import { infer, mockInfer, getActiveProvider } from './0g-client';
import { generateMockRiskReport } from './mock';

// --- Vault formatting ---

export function formatVaultForPrompt(vault: VaultData): string {
  const lines: string[] = [
    `VAULT: "${vault.vaultName}" (ID: ${vault.vaultId})`,
    `Owner: ${vault.owner}`,
    `Status: ${vault.status}`,
    `Total Value: $${vault.totalValue.toLocaleString('en-US')}`,
    `Number of positions: ${vault.assets.length}`,
    '',
    'POSITIONS:',
  ];

  for (const asset of vault.assets) {
    const maturityDate = new Date(asset.maturity * 1000).toISOString().split('T')[0];
    const ratePercent = (asset.rate / 100).toFixed(2);
    lines.push(
      `- ${asset.name} (${asset.symbol})`,
      `  ISIN: ${asset.isin}`,
      `  Coupon rate: ${ratePercent}% annual`,
      `  Maturity: ${maturityDate}`,
      `  Allocation: ${asset.allocationPct.toFixed(1)}% of vault`,
      `  Balance: ${asset.balance.toLocaleString('en-US')} tokens (of ${asset.totalSupply.toLocaleString('en-US')} total supply)`,
      `  Issuer: ${asset.issuer}`,
      '',
    );
  }

  if (vault.yieldHistory && vault.yieldHistory.length > 0) {
    lines.push('YIELD HISTORY:');
    for (const snap of vault.yieldHistory) {
      const date = new Date(snap.timestamp * 1000).toISOString().split('T')[0];
      lines.push(
        `- Snapshot #${snap.snapshotId} on ${date}: $${snap.totalYield.toLocaleString('en-US')} distributed to ${snap.holderCount} holders`,
      );
    }
  }

  return lines.join('\n');
}

// --- JSON parsing with retry ---

function parseRiskReport(raw: string): RiskReport {
  // Strip potential markdown code fences
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);
  return RiskReportSchema.parse(parsed);
}

// --- Main analysis function ---

export async function analyzeVault(
  vault: VaultData,
  options: { useMock?: boolean } = {},
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const userContent = formatVaultForPrompt(vault);
  const provider = getActiveProvider();

  let content: string;
  let model: string;

  if (options.useMock) {
    const mockReport = generateMockRiskReport(vault);
    content = JSON.stringify(mockReport);
    model = 'mock-local';
  } else {
    if (!provider) {
      throw new Error('No active provider. Call selectProvider() first.');
    }

    const result = await infer(provider.address, [
      { role: 'system', content: RISK_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]);
    content = result.content;
    model = result.model;
  }

  // Parse and validate
  let report: RiskReport;
  try {
    report = parseRiskReport(content);
  } catch {
    // Retry once with a more explicit prompt
    if (!options.useMock && provider) {
      const retryResult = await infer(provider.address, [
        { role: 'system', content: RISK_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
        {
          role: 'user',
          content:
            'Your previous response was not valid JSON. Please respond with ONLY a valid JSON object matching the schema. No markdown, no extra text.',
        },
      ]);
      report = parseRiskReport(retryResult.content);
      model = retryResult.model;
    } else {
      throw new Error('Failed to parse AI risk report from mock response.');
    }
  }

  return {
    report,
    generatedAt: new Date().toISOString(),
    model,
    provider: provider?.address ?? 'mock',
    verifiable: !options.useMock,
    durationMs: Date.now() - startTime,
  };
}

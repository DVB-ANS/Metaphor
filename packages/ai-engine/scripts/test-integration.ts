/**
 * Integration test — calls 0G Compute testnet for real inference.
 *
 * Prerequisites:
 *   1. ZG_PRIVATE_KEY set in .env (wallet with testnet OG tokens)
 *   2. ZG_RPC_URL set in .env (default: https://evmrpc-testnet.0g.ai)
 *
 * Usage: npx tsx scripts/test-integration.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../.env') });

import {
  initializeAIEngine,
  analyzeVault,
  simulateStress,
  discoverProviders,
  type VaultData,
} from '../src/index';

// --- Test vault data ---

const TEST_VAULT: VaultData = {
  vaultId: 'test-vault-001',
  vaultName: 'Integration Test Vault',
  owner: '0x1234567890abcdef1234567890abcdef12345678',
  status: 'Active',
  totalValue: 5_000_000,
  assets: [
    {
      tokenAddress: '0xAAA0000000000000000000000000000000000001',
      name: 'French Sovereign Bond 2028',
      symbol: 'GOV-FR-2028',
      isin: 'FR0014001NN8',
      rate: 210,
      maturity: Math.floor(Date.now() / 1000) + 2 * 365 * 86400,
      issuer: '0xISSUER_FR',
      balance: 2_500_000,
      totalSupply: 50_000_000,
      allocationPct: 50,
    },
    {
      tokenAddress: '0xAAA0000000000000000000000000000000000002',
      name: 'Italian Invoice Factoring 2026',
      symbol: 'INV-IT-2026',
      isin: 'IT0005422891',
      rate: 780,
      maturity: Math.floor(Date.now() / 1000) + 180 * 86400,
      issuer: '0xISSUER_IT',
      balance: 2_500_000,
      totalSupply: 10_000_000,
      allocationPct: 50,
    },
  ],
};

// --- Helpers ---

function log(label: string, data: unknown) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

// --- Main ---

async function main() {
  const zgRpcUrl = process.env.ZG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
  const zgPrivateKey = process.env.ZG_PRIVATE_KEY;
  const useMock = process.env.ZG_USE_MOCK === 'true';

  if (!zgPrivateKey && !useMock) {
    console.error('\nERROR: ZG_PRIVATE_KEY not set in .env');
    console.error('Options:');
    console.error('  1. Run: npx tsx scripts/generate-wallet.ts');
    console.error('  2. Or set ZG_USE_MOCK=true in .env to test with mock data\n');
    process.exit(1);
  }

  // Step 1: Initialize
  console.log('\n[1/4] Initializing AI engine...');
  console.log(`  Mode: ${useMock ? 'MOCK' : 'LIVE (0G testnet)'}`);
  console.log(`  RPC:  ${zgRpcUrl}`);

  const engine = await initializeAIEngine({
    zgRpcUrl,
    zgPrivateKey: zgPrivateKey || '',
    useMock,
  });

  console.log(`  Result: ${engine.mode} mode`);
  if (engine.mode === 'live') {
    console.log(`  Provider: ${engine.provider.model} @ ${engine.provider.address}`);
  }

  // Step 2: List providers (live only)
  if (!useMock) {
    console.log('\n[2/4] Discovering providers...');
    const providers = await discoverProviders();
    console.log(`  Found ${providers.length} provider(s):`);
    for (const p of providers) {
      console.log(`    - ${p.model} @ ${p.address.slice(0, 10)}...`);
    }
  } else {
    console.log('\n[2/4] Skipping provider discovery (mock mode)');
  }

  // Step 3: Risk analysis
  console.log('\n[3/4] Running risk analysis...');
  const startAnalysis = Date.now();
  const analysisResult = await analyzeVault(TEST_VAULT, { useMock });
  const analysisTime = Date.now() - startAnalysis;

  log('RISK ANALYSIS RESULT', {
    globalScore: analysisResult.report.globalScore,
    riskLevel: analysisResult.report.riskLevel,
    assetCount: analysisResult.report.assetAnalysis.length,
    recommendationCount: analysisResult.report.recommendations.length,
    stressTestCount: analysisResult.report.stressTests.length,
    model: analysisResult.model,
    durationMs: analysisTime,
  });
  log('FULL REPORT', analysisResult.report);

  // Step 4: Stress test
  console.log('\n[4/4] Running stress test...');
  const startStress = Date.now();
  const stressResult = await simulateStress(TEST_VAULT, { useMock });
  const stressTime = Date.now() - startStress;

  log('STRESS TEST RESULT', {
    scenarioCount: stressResult.scenarios.length,
    model: stressResult.model,
    durationMs: stressTime,
  });
  log('SCENARIOS', stressResult.scenarios);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('  ALL TESTS PASSED');
  console.log('='.repeat(60));
  console.log(`  Mode:           ${useMock ? 'Mock' : 'Live (0G Compute)'}`);
  console.log(`  Risk score:     ${analysisResult.report.globalScore}/100 (${analysisResult.report.riskLevel})`);
  console.log(`  Analysis time:  ${analysisTime}ms`);
  console.log(`  Stress time:    ${stressTime}ms`);
  console.log(`  Total time:     ${analysisTime + stressTime}ms`);
  console.log();
}

main().catch((err) => {
  console.error('\nINTEGRATION TEST FAILED:', err.message || err);
  process.exit(1);
});

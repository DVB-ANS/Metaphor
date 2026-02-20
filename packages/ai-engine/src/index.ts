/**
 * @module ai-engine
 *
 * InstiVault AI Engine — Risk analysis & stress testing powered by 0G Compute.
 *
 * ## Backend Integration (packages/backend)
 *
 * ### 1. Initialization (call once at server startup)
 *
 * ```ts
 * import { initializeAIEngine } from 'ai-engine';
 *
 * const ai = await initializeAIEngine({
 *   zgRpcUrl: process.env.ZG_RPC_URL!,
 *   zgPrivateKey: process.env.ZG_PRIVATE_KEY!,
 *   useMock: process.env.ZG_USE_MOCK === 'true',
 * });
 * console.log(`AI engine started in ${ai.mode} mode`);
 * ```
 *
 * ### 2. Express Routes
 *
 * ```ts
 * import { analyzeVault, simulateStress, type VaultData } from 'ai-engine';
 *
 * // POST /api/ai/analyze — Full risk report
 * app.post('/api/ai/analyze', async (req, res) => {
 *   const vaultData: VaultData = req.body; // assembled from on-chain data
 *   const result = await analyzeVault(vaultData, { useMock });
 *   res.json(result); // → AnalysisResult { report, model, provider, durationMs }
 * });
 *
 * // POST /api/ai/stress-test — Stress scenarios only
 * app.post('/api/ai/stress-test', async (req, res) => {
 *   const vaultData: VaultData = req.body;
 *   const result = await simulateStress(vaultData, {
 *     useMock,
 *     customScenarios: req.body.scenarios, // optional
 *   });
 *   res.json(result); // → StressTestResult { scenarios, model, provider, durationMs }
 * });
 *
 * // POST /api/ai/approve — Human-in-the-loop approval
 * // The AI NEVER executes transactions. This route prepares a tx for wallet signing.
 * app.post('/api/ai/approve', async (req, res) => {
 *   const { vaultId, recommendationIndex } = req.body;
 *   // 1. Look up the recommendation from the cached report
 *   // 2. Build the unsigned transaction (rebalance, exit, etc.)
 *   // 3. Return the unsigned tx for frontend wallet signing
 *   res.json({ unsignedTx, description });
 * });
 * ```
 *
 * ### 3. Assembling VaultData from On-Chain Sources
 *
 * The backend must aggregate data from multiple chains before calling the AI:
 *
 * ```
 * ADI (VaultManager + RWATokenFactory + RWAToken)
 *   → vaultId, owner, status, assets[].tokenAddress/name/isin/rate/maturity/balance
 *
 * Hedera (YieldDistributor)
 *   → yieldHistory[].snapshotId/totalYield/timestamp/holderCount
 *
 * Canton (ConfidentialVault — via Daml JSON API)
 *   → vaultName, description, totalValue, counterparties (for context only)
 * ```
 *
 * ### 4. Human-in-the-Loop Flow
 *
 * ```
 * Frontend: user clicks "Analyze this vault"
 *   → POST /api/ai/analyze
 *   ← AnalysisResult displayed (score, recommendations, stress tests)
 *
 * Frontend: user clicks "Approve rebalancing" on a recommendation
 *   → POST /api/ai/approve { vaultId, recommendationIndex }
 *   ← unsigned transaction returned
 *
 * Frontend: wallet signs the transaction
 *   → transaction broadcast to ADI chain
 *   ← confirmation
 * ```
 *
 * The AI component NEVER has signing authority. Every action requires
 * explicit user confirmation + wallet signature.
 */

// --- Public API ---

export { initClient, discoverProviders, selectProvider, setupProvider, getActiveProvider } from './0g-client';
export { analyzeVault, formatVaultForPrompt } from './risk-analyzer';
export { simulateStress, type StressTestResult } from './strategy-simulator';
export { generateMockRiskReport, generateMockStressTests } from './mock';

// --- Types ---

export type { ZGClientConfig, ZGProvider } from './0g-client';
export type { AssetPosition, YieldSnapshot, VaultData, VaultStatus } from './types/vault';
export {
  type RiskReport,
  type RiskLevel,
  type AssetRisk,
  type Recommendation,
  type StressScenario,
  type AnalysisResult,
  RiskReportSchema,
  StressScenarioSchema,
} from './types/report';

// --- Convenience initializer ---

export interface AIEngineConfig {
  zgRpcUrl: string;
  zgPrivateKey: string;
  useMock?: boolean;
  modelPreference?: string;
}

/**
 * Initialize the AI engine. Call once at backend startup.
 *
 * Usage from backend (Express):
 * ```
 * import { initializeAIEngine, analyzeVault } from 'ai-engine';
 *
 * await initializeAIEngine({
 *   zgRpcUrl: process.env.ZG_RPC_URL!,
 *   zgPrivateKey: process.env.ZG_PRIVATE_KEY!,
 *   useMock: process.env.ZG_USE_MOCK === 'true',
 * });
 *
 * // In route handler:
 * app.post('/api/ai/analyze', async (req, res) => {
 *   const result = await analyzeVault(vaultData, { useMock });
 *   res.json(result);
 * });
 * ```
 */
export async function initializeAIEngine(config: AIEngineConfig) {
  if (config.useMock) {
    return { mode: 'mock' as const };
  }

  const { initClient, selectProvider, setupProvider } = await import('./0g-client');

  await initClient({
    rpcUrl: config.zgRpcUrl,
    privateKey: config.zgPrivateKey,
  });

  const provider = await selectProvider(config.modelPreference);

  try {
    await setupProvider(provider.address);
  } catch {
    // Provider may already be acknowledged — safe to ignore
  }

  return { mode: 'live' as const, provider };
}

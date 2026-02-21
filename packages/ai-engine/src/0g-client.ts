// Workaround: @0glabs/0g-serving-broker ESM build is broken (named exports missing).
// Force CJS resolution which works correctly.
import { createRequire } from 'module';
import { ethers } from 'ethers';

const _require = createRequire(import.meta.url);
const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker') as {
  createZGComputeNetworkBroker: (signer: ethers.Wallet) => Promise<ZGBroker>;
};

// --- Broker type ---

interface ZGBroker {
  inference: {
    listService(): Promise<Array<{ provider: string; model: string; url: string }>>;
    acknowledgeProviderSigner(address: string): Promise<void>;
    getServiceMetadata(address: string): Promise<{ endpoint: string; model: string }>;
    getRequestHeaders(address: string, content: string): Promise<Record<string, string>>;
  };
  ledger: {
    getLedger(): Promise<unknown>;
    addLedger(balance: number, gasPrice?: bigint): Promise<void>;
    depositFund(amount: number, gasPrice?: bigint): Promise<void>;
    transferFund(address: string, type: string, amount: number, gasPrice?: bigint): Promise<void>;
  };
  fineTuning: unknown;
}

// --- Types ---

export interface ZGClientConfig {
  rpcUrl: string;
  privateKey: string;
}

export interface ZGProvider {
  address: string;
  model: string;
  endpoint: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// --- Client ---

let brokerInstance: ZGBroker | null = null;
let activeProvider: ZGProvider | null = null;

export async function initClient(config: ZGClientConfig) {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  brokerInstance = await createZGComputeNetworkBroker(wallet);
  return brokerInstance;
}

function getBroker() {
  if (!brokerInstance) {
    throw new Error('0G client not initialized. Call initClient() first.');
  }
  return brokerInstance;
}

export async function discoverProviders(): Promise<ZGProvider[]> {
  const broker = getBroker();
  const services = await broker.inference.listService();

  return services.map((s: { provider: string; model: string; url: string }) => ({
    address: s.provider,
    model: s.model,
    endpoint: s.url,
  }));
}

export async function selectProvider(modelPreference?: string): Promise<ZGProvider> {
  const providers = await discoverProviders();

  if (providers.length === 0) {
    throw new Error('No 0G Compute providers available.');
  }

  if (modelPreference) {
    const match = providers.find(
      (p) => p.model.toLowerCase().includes(modelPreference.toLowerCase()),
    );
    if (match) {
      activeProvider = match;
      return match;
    }
  }

  // Default: pick the first available chatbot provider
  activeProvider = providers[0];
  return providers[0];
}

/**
 * Initialize the 0G ledger and provider for inference.
 *
 * Flow:
 * 1. Create ledger account (if it doesn't exist) with initial deposit
 * 2. Acknowledge the provider's signer
 * 3. Transfer funds from ledger to provider sub-account
 */
export async function setupProvider(providerAddress: string, depositOG = 1) {
  const broker = getBroker();

  // Step 1: Ensure ledger exists with funds
  try {
    await broker.ledger.getLedger();
  } catch {
    // Ledger doesn't exist — create with initial deposit
    console.log(`[0G] Creating ledger with ${depositOG} OG...`);
    await broker.ledger.addLedger(depositOG);
  }

  // Step 2: Acknowledge provider signer
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress);
  } catch {
    // May already be acknowledged — safe to ignore
  }

  // Step 3: Transfer funds to provider sub-account for inference
  try {
    // transferFund expects raw wei-like units. Minimum is 10000000000000000 (0.01 OG).
    await broker.ledger.transferFund(providerAddress, 'inference', 10000000000000000);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[0G] Warning: Fund transfer failed: ${msg}`);
    // Non-fatal: sub-account may already have funds
  }
}

const INFERENCE_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

async function inferOnce(
  providerAddress: string,
  messages: ChatMessage[],
): Promise<{ content: string; model: string }> {
  const broker = getBroker();
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

  const contentForHeaders = messages.map((m) => m.content).join('\n');
  const headers = await broker.inference.getRequestHeaders(providerAddress, contentForHeaders);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`0G inference failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error('0G inference returned empty response.');
    }

    return {
      content: choice.message.content,
      model: data.model || model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function infer(
  providerAddress: string,
  messages: ChatMessage[],
): Promise<{ content: string; model: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await inferOnce(providerAddress, messages);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('0G inference failed after retries');
}

export function getActiveProvider(): ZGProvider | null {
  return activeProvider;
}

// --- Mock mode ---

export function mockInfer(
  systemPrompt: string,
  userContent: string,
  mockResponse: string,
): { content: string; model: string } {
  return {
    content: mockResponse,
    model: 'mock-local',
  };
}

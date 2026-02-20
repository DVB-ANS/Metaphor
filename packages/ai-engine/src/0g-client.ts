import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { ethers } from 'ethers';

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

let brokerInstance: Awaited<ReturnType<typeof createZGComputeNetworkBroker>> | null = null;
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

export async function setupProvider(providerAddress: string, fundAmount = 1n) {
  const broker = getBroker();
  await broker.inference.acknowledgeProviderSigner(providerAddress);
  await broker.ledger.transferFund(providerAddress, 'inference', BigInt(fundAmount));
}

export async function infer(
  providerAddress: string,
  messages: ChatMessage[],
): Promise<{ content: string; model: string }> {
  const broker = getBroker();
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

  // Build the full content string for header generation (concatenate all messages)
  const contentForHeaders = messages.map((m) => m.content).join('\n');
  const headers = await broker.inference.getRequestHeaders(providerAddress, contentForHeaders);

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ model, messages }),
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

// ─── Canton JSON API Client ──────────────────────────────────
// HTTP client for the Daml JSON API (default port 7575)
// Docs: https://docs.daml.com/json-api/

const CANTON_JSON_API_HOST = process.env.CANTON_LEDGER_HOST || 'localhost';
const CANTON_JSON_API_PORT = process.env.CANTON_JSON_API_PORT || '7575';
const BASE_URL = `http://${CANTON_JSON_API_HOST}:${CANTON_JSON_API_PORT}`;

// Daml package ID (hash) — from `daml damlc inspect` on the compiled .dar
const PACKAGE_ID = process.env.CANTON_PACKAGE_ID || 'instivault-canton';

// Mapping: entity name → Daml module name
// Each Daml file defines a module, and templates live inside modules.
const ENTITY_MODULE_MAP: Record<string, string> = {
  ConfidentialVault: 'ConfidentialVault',
  VaultInvitation: 'ConfidentialVault',
  VaultAccessRight: 'ConfidentialVault',
  TradeRequest: 'ConfidentialVault',
  TradeSettlement: 'ConfidentialVault',
  TradeProposal: 'PrivateTrade',
  TradeAgreement: 'PrivateTrade',
  AuditInvitation: 'AuditRight',
  AuditRight: 'AuditRight',
};

// JSON API expects templateId as string: "packageId:ModuleName:EntityName"
function templateId(entityName: string): string {
  const moduleName = ENTITY_MODULE_MAP[entityName] || entityName;
  return `${PACKAGE_ID}:${moduleName}:${entityName}`;
}

async function damlRequest<T>(path: string, body: unknown, party: string): Promise<T> {
  const token = partyToken(party);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canton JSON API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// Canton sandbox uses simple unsigned JWT tokens for party auth
function partyToken(party: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      'https://daml.com/ledger-api': {
        ledgerId: process.env.CANTON_LEDGER_ID || 'sandbox',
        applicationId: 'instivault',
        actAs: [party],
        readAs: [party],
      },
    }),
  ).toString('base64url');
  // Unsigned token — Canton sandbox with --allow-insecure-tokens accepts this
  return `${header}.${payload}.`;
}

// ─── Public API ──────────────────────────────────────────────

export const cantonClient = {
  /**
   * Create a new contract instance
   */
  async create(entity: string, payload: Record<string, unknown>, party: string) {
    const body = {
      templateId: templateId(entity),
      payload,
    };
    return damlRequest('/v1/create', body, party);
  },

  /**
   * Exercise a choice on a contract
   */
  async exercise(
    entity: string,
    contractId: string,
    choice: string,
    argument: Record<string, unknown>,
    party: string,
  ) {
    const body = {
      templateId: templateId(entity),
      contractId,
      choice,
      argument,
    };
    return damlRequest('/v1/exercise', body, party);
  },

  /**
   * Query contracts by template (party-scoped)
   */
  async query(entity: string, party: string, filter?: Record<string, unknown>) {
    const body = {
      templateIds: [templateId(entity)],
      query: filter,
    };
    return damlRequest('/v1/query', body, party);
  },

  /**
   * Fetch a specific contract by ID
   */
  async fetch(entity: string, contractId: string, party: string) {
    const body = {
      contractId,
      templateId: templateId(entity),
    };
    return damlRequest('/v1/fetch', body, party);
  },

  /**
   * Resolve party identifier from env config
   */
  resolveParty(role: 'admin' | 'issuer' | 'investor' | 'auditor'): string {
    const envKey = `CANTON_PARTY_${role.toUpperCase()}`;
    const party = process.env[envKey];
    if (!party) {
      throw new Error(`Missing env var ${envKey} — required for Canton party resolution`);
    }
    return party;
  },
};

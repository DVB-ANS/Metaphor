// ─── Canton JSON API Client ──────────────────────────────────
// HTTP client for the Daml JSON API (default port 7575)
// Docs: https://docs.daml.com/json-api/

const CANTON_JSON_API_HOST = process.env.CANTON_LEDGER_HOST || 'localhost';
const CANTON_JSON_API_PORT = process.env.CANTON_JSON_API_PORT || '7575';
const BASE_URL = `http://${CANTON_JSON_API_HOST}:${CANTON_JSON_API_PORT}`;

// Daml package ID — Dev B will provide the real one once deployed
const PACKAGE_ID = process.env.CANTON_PACKAGE_ID || 'instivault';

interface DamlCreateRequest {
  templateId: {
    moduleName: string;
    entityName: string;
  };
  payload: Record<string, unknown>;
  meta?: { actAs: string[] };
}

interface DamlExerciseRequest {
  templateId: {
    moduleName: string;
    entityName: string;
  };
  contractId: string;
  choice: string;
  argument: Record<string, unknown>;
  meta?: { actAs: string[] };
}

interface DamlQueryRequest {
  templateIds: {
    moduleName: string;
    entityName: string;
  }[];
  query?: Record<string, unknown>;
  meta?: { readAs: string[] };
}

interface DamlFetchRequest {
  contractId: string;
  templateId: {
    moduleName: string;
    entityName: string;
  };
  meta?: { readAs: string[] };
}

function templateId(entityName: string) {
  return {
    moduleName: `${PACKAGE_ID}:InstiVault`,
    entityName,
  };
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

// Canton Devnet uses simple JWT tokens for party auth
// In production this would come from an auth service
function partyToken(party: string): string {
  // Daml JSON API accepts a simple unsigned JWT with the party claim
  // Format: {"https://daml.com/ledger-api": {"ledgerId": "...", "applicationId": "instivault", "actAs": ["party"]}}
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      'https://daml.com/ledger-api': {
        ledgerId: process.env.CANTON_LEDGER_ID || 'instivault',
        applicationId: 'instivault',
        actAs: [party],
        readAs: [party],
      },
    }),
  ).toString('base64url');
  // Unsigned token — Canton Devnet with --auth=unsafe accepts this
  return `${header}.${payload}.`;
}

// ─── Public API ──────────────────────────────────────────────

export const cantonClient = {
  /**
   * Create a new contract instance
   */
  async create(entity: string, payload: Record<string, unknown>, party: string) {
    const body: DamlCreateRequest = {
      templateId: templateId(entity),
      payload,
      meta: { actAs: [party] },
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
    const body: DamlExerciseRequest = {
      templateId: templateId(entity),
      contractId,
      choice,
      argument,
      meta: { actAs: [party] },
    };
    return damlRequest('/v1/exercise', body, party);
  },

  /**
   * Query contracts by template (party-scoped)
   */
  async query(entity: string, party: string, filter?: Record<string, unknown>) {
    const body: DamlQueryRequest = {
      templateIds: [templateId(entity)],
      query: filter,
      meta: { readAs: [party] },
    };
    return damlRequest('/v1/query', body, party);
  },

  /**
   * Fetch a specific contract by ID
   */
  async fetch(entity: string, contractId: string, party: string) {
    const body: DamlFetchRequest = {
      contractId,
      templateId: templateId(entity),
      meta: { readAs: [party] },
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

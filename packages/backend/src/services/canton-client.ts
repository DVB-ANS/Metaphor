// ─── Canton JSON Ledger API V2 Client ─────────────────────────────
// HTTP client for the Daml JSON Ledger API V2 (SDK 3.4.11+, default port 7575)
// Docs: https://docs.digitalasset.com/build/3.4/explanations/json-api/index.html

import { randomUUID } from 'crypto';

const CANTON_JSON_API_HOST = process.env.CANTON_LEDGER_HOST || 'localhost';
const CANTON_JSON_API_PORT = process.env.CANTON_JSON_API_PORT || '7575';
const BASE_URL = `http://${CANTON_JSON_API_HOST}:${CANTON_JSON_API_PORT}`;

// Daml package ID (hash) — from `daml damlc inspect` on the compiled .dar
const PACKAGE_ID = process.env.CANTON_PACKAGE_ID || 'instivault-canton';

// User ID for the JSON API V2 (no JWT needed in sandbox mode)
const USER_ID = process.env.CANTON_USER_ID || 'ledger-api-user';

// Mapping: entity name → Daml module name
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

// V2 templateId format: "packageHash:ModuleName:EntityName"
// Note: The # prefix is for package NAMES, not hashes. Use raw hash.
function templateId(entityName: string): string {
  const moduleName = ENTITY_MODULE_MAP[entityName] || entityName;
  return `${PACKAGE_ID}:${moduleName}:${entityName}`;
}

// ─── Low-level HTTP helpers ──────────────────────────────────────

async function v2Post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canton JSON API V2 error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

async function v2Get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canton JSON API V2 error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// Build the V2 commands wrapper
function makeCommands(actAs: string[], commands: unknown[]) {
  return {
    commands,
    userId: USER_ID,
    commandId: `instivault-${randomUUID()}`,
    actAs,
    readAs: actAs,
  };
}

// Get current ledger offset (needed for active-contracts query)
async function getLedgerEnd(): Promise<number> {
  const resp = await v2Get<{ offset: number }>('/v2/state/ledger-end');
  return resp.offset;
}

// ─── Public API ──────────────────────────────────────────────────

export const cantonClient = {
  /**
   * Create a new contract instance
   * V2: POST /v2/commands/submit-and-wait with CreateCommand
   */
  async create(entity: string, payload: Record<string, unknown>, party: string) {
    const command = {
      CreateCommand: {
        templateId: templateId(entity),
        createArguments: payload,
      },
    };
    const body = makeCommands([party], [command]);
    return v2Post('/v2/commands/submit-and-wait', body);
  },

  /**
   * Exercise a choice on a contract
   * V2: POST /v2/commands/submit-and-wait with ExerciseCommand
   */
  async exercise(
    entity: string,
    contractId: string,
    choice: string,
    argument: Record<string, unknown>,
    party: string,
  ) {
    const command = {
      ExerciseCommand: {
        templateId: templateId(entity),
        contractId,
        choice,
        choiceArgument: argument,
      },
    };
    const body = makeCommands([party], [command]);
    return v2Post('/v2/commands/submit-and-wait', body);
  },

  /**
   * Query active contracts by template (party-scoped via actAs filter)
   * V2: POST /v2/state/active-contracts
   *
   * Returns an array of CreatedEvent objects with { contractId, templateId, createArgument }
   */
  async query(entity: string, party: string, _filter?: Record<string, unknown>) {
    const offset = await getLedgerEnd();

    const body = {
      eventFormat: {
        filtersByParty: {
          [party]: {
            cumulative: [
              {
                identifierFilter: {
                  TemplateFilter: {
                    value: {
                      templateId: templateId(entity),
                      includeCreatedEventBlob: false,
                    },
                  },
                },
              },
            ],
          },
        },
        verbose: true,
      },
      activeAtOffset: offset,
    };

    const rawResponse = await v2Post<unknown[]>('/v2/state/active-contracts', body);

    // V2 returns an array of responses, each with contractEntry.JsActiveContract.createdEvent
    const contracts = (rawResponse || [])
      .filter((item: any) => item?.contractEntry?.JsActiveContract?.createdEvent)
      .map((item: any) => {
        const evt = item.contractEntry.JsActiveContract.createdEvent;
        return {
          contractId: evt.contractId,
          templateId: evt.templateId,
          payload: evt.createArgument || {},
        };
      });

    // Return in a shape compatible with our route handlers
    return { result: contracts };
  },

  /**
   * Fetch a specific contract by ID
   * V2: POST /v2/events/events-by-contract-id
   */
  async fetch(entity: string, contractId: string, party: string) {
    const body = {
      contractId,
      eventFormat: {
        filtersByParty: {
          [party]: {
            cumulative: [
              {
                identifierFilter: {
                  TemplateFilter: {
                    value: {
                      templateId: templateId(entity),
                      includeCreatedEventBlob: false,
                    },
                  },
                },
              },
            ],
          },
        },
        verbose: true,
      },
    };
    return v2Post('/v2/events/events-by-contract-id', body);
  },

  /**
   * Allocate a new party on the ledger
   * V2: POST /v2/parties
   */
  async allocateParty(hint: string): Promise<string> {
    const resp = await v2Post<{ partyDetails: { party: string } }>('/v2/parties', {
      partyIdHint: hint,
      identityProviderId: '',
    });
    return resp.partyDetails.party;
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

  /**
   * Health check — is the JSON API running?
   */
  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/livez`);
      return res.ok;
    } catch {
      return false;
    }
  },
};

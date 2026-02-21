# InstiVault Canton — Confidential RWA Vaults on Daml

Native Daml smart contracts for the Canton Network, providing privacy-preserving institutional vaults with party-scoped visibility. Built with DPM (Digital Asset Package Manager) and SDK 3.4.11.

Part of the [Metaphor](../../README.md) platform — ETHDenver 2026, Canton Network bounty.

---

## Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| Java | 17+ | `java -version` | [adoptium.net](https://adoptium.net/) |
| DPM | latest | `dpm version` | `curl https://get.digitalasset.com/install/install.sh \| sh` |
| pnpm | 9+ | `pnpm --version` | `npm install -g pnpm` |

### Add DPM and Daml to your PATH

Add these lines to your `~/.zshrc`:

```bash
export PATH="$HOME/.dpm/bin:$PATH"
export PATH="$HOME/.daml/bin:$PATH"
```

Then reload:

```bash
source ~/.zshrc
```

### Install the Daml SDK via DPM

```bash
dpm install 3.4.11
```

Verify:

```bash
dpm version
# Should show: * 3.4.11
```

---

## Quick Start — Build & Test

```bash
# From the monorepo root
cd packages/contracts-canton

# Build the DAR (Daml Archive)
dpm build
# Output: .daml/dist/instivault-canton-0.1.0.dar

# Run all 28 tests
dpm test
# Expected: 28/28 passing, 9/9 templates created (100%)
```

Or from the monorepo root via pnpm:

```bash
pnpm build:canton
pnpm test:canton
```

---

## Run the Canton Sandbox (Local Chain)

You need **2 terminals**. All commands assume you are in `packages/contracts-canton/`.

### Terminal 1 — Start the Canton Sandbox

```bash
dpm sandbox --dar .daml/dist/instivault-canton-0.1.0.dar --ledger-api-port 6865 --json-api-port 7575
```

Wait until you see:

```
HTTP JSON API Server started with (address=127.0.0.1, port=7575)
Canton sandbox is ready.
```

This starts a local Canton node on port **6865** (gRPC) with the JSON Ledger API V2 on port **7575** (HTTP).

### Terminal 2 — Seed the Sandbox

Run the seed script to allocate parties, create a vault with 3 assets, and add a counterparty:

```bash
bash scripts/seed-sandbox.sh
```

The script outputs the `.env` values you need for the backend.

#### Manual Testing (Optional)

You can also interact with the sandbox manually using the JSON Ledger API V2:

```bash
# Health check
curl -s http://localhost:7575/livez

# Allocate a party
curl -s http://localhost:7575/v2/parties \
  -H "Content-Type: application/json" \
  -d '{"partyIdHint": "TestParty", "identityProviderId": ""}'
```

Response:

```json
{"partyDetails":{"party":"TestParty::1220abc...","isLocal":true,...}}
```

#### Create a vault (manual)

Replace `<HASH>` and `<ADMIN>` with values from the seed script:

```bash
PKG="<HASH>"
ADMIN="<ADMIN_PARTY>"

curl -s http://localhost:7575/v2/commands/submit-and-wait \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": [{
      \"CreateCommand\": {
        \"templateId\": \"#$PKG:ConfidentialVault:ConfidentialVault\",
        \"createArguments\": {
          \"owner\": \"$ADMIN\",
          \"vaultId\": \"vault-test\",
          \"vaultName\": \"Test Vault\",
          \"description\": \"Test vault\",
          \"assets\": [],
          \"totalValue\": \"0.0\",
          \"status\": \"Active\",
          \"counterparties\": []
        }
      }
    }],
    \"userId\": \"ledger-api-user\",
    \"commandId\": \"test-create-1\",
    \"actAs\": [\"$ADMIN\"],
    \"readAs\": [\"$ADMIN\"]
  }"
```

Expected: `{"updateId":"...","completionOffset":...}`

#### Verify visibility separation

```bash
# Get current ledger offset
OFFSET=$(curl -s http://localhost:7575/v2/state/ledger-end | python3 -c "import sys,json; print(json.load(sys.stdin)['offset'])")

# Admin queries vaults → should see vault(s)
curl -s http://localhost:7575/v2/state/active-contracts \
  -H "Content-Type: application/json" \
  -d "{
    \"eventFormat\": {
      \"filtersByParty\": {
        \"$ADMIN\": {
          \"cumulative\": [{\"identifierFilter\": {\"WildcardFilter\": {\"value\": {\"includeCreatedEventBlob\": false}}}}]
        }
      },
      \"verbose\": true
    },
    \"verbose\": true,
    \"activeAtOffset\": $OFFSET
  }"
# Expected: array with vault contract(s)

# Investor queries → should see NOTHING (unless added as counterparty)
INVESTOR="<INVESTOR_PARTY>"
curl -s http://localhost:7575/v2/state/active-contracts \
  -H "Content-Type: application/json" \
  -d "{
    \"eventFormat\": {
      \"filtersByParty\": {
        \"$INVESTOR\": {
          \"cumulative\": [{\"identifierFilter\": {\"WildcardFilter\": {\"value\": {\"includeCreatedEventBlob\": false}}}}]
        }
      },
      \"verbose\": true
    },
    \"verbose\": true,
    \"activeAtOffset\": $OFFSET
  }"
# Expected: []  ← Investor sees nothing before being added as counterparty
```

This proves Canton's privacy model: the same vault exists for Admin but **does not exist** for Investor.

---

## Connect the Backend

#### Step 1: Add Canton env vars to `packages/backend/.env`

```env
# Canton (Local Sandbox)
CANTON_LEDGER_HOST=localhost
CANTON_LEDGER_PORT=6865
CANTON_JSON_API_PORT=7575
CANTON_LEDGER_ID=sandbox
CANTON_PACKAGE_ID=<HASH>
CANTON_PARTY_ADMIN=Admin::1220...
CANTON_PARTY_ISSUER=Issuer::1220...
CANTON_PARTY_INVESTOR=Investor::1220...
CANTON_PARTY_AUDITOR=Auditor::1220...
```

#### Step 2: Start the backend

```bash
# From monorepo root
pnpm dev:backend
```

The backend connects to the JSON API on port 7575 and exposes Canton endpoints at `/api/canton/*`.

---

## All pnpm Scripts

From the **monorepo root**:

```bash
pnpm build:canton      # dpm build
pnpm test:canton       # dpm test (28 tests)
```

From **packages/contracts-canton/**:

```bash
pnpm build             # dpm build
pnpm test              # dpm test
pnpm run sandbox       # Start Canton sandbox (port 6865)
pnpm run json-api      # Start JSON API (port 7575)
pnpm run clean         # Remove build artifacts
```

---

## Privacy Model

The core feature for the Canton bounty. The same vault data is exposed differently to different parties — enforced at the **protocol level**, not application logic.

```
┌─────────────────────────────────────────────────────────┐
│                     Canton Ledger                        │
│                                                         │
│  ConfidentialVault              AuditRight               │
│  ┌────────────────────┐        ┌────────────────────┐   │
│  │ signatory: Owner   │        │ signatory: Owner   │   │
│  │ observer:  [CP1]   │        │ signatory: Auditor │   │
│  │                    │        │                    │   │
│  │ assets: [...]      │        │ assetCount: 3      │   │
│  │ counterparties     │        │ totalValue: 15M    │   │
│  │ trades             │        │ types: ["Bond"]    │   │
│  └────────────────────┘        └────────────────────┘   │
│          │                              │               │
│     CP1 sees this                 Auditor sees this     │
│     Auditor does NOT              CP1 does NOT          │
└─────────────────────────────────────────────────────────┘
```

| Party | Vault details | Individual assets | Counterparty IDs | Trades | Compliance data |
|-------|:---:|:---:|:---:|:---:|:---:|
| **Owner** | Yes | Yes | Yes | Yes | Yes |
| **Counterparty** | Yes | Yes | Yes | Yes | No |
| **Auditor** | No | No | No | No | Yes |
| **Unauthorized** | No | No | No | No | No |

---

## Daml Templates (9 total)

| Template | Module | Signatories | Purpose |
|----------|--------|-------------|---------|
| `ConfidentialVault` | ConfidentialVault | owner | Main vault holding RWA assets |
| `VaultInvitation` | ConfidentialVault | vaultOwner | Propose/accept access pattern |
| `VaultAccessRight` | ConfidentialVault | owner, grantee | Proof of granted access |
| `TradeRequest` | ConfidentialVault | vaultOwner, requester | Trade request on vault asset |
| `TradeSettlement` | ConfidentialVault | seller, buyer | Record of accepted trade |
| `TradeProposal` | PrivateTrade | proposer | Bilateral offer/counter-offer |
| `TradeAgreement` | PrivateTrade | buyer, seller | Binding negotiation record |
| `AuditInvitation` | AuditRight | vaultOwner | Invite auditor with compliance data |
| `AuditRight` | AuditRight | vaultOwner, auditor | Limited compliance-only view |

---

## Test Coverage

```
28/28 tests passing
9/9 templates created (100%)
26/39 choices exercised (66.7%)
```

| Test File | Scenarios |
|-----------|-----------|
| TestConfidentialVault.daml | 14 (lifecycle, invitations, trades, access control) |
| TestPrivateTrade.daml | 7 (negotiation, counter-offers, privacy) |
| TestAuditRight.daml | 7 (audit access, visibility isolation, revocation) |

---

## Project Structure

```
packages/contracts-canton/
├── daml.yaml                      # DPM config (SDK 3.4.11)
├── package.json                   # pnpm scripts (build, test, sandbox, json-api)
├── daml/
│   ├── ConfidentialVault.daml     # 5 templates — vault, invitation, access, trade
│   ├── PrivateTrade.daml          # 2 templates — proposal, agreement
│   ├── AuditRight.daml            # 2 templates — audit invitation, audit right
│   ├── TestConfidentialVault.daml # 14 test scenarios
│   ├── TestPrivateTrade.daml      # 7 test scenarios
│   └── TestAuditRight.daml        # 7 test scenarios
└── .daml/dist/
    └── instivault-canton-0.1.0.dar  # Compiled Daml archive
```

---

## Troubleshooting

**`dpm: command not found`**
Add `~/.dpm/bin` to your PATH: `export PATH="$HOME/.dpm/bin:$PATH"` in `~/.zshrc`, then `source ~/.zshrc`.

**`SDK_NOT_INSTALLED` error**
Run `dpm install 3.4.11` to install the SDK.

**`No valid daml.yaml could be found`**
You are not in `packages/contracts-canton/`. Either `cd` into it or use `pnpm build:canton` from the root.

**Sandbox crashes with log compression error**
Delete old log files: `rm -f log/canton.log.*.gz log/*.tmp`

**JSON API cannot connect**
Start the sandbox first (Terminal 1), wait for "Canton sandbox is ready", then start the JSON API (Terminal 2).

**`Expected JsString(<packageId>:<module>:<entity>)` error**
Template IDs must be strings in the format `<packageHash>:ModuleName:EntityName`. Use the full 64-char hash from `daml damlc inspect`, not the package name.

---

## Bounty Checklist

| Requirement | Status |
|-------------|--------|
| Native Daml (no wrappers) | Done — 3 modules, 9 templates, pure Daml |
| Built with DPM Framework | Done — SDK 3.4.11, `dpm build` / `dpm test` |
| Deployed on Canton | Done — local sandbox, DAR uploaded |
| Visibility separation demo | Done — owner/counterparty/auditor see different data |
| 28 tests passing | Done — `dpm test` 28/28 |
| Privacy-first model | Done — protocol-level enforcement, not app logic |

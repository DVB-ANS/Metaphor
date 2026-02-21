#!/bin/bash
# ─── Seed Canton Sandbox (JSON Ledger API V2) ──────────────────
# Run this AFTER the sandbox is started with:
#   dpm sandbox --dar .daml/dist/instivault-canton-0.1.0.dar --ledger-api-port 6865 --json-api-port 7575
#
# This script:
#   1. Allocates 4 parties (Admin, Issuer, Investor, Auditor)
#   2. Gets the package hash
#   3. Creates a vault with 3 RWA assets
#   4. Adds Investor as counterparty
#   5. Prints the .env config to paste into packages/backend/.env

set -e

API="http://localhost:7575"
USER_ID="ledger-api-user"
CMD_NUM=0

next_cmd_id() {
  CMD_NUM=$((CMD_NUM + 1))
  echo "seed-${CMD_NUM}-$(date +%s)"
}

# Query the latest active ConfidentialVault contract ID
query_vault_cid() {
  local PARTY="$1"
  local TMPL="$2"
  sleep 1  # Brief pause to let ledger commit
  local OFF=$(curl -s "$API/v2/state/ledger-end" | python3 -c "import sys,json; print(json.load(sys.stdin)['offset'])")
  curl -s "$API/v2/state/active-contracts" \
    -H "Content-Type: application/json" \
    -d "{
      \"eventFormat\": {
        \"filtersByParty\": {
          \"$PARTY\": {
            \"cumulative\": [{
              \"identifierFilter\": {
                \"TemplateFilter\": {
                  \"value\": {
                    \"templateId\": \"$TMPL\",
                    \"includeCreatedEventBlob\": false
                  }
                }
              }
            }]
          }
        },
        \"verbose\": true
      },
      \"activeAtOffset\": $OFF
    }" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Get the last active contract (most recent after exercise)
cid = None
for item in data:
    entry = item.get('contractEntry', {})
    active = entry.get('JsActiveContract', {})
    evt = active.get('createdEvent', {})
    if evt.get('contractId'):
        cid = evt['contractId']
if cid:
    print(cid)
"
}

# ──────────────────────────────────────────────────────────────

echo "=== Step 1: Checking sandbox health ==="

HEALTH=$(curl -sf "$API/livez" || echo "FAIL")
if [ "$HEALTH" = "FAIL" ]; then
  echo "  ERROR: Sandbox not responding on $API"
  echo "  Start it with: dpm sandbox --dar .daml/dist/instivault-canton-0.1.0.dar --ledger-api-port 6865 --json-api-port 7575"
  exit 1
fi
echo "  Sandbox is healthy"

echo ""
echo "=== Step 2: Allocating parties (V2 API) ==="

# Allocate or find existing party — idempotent
allocate_party() {
  local HINT="$1"
  # Try to allocate (may fail if party already exists)
  local RESP=$(curl -s "$API/v2/parties" \
    -H "Content-Type: application/json" \
    -d "{\"partyIdHint\": \"$HINT\", \"identityProviderId\": \"\"}")
  local PARTY=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['partyDetails']['party'])" 2>/dev/null)
  if [ -n "$PARTY" ]; then
    echo "$PARTY"
    return
  fi
  # Party already exists — find it in the party list (GET /v2/parties)
  PARTY=$(curl -s "$API/v2/parties" -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('partyDetails', []):
    if p['party'].startswith('$HINT::'):
        print(p['party'])
        break
" 2>/dev/null)
  echo "$PARTY"
}

ADMIN_PARTY=$(allocate_party "Admin")
echo "  Admin:    $ADMIN_PARTY"

ISSUER_PARTY=$(allocate_party "Issuer")
echo "  Issuer:   $ISSUER_PARTY"

INVESTOR_PARTY=$(allocate_party "Investor")
echo "  Investor: $INVESTOR_PARTY"

AUDITOR_PARTY=$(allocate_party "Auditor")
echo "  Auditor:  $AUDITOR_PARTY"

echo ""
echo "=== Step 3: Getting package hash ==="

# Get package hash from the DAR
DAML_CMD=$(command -v daml 2>/dev/null || echo "$HOME/.daml/bin/daml")
PKG=$($DAML_CMD damlc inspect .daml/dist/instivault-canton-0.1.0.dar 2>&1 | python3 -c "
import sys
for line in sys.stdin:
    if line.startswith('package '):
        print(line.split()[1])
        break
" 2>/dev/null || echo "unknown")

# Fallback: list packages via API
if [ "$PKG" = "unknown" ] || [ -z "$PKG" ]; then
  PKG=$(curl -s "$API/v2/packages" -H "Content-Type: application/json" | python3 -c "
import sys, json
pkgs = json.load(sys.stdin).get('packageIds', [])
for p in pkgs:
    print(p)
    break
" 2>/dev/null || echo "unknown")
fi

echo "  Package:  $PKG"
VAULT_TMPL="${PKG}:ConfidentialVault:ConfidentialVault"

echo ""
echo "=== Step 4: Creating vault ==="

curl -s "$API/v2/commands/submit-and-wait" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": [{
      \"CreateCommand\": {
        \"templateId\": \"$VAULT_TMPL\",
        \"createArguments\": {
          \"owner\": \"$ADMIN_PARTY\",
          \"vaultId\": \"vault-001\",
          \"vaultName\": \"Institutional Bond Portfolio\",
          \"description\": \"Primary institutional bond vault — EU sovereign and corporate credit\",
          \"assets\": [],
          \"totalValue\": \"0.0\",
          \"status\": \"Active\",
          \"counterparties\": []
        }
      }
    }],
    \"userId\": \"$USER_ID\",
    \"commandId\": \"$(next_cmd_id)\",
    \"actAs\": [\"$ADMIN_PARTY\"],
    \"readAs\": [\"$ADMIN_PARTY\"]
  }" > /dev/null
echo "  Vault created"

# Get the contract ID
VAULT_CID=$(query_vault_cid "$ADMIN_PARTY" "$VAULT_TMPL")
echo "  Contract ID: ${VAULT_CID:0:30}..."

echo ""
echo "=== Step 5: Depositing 3 assets ==="

# Asset 1: France OAT 2028
curl -s "$API/v2/commands/submit-and-wait" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": [{
      \"ExerciseCommand\": {
        \"templateId\": \"$VAULT_TMPL\",
        \"contractId\": \"$VAULT_CID\",
        \"choice\": \"DepositAsset\",
        \"choiceArgument\": {
          \"newAsset\": {
            \"assetId\": \"asset-oat-2028\",
            \"assetType\": \"Bond\",
            \"name\": \"France Sovereign OAT 2028\",
            \"isin\": \"FR0014007L91\",
            \"nominalValue\": \"2080000.0\",
            \"couponRate\": \"0.021\",
            \"maturityDate\": \"2028-06-15\",
            \"issuerName\": \"French Republic\"
          }
        }
      }
    }],
    \"userId\": \"$USER_ID\",
    \"commandId\": \"$(next_cmd_id)\",
    \"actAs\": [\"$ADMIN_PARTY\"],
    \"readAs\": [\"$ADMIN_PARTY\"]
  }" > /dev/null
echo "  + France Sovereign OAT 2028 (\$2.08M)"

# Re-query contract ID (exercise archives old, creates new)
VAULT_CID=$(query_vault_cid "$ADMIN_PARTY" "$VAULT_TMPL")

# Asset 2: Siemens Corporate 2027
curl -s "$API/v2/commands/submit-and-wait" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": [{
      \"ExerciseCommand\": {
        \"templateId\": \"$VAULT_TMPL\",
        \"contractId\": \"$VAULT_CID\",
        \"choice\": \"DepositAsset\",
        \"choiceArgument\": {
          \"newAsset\": {
            \"assetId\": \"asset-siemens-2027\",
            \"assetType\": \"Bond\",
            \"name\": \"Siemens AG Corporate 2027\",
            \"isin\": \"DE000A3H3J67\",
            \"nominalValue\": \"1820000.0\",
            \"couponRate\": \"0.043\",
            \"maturityDate\": \"2027-12-01\",
            \"issuerName\": \"Siemens AG\"
          }
        }
      }
    }],
    \"userId\": \"$USER_ID\",
    \"commandId\": \"$(next_cmd_id)\",
    \"actAs\": [\"$ADMIN_PARTY\"],
    \"readAs\": [\"$ADMIN_PARTY\"]
  }" > /dev/null
echo "  + Siemens AG Corporate 2027 (\$1.82M)"

# Re-query contract ID
VAULT_CID=$(query_vault_cid "$ADMIN_PARTY" "$VAULT_TMPL")

# Asset 3: Milan Factoring Pool
curl -s "$API/v2/commands/submit-and-wait" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": [{
      \"ExerciseCommand\": {
        \"templateId\": \"$VAULT_TMPL\",
        \"contractId\": \"$VAULT_CID\",
        \"choice\": \"DepositAsset\",
        \"choiceArgument\": {
          \"newAsset\": {
            \"assetId\": \"asset-milan-q3\",
            \"assetType\": \"Invoice\",
            \"name\": \"Milan Factoring Pool Q3\",
            \"isin\": \"IT0005511196\",
            \"nominalValue\": \"1300000.0\",
            \"couponRate\": \"0.078\",
            \"maturityDate\": \"2026-09-30\",
            \"issuerName\": \"Banca Intesa\"
          }
        }
      }
    }],
    \"userId\": \"$USER_ID\",
    \"commandId\": \"$(next_cmd_id)\",
    \"actAs\": [\"$ADMIN_PARTY\"],
    \"readAs\": [\"$ADMIN_PARTY\"]
  }" > /dev/null
echo "  + Milan Factoring Pool Q3 (\$1.30M)"

echo ""
echo "=== Step 6: Adding Investor as counterparty ==="

# Re-query contract ID
VAULT_CID=$(query_vault_cid "$ADMIN_PARTY" "$VAULT_TMPL")

curl -s "$API/v2/commands/submit-and-wait" \
  -H "Content-Type: application/json" \
  -d "{
    \"commands\": [{
      \"ExerciseCommand\": {
        \"templateId\": \"$VAULT_TMPL\",
        \"contractId\": \"$VAULT_CID\",
        \"choice\": \"AddCounterparty\",
        \"choiceArgument\": { \"newCounterparty\": \"$INVESTOR_PARTY\" }
      }
    }],
    \"userId\": \"$USER_ID\",
    \"commandId\": \"$(next_cmd_id)\",
    \"actAs\": [\"$ADMIN_PARTY\"],
    \"readAs\": [\"$ADMIN_PARTY\"]
  }" > /dev/null
echo "  Investor added as counterparty"

echo ""
echo "=========================================="
echo "  Canton sandbox seeded successfully!"
echo "=========================================="
echo ""
echo "Vault: Institutional Bond Portfolio"
echo "  - 3 assets, \$5.2M total value"
echo "  - Owner: Admin"
echo "  - Counterparty: Investor"
echo ""
echo "--- Copy this into packages/backend/.env ---"
echo ""
echo "# Canton (Local Sandbox — SDK 3.4.11, JSON API V2)"
echo "CANTON_LEDGER_HOST=localhost"
echo "CANTON_LEDGER_PORT=6865"
echo "CANTON_JSON_API_PORT=7575"
echo "CANTON_LEDGER_ID=sandbox"
echo "CANTON_PACKAGE_ID=$PKG"
echo "CANTON_PARTY_ADMIN=$ADMIN_PARTY"
echo "CANTON_PARTY_ISSUER=$ISSUER_PARTY"
echo "CANTON_PARTY_INVESTOR=$INVESTOR_PARTY"
echo "CANTON_PARTY_AUDITOR=$AUDITOR_PARTY"

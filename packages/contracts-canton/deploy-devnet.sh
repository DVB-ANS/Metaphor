#!/usr/bin/env bash
# =============================================================================
# InstiVault Canton — Deploy to Canton DevNet L1
# =============================================================================
# Usage:
#   1. SSH into a DevNet machine first:
#      ssh dev<N>@<IP>  (see DEVNET_MACHINES below)
#   2. Copy this script + DAR to the machine:
#      scp deploy-devnet.sh .daml/dist/instivault-canton-0.1.0.dar dev<N>@<IP>:~/
#   3. Run: bash deploy-devnet.sh
# =============================================================================

set -euo pipefail

# --- Configuration ---
DAR_FILE="${DAR_FILE:-instivault-canton-0.1.0.dar}"
LEDGER_API_HOST="${LEDGER_API_HOST:-localhost}"
LEDGER_API_PORT="${LEDGER_API_PORT:-80}"
LEDGER_VHOST="${LEDGER_VHOST:-json-ledger-api.localhost}"
BASE_URL="http://${LEDGER_API_HOST}:${LEDGER_API_PORT}"

# All Ledger API calls go through nginx with the virtual host header
HCURL=(curl -s -H "Host: ${LEDGER_VHOST}")

# DevNet machines (for reference):
# DevNet1: ssh dev1@34.173.195.33  (pw: CantonDev1!)
# DevNet2: ssh dev2@34.121.184.157 (pw: CantonDev2!)
# DevNet3: ssh dev3@35.193.163.216 (pw: CantonDev3!)
# DevNet4: ssh dev4@34.57.100.252  (pw: CantonDev4!)
# DevNet5: ssh dev5@136.112.241.18 (pw: CantonDev5!)

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${CYAN}[DEPLOY]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
fail()  { echo -e "${RED}[FAILED]${NC} $1"; exit 1; }

# =============================================================================
# Step 0: Preflight checks
# =============================================================================
log "Preflight checks..."

if [ ! -f "$DAR_FILE" ]; then
  fail "DAR file not found: $DAR_FILE"
fi
ok "DAR file found: $DAR_FILE ($(du -h "$DAR_FILE" | cut -f1))"

if ! command -v curl &> /dev/null; then
  fail "curl is required but not installed"
fi
ok "curl available"

if ! command -v jq &> /dev/null; then
  warn "jq not installed — output won't be pretty-printed"
  JQ="cat"
else
  JQ="jq"
  ok "jq available"
fi

# =============================================================================
# Step 1: Check validator is running
# =============================================================================
log "Checking if validator is running..."

if docker ps 2>/dev/null | grep -q "splice"; then
  ok "Validator containers already running"
else
  fail "Validator containers not found. Start them first with start.sh"
fi

# =============================================================================
# Step 2: Wait for JSON Ledger API to be ready (via nginx vhost)
# =============================================================================
log "Waiting for JSON Ledger API at ${BASE_URL} (Host: ${LEDGER_VHOST})..."

MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if "${HCURL[@]}" "${BASE_URL}/v2/version" 2>/dev/null | grep -q "version"; then
    ok "JSON Ledger API is ready"
    break
  fi
  RETRY=$((RETRY + 1))
  echo -n "."
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  fail "JSON Ledger API not responding after ${MAX_RETRIES} retries"
fi

# =============================================================================
# Step 3: Count packages before upload
# =============================================================================
PKG_BEFORE=$("${HCURL[@]}" "${BASE_URL}/v2/packages" | jq '.packageIds | length' 2>/dev/null || echo "?")
log "Packages before upload: $PKG_BEFORE"

# =============================================================================
# Step 4: Upload DAR file
# =============================================================================
log "Uploading DAR: ${DAR_FILE}..."

UPLOAD_RESPONSE=$("${HCURL[@]}" -w "\n%{http_code}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@${DAR_FILE}" \
  "${BASE_URL}/v2/packages")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  ok "DAR uploaded successfully (HTTP $HTTP_CODE)"
else
  warn "Upload returned HTTP $HTTP_CODE"
  echo "$BODY" | $JQ . 2>/dev/null || echo "$BODY"
fi

# =============================================================================
# Step 5: Verify package is registered
# =============================================================================
log "Verifying package registration..."

sleep 3  # Give participant time to process

PKG_AFTER=$("${HCURL[@]}" "${BASE_URL}/v2/packages" | jq '.packageIds | length' 2>/dev/null || echo "?")
log "Packages after upload: $PKG_AFTER"

if [ "$PKG_BEFORE" != "$PKG_AFTER" ]; then
  ok "New packages registered: $PKG_BEFORE -> $PKG_AFTER"
else
  warn "Package count unchanged ($PKG_AFTER) — DAR may already have been uploaded"
fi

# =============================================================================
# Step 6: Allocate parties
# =============================================================================
log "Allocating parties for InstiVault..."

allocate_party() {
  local PARTY_HINT=$1
  local DISPLAY_NAME=$2

  RESPONSE=$("${HCURL[@]}" -X POST "${BASE_URL}/v2/parties" \
    -H "Content-Type: application/json" \
    -d "{\"partyIdHint\": \"${PARTY_HINT}\", \"displayName\": \"${DISPLAY_NAME}\"}" 2>/dev/null || true)

  PARTY_ID=$(echo "$RESPONSE" | jq -r '.partyDetails.party // empty' 2>/dev/null || echo "")

  if [ -n "$PARTY_ID" ]; then
    ok "Party allocated: $DISPLAY_NAME -> $PARTY_ID"
    echo "$PARTY_ID"
  else
    warn "Party allocation for $DISPLAY_NAME may have failed or already exists"
    echo "$RESPONSE" | $JQ . 2>/dev/null || echo "$RESPONSE"
    echo ""
  fi
}

ADMIN_PARTY=$(allocate_party "instivault-admin" "InstiVault Admin")
ISSUER_PARTY=$(allocate_party "instivault-issuer" "Bond Issuer")
INVESTOR_PARTY=$(allocate_party "instivault-investor" "Institutional Investor")
AUDITOR_PARTY=$(allocate_party "instivault-auditor" "Compliance Auditor")

# =============================================================================
# Step 7: Print summary & .env values
# =============================================================================
echo ""
echo "============================================="
echo "  InstiVault Canton — Deployment Summary"
echo "============================================="
echo ""
echo "Network:    Canton DevNet L1"
echo "DAR:        ${DAR_FILE}"
echo "Ledger API: ${BASE_URL} (Host: ${LEDGER_VHOST})"
echo ""
echo "--- Parties ---"
echo "Admin:    ${ADMIN_PARTY:-<check above>}"
echo "Issuer:   ${ISSUER_PARTY:-<check above>}"
echo "Investor: ${INVESTOR_PARTY:-<check above>}"
echo "Auditor:  ${AUDITOR_PARTY:-<check above>}"
echo ""
echo "--- Export these for test-devnet.sh ---"
echo "export CANTON_PARTY_ADMIN='${ADMIN_PARTY:-}'"
echo "export CANTON_PARTY_ISSUER='${ISSUER_PARTY:-}'"
echo "export CANTON_PARTY_INVESTOR='${INVESTOR_PARTY:-}'"
echo "export CANTON_PARTY_AUDITOR='${AUDITOR_PARTY:-}'"
echo ""
echo "--- Add to your backend .env ---"
echo "CANTON_LEDGER_HOST=$(curl -s https://ifconfig.me 2>/dev/null || echo "$LEDGER_API_HOST")"
echo "CANTON_LEDGER_PORT=${LEDGER_API_PORT}"
echo "CANTON_PARTY_ADMIN=${ADMIN_PARTY:-}"
echo "CANTON_PARTY_ISSUER=${ISSUER_PARTY:-}"
echo "CANTON_PARTY_INVESTOR=${INVESTOR_PARTY:-}"
echo "CANTON_PARTY_AUDITOR=${AUDITOR_PARTY:-}"
echo ""
ok "Deployment complete! Run test-devnet.sh next."

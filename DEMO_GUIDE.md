# Metaphor — Demo Guide (ETHDenver 2026)

> Confidential & Automated RWA Hub for Institutional Finance
> 4 bounties: ADI Foundation, Canton Network, Hedera, 0G Labs

---

## Pre-Demo Checklist

```bash
# 1. Start backend
cd packages/backend && pnpm dev
# Expected: "Server running on port 3001"

# 2. Start frontend
cd packages/frontend && pnpm dev
# Expected: "Ready on http://localhost:3000"

# 3. Verify backend is live
curl http://localhost:3001/api/health
# Expected: { "status": "ok", "timestamp": "..." }

# 4. Verify ADI chain is reachable
curl -s https://rpc.ab.testnet.adifoundation.ai/ \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Expected: { "result": "0x1869f" }  (= 99999)

# 5. Verify Hedera testnet contracts exist
curl -s "https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.7996912" | python3 -m json.tool | head -5
# Expected: contract_id, evm_address, etc.
```

- [ ] MetaMask installed with ADI testnet (chain 99999, RPC: `https://rpc.ab.testnet.adifoundation.ai/`)
- [ ] Wallet funded with test ETH on ADI chain
- [ ] `.env` in `packages/backend/` has `DEV_MODE=true`
- [ ] Two browser tabs ready: app + block explorer
- [ ] Terminal open for on-chain verification

### Block Explorers

| Chain | Explorer |
|-------|---------|
| ADI Testnet (99999) | `https://explorer.ab.testnet.adifoundation.ai` |
| Hedera Testnet | `https://hashscan.io/testnet` |
| Sepolia | `https://sepolia.etherscan.io` |

---

## Demo Flow (20 min)

---

### Step 1 — Landing Page (1 min)

1. Open `http://localhost:3000`
2. Scroll slowly — glass "Metaphor" bubble transforms into the title
3. Point out partner logos at the bottom: **ADI, Canton, Ethereum, 0G Labs, OpenZeppelin**
4. Click **"Launch App"**

> "Metaphor is a confidential, automated RWA hub for institutional finance. 4 chains, 1 interface."

---

### Step 2 — Wallet Login + On-Chain RBAC (2 min)

**Goal**: Show that roles live on-chain, not in a database.

1. Click **Connect Wallet** (top-right)
2. Connect MetaMask (ADI testnet chain 99999)
3. Click **Sign In** — sign the EIP-191 message
4. Role badges appear in topbar (ADMIN, ISSUER, INVESTOR...)
5. Sidebar items change — some links disappear based on roles

**Prove it's on-chain** — open terminal:
```bash
# Read roles directly from the AccessControl contract
cast call 0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d \
  "isWhitelisted(address)(bool)" \
  YOUR_WALLET_ADDRESS \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: true
```

> "Roles are stored in our AccessControl contract on ADI chain. The backend reads `hasRole()` on-chain and embeds them in the JWT. The UI adapts — an auditor sees a completely different app than an issuer."

**Bounty: ADI** — RBAC on-chain, whitelisting

---

### Step 3 — Tokenize a Real-World Asset (3 min)

**Goal**: Create an ERC-20 RWA token with on-chain metadata. Show the tx hash.

1. Go to **Issue Asset** (`/issue`)
2. Fill:
   - Type: **Sovereign Bond**
   - Name: **France OAT 2030**
   - ISIN: **FR0014007LW0**
   - Nominal Value: **10,000,000**
   - Tokens: **10,000** (= $1,000 per token, shown in preview)
   - Coupon Rate: **2.75%**
   - Frequency: **Semi-Annual**
   - Maturity: **2030-06-15**
   - Jurisdiction: **France**
3. Click **Issue Token**
4. MetaMask pops up — confirm the tx
5. Wait for confirmation — you get redirected

**Prove it's on-chain** — in terminal after tx:
```bash
# List all tokens created by the factory
cast call 0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65 \
  "getAllTokens()(address[])" \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: array containing the new token address

# Read the RWA metadata from the new token
cast call NEW_TOKEN_ADDRESS \
  "getMetadata()((string,uint256,uint256,address))" \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: (FR0014007LW0, 275, 1907971200, ISSUER_ADDRESS)
#            ISIN          rate  maturity    issuer
```

**What the judges see**:
- Token address on ADI explorer
- `TokenCreated` event in tx logs
- ISIN, coupon rate (in bps), maturity (unix timestamp) stored on-chain — not off-chain metadata

> "This isn't a regular ERC-20 — ISIN, coupon rate, and maturity date are stored directly in the contract. The factory registers it and emits `TokenCreated`. Transfer is restricted to whitelisted addresses only."

**Bounty: ADI** — RWAToken, RWATokenFactory, fractionalization

---

### Step 4 — Create a Vault + Deposit (3 min)

**Goal**: Show vault lifecycle on-chain.

1. Go to **My Vaults** (`/vaults`)
2. Click **Create Vault**
3. Fill: Name **"Fixed Income EU"**, Strategy **Conservative**, Sovereign Bonds, $5M deposit, Low risk
4. Click **Create Vault** — MetaMask tx
5. New vault appears in the grid
6. Click into the vault — show detail page:
   - 4 KPI cards (value, return, risk, payments)
   - Asset composition table
   - Allocation donut chart

**Prove it's on-chain**:
```bash
# Read vault info
cast call 0x6b6449bDEC04dd8717AC71565C7c065680C1534f \
  "getVaultInfo(uint256)((address,bool))" 0 \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: (owner_address, true)

# Check how many vaults exist
cast call 0x6b6449bDEC04dd8717AC71565C7c065680C1534f \
  "nextVaultId()(uint256)" \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: number > 0
```

**What the judges see**:
- `VaultCreated` event in tx logs on ADI explorer
- Vault ID returned and displayed in the UI
- Multi-token vault ready for deposits

> "VaultManager handles the full lifecycle — create, deposit, withdraw, allocate. It's pausable and restricted to whitelisted addresses. Each vault can hold multiple RWA tokens."

**Bounty: ADI** — VaultManager

---

### Step 5 — AI Risk Analysis + Human-in-the-Loop (4 min)

**Goal**: Show 0G Compute inference + the HITL gate (AI never signs).

1. On any vault detail page, click **"Analyze with AI"**
2. Spinner: "0G Compute is analyzing..."
3. Report appears with:
   - **Risk score**: 42/100 (Moderate)
   - **Position Analysis**: each asset scored with color + comment
   - **Stress Tests**: 3 scenarios (e.g. "Central bank rate +1%: -2.5%")
   - **Recommendations**: "Reduce EM exposure", "Increase duration hedge" — each with **Approve** / **Reject** buttons
4. Click **Approve** on one — confirmation dialog: "You are about to approve an AI-recommended action..."
5. Click **Confirm & Execute** — status changes to "Approved"
6. Click **Reject** on another — status changes to "Rejected"
7. Go to **AI Reports** (`/ai-reports`) — show full report history with score evolution chart

**Prove the AI output is structured**:
```bash
# Fetch the raw AI report from the API
curl -s http://localhost:3001/api/v1/ai/reports | python3 -m json.tool | head -30
# Expected: structured JSON with reportId, riskScore, riskLevel,
#           recommendations[].status = "pending_approval" / "approved" / "rejected"
```

**What the judges see**:
- Structured risk report (not free text) — Zod-validated schema
- Position-level analysis per asset
- Stress test scenarios
- Approve/Reject buttons = **human-in-the-loop gate**
- The AI NEVER has signing authority — it recommends, the human decides
- "0G Compute" badge on every report

> "The AI runs on 0G Compute and returns a Zod-validated structured report — scores, position analysis, stress tests, actionable recommendations. But notice: the AI never signs anything. Every recommendation needs explicit human approval through this confirmation dialog. That's our HITL architecture."

**Bounty: 0G Labs** — 0G Compute, structured output, human-in-the-loop

---

### Step 6 — Canton Privacy Demo (4 min)

**Goal**: Show that the same vault looks different depending on who's looking. Privacy at the protocol level.

**Page: Canton Demo `/demo/canton`**

1. Navigate to **Canton Demo**
2. 3 panels show the **SAME vault** from 3 different roles simultaneously:

| What | Owner (BNP Paribas) | Counterparty (BlackRock) | Auditor (Deloitte) |
|------|--------------------|--------------------------|--------------------|
| **Vault value** | $5,200,000 | $5,200,000 | "Value hidden" |
| **Asset values** | Full (amount, allocation %) | Full | "Financial data restricted" |
| **Coupon rates** | 2.75%, 4.5% | 2.75%, 4.5% | Hidden |
| **Parties visible** | All 3 (BNP + BlackRock + Deloitte) | 2 (BNP + BlackRock) | 1 (BNP only) |
| **Trades** | All trades with full details | Only own trades | "Trade data not visible" |
| **Audit log** | Full (names, amounts, actions) | None | Anonymized (no names/amounts) |

3. Point out each difference side by side:
   - Owner: "$5.2M total" vs Auditor: lock icon + "Value hidden"
   - Owner: 3 parties listed vs Counterparty: only 2
   - Owner: full trade details vs Auditor: "Trade data not visible for this role"

**Prove it's not just UI hiding**:
```bash
# Fetch the same vault as each role — the API returns DIFFERENT data
curl -s http://localhost:3001/api/demo/canton/demo/cv-1/owner | python3 -m json.tool | grep totalValue
# Expected: "totalValue": 5200000

curl -s http://localhost:3001/api/demo/canton/demo/cv-1/auditor | python3 -m json.tool | grep totalValue
# Expected: "totalValue": null (not present)

# Auditor cannot see counterparty names
curl -s http://localhost:3001/api/demo/canton/demo/cv-1/auditor | python3 -m json.tool | grep -c "BlackRock"
# Expected: 0
```

4. Go to **Data Room** (`/data-room`) to show the production interface:
   - Authorized Parties table with role icons
   - Pending Trade Proposals with Accept/Counter/Reject
   - Invite Party dialog

> "This is native Daml on Canton — not a wrapper. ConfidentialVault, PrivateTrade, and AuditRight are 3 Daml modules with 9 templates. Visibility is enforced at the ledger protocol level — the auditor's transaction tree literally doesn't contain counterparty names or trade terms. It's not hidden in the UI, it's not in the data."

**Bounty: Canton** — Native Daml, 9 templates, visibility separation

---

### Step 7 — Hedera Yield Calendar (2 min)

**Goal**: Show coupon payments scheduled via Hedera's Schedule Service precompile.

1. Go to **Yield Calendar** (`/yield-calendar`)
2. Show the **4 summary cards**: Total Distributed, Upcoming Total, Completed, Scheduled
3. **Timeline view**: vertical chronological timeline
   - Green checks = past completed payments
   - "Now — Feb 2026" marker
   - Dashed circles = future scheduled payments
4. Switch to **Upcoming** tab — list with "in N days" badges
5. Switch to **Completed** tab — list with amounts

**Prove the bonds exist on Hedera**:
```bash
# Read bond count from CouponScheduler on Hedera testnet
cast call 0x00000000000000000000000000000000007a05f0 \
  "bondCount()(uint256)" \
  --rpc-url https://testnet.hashio.io/api
# Expected: 2 (France OAT 2028 + US Treasury 10Y)

# Read bond details
cast call 0x00000000000000000000000000000000007a05f0 \
  "getBond(uint256)((address,address,uint256,uint256,uint8,uint256,uint256,address,bool))" 0 \
  --rpc-url https://testnet.hashio.io/api
# Expected: bond struct with token, faceValue, rate, frequency, startDate, maturity

# View contracts on HashScan
# CouponScheduler: https://hashscan.io/testnet/contract/0.0.7996912
# YieldDistributor: https://hashscan.io/testnet/contract/0.0.7996914
```

> "CouponScheduler calls Hedera's Schedule Service precompile at address 0x16b — that's the IHRC755 and IHRC1215 interfaces. It computes payment dates from bond parameters and creates scheduled on-chain transactions. When the date arrives, the coupon is distributed pro-rata via YieldDistributor. All from Solidity."

**Bounty: Hedera** — Schedule Service precompile from smart contract

---

### Step 8 — Admin: KYC + Roles + White-Label (2 min)

**Goal**: Show on-chain RBAC management + multi-tenant white-label.

1. Go to **Administration** (`/admin`)
2. **Roles & Permissions**: 4 role cards with member counts
3. **Wallet Whitelist table**:
   - Find a wallet with **KYC: Pending**
   - Click **Approve KYC** — triggers `addToWhitelist()` on ADI chain
   - Badge changes to **Verified** with green check
4. Click **Add Wallet** — add a new address with Issuer role
   - This triggers 2 on-chain txs: `addToWhitelist()` + `grantRole()`

**Prove it's on-chain**:
```bash
# After approving KYC, verify the address is whitelisted
cast call 0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d \
  "isWhitelisted(address)(bool)" \
  THE_APPROVED_ADDRESS \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: true

# Check the role was granted
cast call 0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d \
  "hasRole(bytes32,address)(bool)" \
  $(cast keccak "ISSUER_ROLE") THE_ADDRESS \
  --rpc-url https://rpc.ab.testnet.adifoundation.ai/
# Expected: true
```

5. **White-Label Config**: Change institution name + primary color, show live preview

> "Each institution gets its own isolated deployment via InstitutionRegistry — with 2-of-N multisig governance. That's propose, approve, execute. Full white-label."

**Bounty: ADI** — RBAC, whitelisting, white-label, multisig

---

## Deployed Contracts (Copy-Paste for Judges)

### ADI Chain (99999)

| Contract | Address | Explorer |
|----------|---------|---------|
| AccessControl | `0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d) |
| RWATokenFactory | `0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65) |
| VaultManager | `0x6b6449bDEC04dd8717AC71565C7c065680C1534f` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0x6b6449bDEC04dd8717AC71565C7c065680C1534f) |
| InstitutionRegistry | `0xAB3Cbc56D958245a2688b2171417679e743B1daF` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0xAB3Cbc56D958245a2688b2171417679e743B1daF) |

### Hedera Testnet

| Contract | Account | EVM Address | Explorer |
|----------|---------|-------------|---------|
| CouponScheduler | `0.0.7996912` | `0x...7a05f0` | [View](https://hashscan.io/testnet/contract/0.0.7996912) |
| YieldDistributor | `0.0.7996914` | `0x...7a05f2` | [View](https://hashscan.io/testnet/contract/0.0.7996914) |

### Canton

| Module | Templates | Tests |
|--------|-----------|-------|
| ConfidentialVault | ConfidentialVault, VaultInvitation, VaultAccessRight, TradeRequest, TradeSettlement | 28 passing |
| PrivateTrade | TradeProposal, TradeAgreement | |
| AuditRight | AuditInvitation, AuditRight | |

---

## Test Results

```bash
# ADI contracts
cd packages/contracts-adi && forge test
# 111 tests passing

# Hedera contracts
cd packages/contracts-hedera && forge test
# 74 tests passing

# Canton/Daml
cd packages/contracts-canton && daml test
# 28 tests passing
```

---

## Bounty Cheat Sheet

| Bounty | What They Want | What We Show | Killer Line |
|--------|---------------|-------------|-------------|
| **ADI** | MVP on ADI chain, real utility, white-label, RBAC | Live tokenization tx + vault creation tx + whitelist tx on chain 99999 | "Multi-tenant InstitutionRegistry with 2-of-N multisig — each institution gets isolated contracts" |
| **Canton** | Native Daml, deployed on devnet, visibility separation | 3-panel same-vault demo, curl showing different API responses per role | "The auditor's transaction tree doesn't contain the data — it's not hidden, it doesn't exist" |
| **Hedera** | Schedule Service usage, coupon payments from smart contract | Bonds on HashScan, payment timeline, `scheduleCoupon()` calling precompile 0x16b | "Coupon scheduling happens in Solidity via the Schedule Service precompile — not from a backend script" |
| **0G Labs** | 0G Compute inference, structured decisions, HITL | Live analysis, Zod-validated report, approve/reject buttons | "The AI never has signing authority — every on-chain action requires explicit human approval" |

---

## If Something Goes Wrong

| Problem | Quick Fix |
|---------|----------|
| "Missing Authorization header" | Run: `curl -X POST http://localhost:3001/api/auth/dev-login -H "Content-Type: application/json" -d '{"address":"0x1"}'` → copy token → `localStorage.setItem('metaphor_jwt','TOKEN')` in browser console |
| MetaMask wrong network | Add ADI testnet: chain 99999, RPC `https://rpc.ab.testnet.adifoundation.ai/` |
| Tx fails (insufficient funds) | Get test ETH from ADI testnet faucet |
| AI analysis slow | Set `ZG_USE_MOCK=true` in backend `.env` and restart |
| Canton demo shows mock data | That's fine — the demo data shows the same privacy model. Canton sandbox is optional |
| "Restricted Access" on a page | Wrong role — use dev-login for all roles |
| Hedera tx reverts | Admin address must be ECDSA alias, not long-zero format (see CLAUDE.md) |
| Backend crashes on start | Check `pnpm install` was run, check `.env` exists |

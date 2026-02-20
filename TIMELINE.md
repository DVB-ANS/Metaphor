# Outward — Roadmap (3 Devs)

## Git Workflow

```
main              ← stable, deployable
├── develop       ← integration branch (merge PRs here)
│   ├── feat/adi-*        ← Dev A branches
│   ├── feat/hedera-*     ← Dev A branches
│   ├── feat/canton-*     ← Dev B branches
│   ├── feat/ai-*         ← Dev B branches
│   ├── feat/frontend-*   ← Dev C branches
│   └── feat/backend-*    ← Dev C branches
```

**Rules:**
- Always branch from `develop`
- PR into `develop`, never directly into `main`
- `main` is updated only when `develop` is stable (before demo, before submission)
- Prefix commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
---

## Team Split

| Dev | Scope | Packages |
|-----|-------|----------|
| **Dev A** | Solidity — ADI + Hedera | `contracts-adi/`, `contracts-hedera/` |
| **Dev B** | Daml + AI — Canton + 0G Labs | `contracts-canton/`, `ai-engine/` |
| **Dev C** | Web — Frontend + Backend API | `frontend/`, `backend/` |

---

## Phase 0 — Project Setup (All)

- [x] Initialize monorepo structure (`packages/`)
- [x] Setup package manager and workspace configuration
- [x] Configure shared tooling (TypeScript, linting, formatting)
- [x] Setup environment variables template (`.env.example`)
- [x] Initialize git repository and `.gitignore`
- [x] Create `develop` branch from `main`

---

## Phase 1 — Core Contracts & Scaffolding (Parallel)

> All 3 devs work simultaneously on their own packages.

### Dev A — ADI Contracts `feat/adi-core`
- [x] Implement `InstiVaultAccessControl.sol` — Roles: Admin, Issuer, Investor, Auditor + whitelisting
- [x] Implement `RWATokenFactory.sol` — ERC-20 mint with on-chain metadata (ISIN, rate, maturity, issuer)
- [x] Implement `RWAToken.sol` — ERC-20 with whitelist transfer restrictions + burn-at-maturity
- [x] Implement `VaultManager.sol` — Vault creation, deposit, withdrawal, allocation + Pausable
- [x] Implement `InstitutionRegistry.sol` — Multi-tenant white-label + 2-of-N multisig
- [x] Implement `InstitutionDeployer.sol` — External deployer (EIP-170 workaround)
- [x] Whitelist-gated transfers (KYC wallets only)
- [x] Unit tests (111 tests passing)
- [x] Deployed to Sepolia + ADI Chain (99999)
- [x] ABIs exported to `abi/` for backend
- [x] PR → `develop`

### Dev B — Canton Templates `feat/canton-core`
- [x] Install Daml SDK, configure project
- [x] Implement `ConfidentialVault` — Vault visible only to authorized parties
- [x] Implement `PrivateTrade` — Bilateral offer/counter-offer
- [x] Implement `AuditRight` — Limited audit view for third parties
- [x] Daml script tests for each template
- [x] PR → `develop`

### Dev C — Frontend Scaffold + Backend Init `feat/frontend-scaffold`
- [x] Initialize Next.js + TailwindCSS (`packages/frontend/`)
- [x] Configure wallet connection (RainbowKit + WalletConnect) — SSR-safe
- [x] Setup routing, layout (sidebar + main content), navigation
- [x] Build static **Dashboard** page (mock data)
- [x] Build static **Issue Asset** form page (mock data)
- [x] Setup Express/Node.js backend (`packages/backend/`)
- [x] PR → `develop`

---

## Phase 2 — Extended Logic (Parallel)

> Devs continue on their scope, adding business logic.

### Dev A — Hedera Contracts `feat/hedera-core`
- [x] Implement `CouponScheduler.sol` — Scheduled transactions via Hedera Schedule Service precompile (0x16b)
- [x] Compute payment dates from bond parameters (rate, frequency, maturity)
- [x] Ensure scheduling is initiated from the smart contract (not off-chain)
- [x] Implement `YieldDistributor.sol` — Pro-rata distribution to token holders
- [x] Snapshot mechanism (recalculate shares if tokens transferred between coupons)
- [x] Access control on `executeCoupon` (self-call / issuer / owner)
- [x] Pausable on scheduling operations
- [x] Unit tests (74 tests passing)
- [x] Deployed to Hedera Testnet
- [x] ABIs exported to `abi/` for backend
- [x] PR → `develop`

### Dev A — ADI Token Logic `feat/adi-token-logic`
- [x] Fractionnement logic (split asset into N tokens)
- [x] Burn-at-maturity mechanism (auto burn + nominal reimbursement)
- [x] Final payment: last coupon + nominal + token burn
- [x] Integration tests (mint → transfer → burn full lifecycle)
- [x] Demo script (`script/Demo.s.sol`) — full flow on Sepolia
- [x] PR → `develop`

### Dev B — Canton Visibility Model `feat/canton-visibility`
- [x] Implement `Owner` visibility (full access)
- [x] Implement `Counterparty` visibility (composition + trade proposals)
- [x] Implement `Auditor` visibility (compliance-only read access)
- [x] Verify unauthorized parties see nothing
- [x] Test multi-party scenarios (3 parties with different views)
- [x] PR → `develop`

### Dev B — AI Engine `feat/ai-risk-analyzer`
- [x] Configure 0G Compute client (`0g-client.ts`)
- [x] Implement `risk-analyzer.ts` — Composite risk score (1-100)
- [x] Implement `strategy-simulator.ts` — Stress testing (rate changes, defaults, crises)
- [x] Generate actionable recommendations (rebalance, exit, add collateral)
- [x] Test with mock vault data
- [x] Fallback: mock inference if 0G SDK is unstable
- [x] PR → `develop`

### Dev C — Frontend Pages `feat/frontend-pages`
- [x] **My Vaults** page — Vault list with filters (risk, asset type, status)
- [x] **Vault Detail** page — Composition, yield history, chart, "Analyze with AI" button
- [x] **Data Room** page — Canton vault management (invitations, access levels, negotiations)
- [x] **Yield Calendar** page — Calendar view of Hedera payments
- [x] **AI Reports** page — Analysis history, score evolution, PDF export
- [x] **Administration** page — RBAC management, wallet whitelist, white-label config
- [ ] Replace mock data with real API calls (currently 100% mock)
- [x] PR → `develop`

---

## Phase 3 — Backend Bridges & Contract Wiring (Parallel)

> Connect frontend to contracts through the backend API.

### Dev A — Hedera Edge Cases + Deploy `feat/hedera-edge-cases`
- [x] Insufficient liquidity handling (suspend payment, alert issuer + investors)
- [x] No silent partial execution (all-or-nothing)
- [x] End-to-end test: schedule → execute → verify balances
- [x] Deploy ADI contracts to ADI chain + Sepolia
- [x] Deploy Hedera contracts to Hedera Testnet
- [x] PR → `develop`

### Dev B — Canton Deploy + AI Human-in-the-Loop `feat/canton-deploy`
- [ ] Deploy Daml templates to Canton Devnet L1
- [x] Ensure AI never auto-executes transactions
- [x] Every AI recommendation requires explicit user confirmation
- [x] Validate structured output format (score, recommendations, stress test)
- [x] PR → `develop`

### Dev C — Backend API Bridges `feat/backend-bridges`
- [x] ADI bridge — Tokenization + vault + institution endpoints
- [x] Canton bridge — Proxy for Daml ledger API (vault creation, invitations, trades)
- [x] Hedera bridge — Coupon scheduling + payment status + yield endpoints
- [x] 0G bridge — Trigger AI analysis and return structured results
- [x] Fix ESM __dirname issue for ABI loading
- [ ] Authentication middleware (wallet-based)
- [ ] Role verification middleware (check RBAC from ADI contracts)
- [x] PR → `develop`

---

## Phase 4 — Integration & Wiring (All together)

> All devs work on connecting their layers into the frontend.

### Dev C (lead) + Dev A — ADI + Hedera Frontend Integration `feat/frontend-adi-hedera`
- [ ] Wire **Issue Asset** form to ADI `RWATokenFactory` via backend
- [ ] Wire **My Vaults** to `VaultManager` via backend
- [ ] Wire **Yield Calendar** to Hedera `CouponScheduler` via backend
- [ ] Live data on **Dashboard** (total value, vault count, upcoming payments)
- [ ] PR → `develop`

### Dev C (lead) + Dev B — Canton + AI Frontend Integration `feat/frontend-canton-ai`
- [ ] Wire **Data Room** page to Canton Daml via backend
- [ ] Wire **Vault Detail** → "Analyze with AI" to 0G via backend
- [ ] Wire **AI Reports** page to display structured results
- [ ] Human-in-the-loop UI: confirm/reject buttons on AI recommendations
- [ ] PR → `develop`

### Dev A + Dev B — RBAC + White-Label `feat/adi-rbac-whitelabel`
- [x] Multi-tenant registry (InstitutionRegistry — each institution gets isolated contracts)
- [x] Role-based function access modifiers across all contracts
- [x] Multisig (2-of-N approval for institution registration)
- [x] PR → `develop`

---

## Phase 5 — Role-Based Views & Polish (All together)

### Dev C — Role-Based Views `feat/frontend-roles`
- [ ] Admin view (full access)
- [ ] Issuer view (own assets only)
- [ ] Investor view (own vaults only)
- [ ] Auditor view (compliance-limited)
- [ ] PR → `develop`

### All — UX & Polish `feat/polish`
- [ ] Notification system (48h before payments, post-execution confirmation)
- [ ] Loading states and error handling
- [ ] Responsive design
- [ ] PR → `develop`

---

## Phase 6 — End-to-End Testing (All together)

- [ ] Full flow: tokenize (ADI) → create vault (Canton) → schedule coupons (Hedera) → analyze (0G)
- [ ] Multi-party demo: 3 users with different roles seeing different data
- [ ] Verify bounty compliance for each sponsor (ADI, Canton, Hedera, 0G)
- [ ] Fix bugs and edge cases found during testing
- [ ] Merge `develop` → `main`

---

## Phase 7 — Deliverables (All together)

- [ ] Public GitHub repository with complete documentation
- [ ] Live demo URL (deploy frontend on Vercel)
- [ ] README with setup instructions, architecture, privacy model
- [ ] `BOUNTY_COMPLIANCE.md` — Mapping bounties to implemented features
- [ ] Demo video (< 3 min) covering the full product flow

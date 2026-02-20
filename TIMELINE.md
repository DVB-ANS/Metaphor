# InstiVault — Roadmap (3 Devs)

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
| **Dev C** | Web — Frontend + Backend API | `frontend/`, `backend/` (to create) |

---

## Phase 0 — Project Setup (All)

- [x] Initialize monorepo structure (`packages/`)
- [x] Setup package manager and workspace configuration
- [x] Configure shared tooling (TypeScript, linting, formatting)
- [x] Setup environment variables template (`.env.example`)
- [x] Initialize git repository and `.gitignore`
- [ ] Create `develop` branch from `main`

---

## Phase 1 — Core Contracts & Scaffolding (Parallel)

> All 3 devs work simultaneously on their own packages.

### Dev A — ADI Contracts `feat/adi-core`
- [ ] Implement `AccessControl.sol` — Roles: Admin, Issuer, Investor, Auditor
- [ ] Implement `RWATokenFactory.sol` — ERC-20 mint with on-chain metadata (ISIN, rate, maturity, issuer)
- [ ] Implement `VaultManager.sol` — Vault creation, deposit, withdrawal, allocation
- [ ] Whitelist-gated transfers (KYC wallets only)
- [ ] Unit tests for all 3 contracts
- [ ] PR → `develop`

### Dev B — Canton Templates `feat/canton-core`
- [ ] Install Daml SDK, configure project
- [ ] Implement `ConfidentialVault` — Vault visible only to authorized parties
- [ ] Implement `PrivateTrade` — Bilateral offer/counter-offer
- [ ] Implement `AuditRight` — Limited audit view for third parties
- [ ] Daml script tests for each template
- [ ] PR → `develop`

### Dev C — Frontend Scaffold + Backend Init `feat/frontend-scaffold`
- [ ] Initialize Next.js + TailwindCSS (`packages/frontend/`)
- [ ] Configure wallet connection (WalletConnect / MetaMask)
- [ ] Setup routing, layout (sidebar + main content), navigation
- [ ] Build static **Dashboard** page (mock data)
- [ ] Build static **Issue Asset** form page (mock data)
- [ ] Setup Express/Node.js backend (`packages/backend/`)
- [ ] PR → `develop`

---

## Phase 2 — Extended Logic (Parallel)

> Devs continue on their scope, adding business logic.

### Dev A — Hedera Contracts `feat/hedera-core`
- [ ] Implement `CouponScheduler.sol` — Scheduled transactions via Hedera Schedule Service
- [ ] Compute payment dates from bond parameters (rate, frequency, maturity)
- [ ] Ensure scheduling is initiated from the smart contract (not off-chain)
- [ ] Implement `YieldDistributor.sol` — Pro-rata distribution to token holders
- [ ] Snapshot mechanism (recalculate shares if tokens transferred between coupons)
- [ ] Unit tests for scheduling + distribution
- [ ] PR → `develop`

### Dev A — ADI Token Logic `feat/adi-token-logic`
- [ ] Fractionnement logic (split asset into N tokens)
- [ ] Burn-at-maturity mechanism (auto burn + nominal reimbursement)
- [ ] Final payment: last coupon + nominal + token burn
- [ ] Integration tests (mint → transfer → burn full lifecycle)
- [ ] PR → `develop`

### Dev B — Canton Visibility Model `feat/canton-visibility`
- [ ] Implement `Owner` visibility (full access)
- [ ] Implement `Counterparty` visibility (composition + trade proposals)
- [ ] Implement `Auditor` visibility (compliance-only read access)
- [ ] Verify unauthorized parties see nothing
- [ ] Test multi-party scenarios (3 parties with different views)
- [ ] PR → `develop`

### Dev B — AI Engine `feat/ai-risk-analyzer`
- [ ] Configure 0G Compute client (`0g-client.ts`)
- [ ] Implement `risk-analyzer.ts` — Composite risk score (1-100)
- [ ] Implement `strategy-simulator.ts` — Stress testing (rate changes, defaults, crises)
- [ ] Generate actionable recommendations (rebalance, exit, add collateral)
- [ ] Test with mock vault data
- [ ] Fallback: mock inference if 0G SDK is unstable
- [ ] PR → `develop`

### Dev C — Frontend Pages `feat/frontend-pages`
- [ ] **My Vaults** page — Vault list with filters (risk, asset type, status)
- [ ] **Vault Detail** page — Composition, yield history, chart, "Analyze with AI" button
- [ ] **Data Room** page — Canton vault management (invitations, access levels, negotiations)
- [ ] **Yield Calendar** page — Calendar view of Hedera payments
- [ ] **AI Reports** page — Analysis history, score evolution, PDF export
- [ ] **Administration** page — RBAC management, wallet whitelist, white-label config
- [ ] PR → `develop`

---

## Phase 3 — Backend Bridges & Contract Wiring (Parallel)

> Connect frontend to contracts through the backend API.

### Dev A — Hedera Edge Cases + Deploy `feat/hedera-edge-cases`
- [ ] Insufficient liquidity handling (suspend payment, alert issuer + investors)
- [ ] No silent partial execution
- [ ] End-to-end test: schedule → execute → verify balances
- [ ] Deploy ADI contracts to ADI chain
- [ ] Deploy Hedera contracts to Hedera Testnet
- [ ] PR → `develop`

### Dev B — Canton Deploy + AI Human-in-the-Loop `feat/canton-deploy`
- [ ] Deploy Daml templates to Canton Devnet L1
- [ ] Ensure AI never auto-executes transactions
- [ ] Every AI recommendation requires explicit user confirmation
- [ ] Validate structured output format (score, recommendations, stress test)
- [ ] PR → `develop`

### Dev C — Backend API Bridges `feat/backend-bridges`
- [ ] ADI bridge — Tokenization + vault endpoints
- [ ] Canton bridge — Proxy for Daml ledger API (vault creation, invitations, trades)
- [ ] Hedera bridge — Coupon scheduling + payment status endpoints
- [ ] 0G bridge — Trigger AI analysis and return structured results
- [ ] Authentication middleware (wallet-based)
- [ ] Role verification middleware (check RBAC from ADI contracts)
- [ ] PR → `develop`

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
- [ ] Multi-tenant registry (each institution gets its own namespace)
- [ ] Role-based function access modifiers across all contracts
- [ ] Multisig or admin-gated critical operations
- [ ] PR → `develop`

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

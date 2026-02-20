# InstiVault — Roadmap

## Phase 0 — Project Setup

- [ ] Initialize monorepo structure (`packages/`)
- [ ] Setup package manager and workspace configuration
- [ ] Configure shared tooling (TypeScript, linting, formatting)
- [ ] Setup environment variables template (`.env.example`)
- [ ] Initialize git repository and `.gitignore`

---

## Phase 1 — Smart Contracts: ADI Foundation (Tokenization)

### 1.1 — Core Contracts
- [ ] Setup Foundry project (`packages/contracts-adi/`)
- [ ] Implement `AccessControl.sol` — Role management (Admin, Issuer, Investor, Auditor)
- [ ] Implement `RWATokenFactory.sol` — ERC-20 token creation with on-chain metadata (ISIN, rate, maturity, issuer)
- [ ] Implement `VaultManager.sol` — Vault creation, deposit, withdrawal, allocation

### 1.2 — Token Logic
- [ ] Fractionnement logic (split asset into N tokens)
- [ ] Whitelist-gated transfers (KYC-validated wallets only)
- [ ] Burn-at-maturity mechanism (auto burn + nominal reimbursement)

### 1.3 — White-Label & RBAC
- [ ] Multi-tenant registry (each institution gets its own namespace)
- [ ] Role-based function access modifiers
- [ ] Multisig or admin-gated critical operations

### 1.4 — Testing & Deployment
- [ ] Unit tests for all contracts
- [ ] Integration tests (mint → transfer → burn lifecycle)
- [ ] Deploy to ADI chain

---

## Phase 2 — Smart Contracts: Canton Network (Confidentiality)

### 2.1 — Daml Setup
- [ ] Install Daml SDK and configure project (`packages/contracts-canton/`)
- [ ] Learn Daml basics (templates, choices, visibility model)

### 2.2 — Daml Templates
- [ ] Implement `ConfidentialVault` — Vault visible only to authorized parties
- [ ] Implement `PrivateTrade` — Bilateral offer/counter-offer system
- [ ] Implement `AuditRight` — Limited audit view for third parties

### 2.3 — Visibility Model
- [ ] Implement `Owner` visibility (full access)
- [ ] Implement `Counterparty` visibility (composition + trade proposals)
- [ ] Implement `Auditor` visibility (compliance-only read access)
- [ ] Verify that unauthorized parties see nothing

### 2.4 — Testing & Deployment
- [ ] Daml script tests for each template
- [ ] Test multi-party scenarios (3 parties with different views)
- [ ] Deploy to Canton Devnet L1

---

## Phase 3 — Smart Contracts: Hedera (Automation)

### 3.1 — Hedera Setup
- [ ] Setup Hedera project (`packages/contracts-hedera/`)
- [ ] Configure Hedera SDK and testnet credentials

### 3.2 — Coupon Scheduling
- [ ] Implement `CouponScheduler.sol` — Create scheduled transactions via Hedera Schedule Service
- [ ] Compute payment dates from bond parameters (rate, frequency, maturity)
- [ ] Ensure scheduling is initiated from the smart contract (not off-chain script)

### 3.3 — Yield Distribution
- [ ] Implement `YieldDistributor.sol` — Pro-rata distribution to token holders
- [ ] Snapshot mechanism (recalculate shares if tokens were transferred between coupons)
- [ ] Final payment: last coupon + nominal reimbursement + token burn

### 3.4 — Edge Cases
- [ ] Insufficient liquidity handling (suspend payment, alert issuer + investors)
- [ ] No silent partial execution

### 3.5 — Testing & Deployment
- [ ] Unit tests for scheduling and distribution logic
- [ ] End-to-end test: schedule → execute → verify balances
- [ ] Deploy to Hedera Testnet

---

## Phase 4 — AI Engine: 0G Labs (Risk Analysis)

### 4.1 — 0G Setup
- [ ] Setup AI module (`packages/ai-engine/`)
- [ ] Configure 0G Compute client (`0g-client.ts`)

### 4.2 — Risk Analyzer
- [ ] Implement `risk-analyzer.ts` — Composite risk score (1-100)
- [ ] Input: vault composition, ratings, duration, historical volatility
- [ ] Output: per-position risk score + global score

### 4.3 — Strategy Simulator
- [ ] Implement `strategy-simulator.ts` — Stress testing
- [ ] Scenarios: interest rate changes, issuer default, sector crisis
- [ ] Quantified impact on vault value

### 4.4 — Recommendations
- [ ] Generate actionable recommendations (rebalance, add collateral, exit position)
- [ ] Link each recommendation to executable action

### 4.5 — Human-in-the-Loop
- [ ] Ensure AI never auto-executes transactions
- [ ] Every recommendation requires explicit user confirmation

### 4.6 — Testing
- [ ] Test with mock vault data
- [ ] Validate structured output format
- [ ] Fallback: mock inference if 0G SDK is unstable

---

## Phase 5 — Backend API (Orchestration Layer)

- [ ] Setup Express/Node.js project
- [ ] ADI bridge — Expose tokenization + vault endpoints
- [ ] Canton bridge — Proxy for Daml ledger API (vault creation, invitations, trades)
- [ ] Hedera bridge — Expose coupon scheduling + payment status
- [ ] 0G bridge — Trigger AI analysis and return structured results
- [ ] Authentication middleware (wallet-based)
- [ ] Role verification middleware (check RBAC from ADI contracts)

---

## Phase 6 — Frontend (Institutional Dashboard)

### 6.1 — Project Setup
- [ ] Initialize Next.js + TailwindCSS (`packages/frontend/`)
- [ ] Configure wallet connection (WalletConnect / MetaMask)
- [ ] Setup routing and layout (sidebar + main content)

### 6.2 — Pages
- [ ] **Dashboard** — Total value, vault count, upcoming payments, alerts
- [ ] **My Vaults** — Vault list with filters (risk, asset type, status)
- [ ] **Vault Detail** — Composition, yield history, chart, "Analyze with AI" button
- [ ] **Issue Asset** — Tokenization form (type, amount, rate, maturity, jurisdiction)
- [ ] **Data Room** — Canton vault management (invitations, access levels, negotiations)
- [ ] **Yield Calendar** — Calendar view of automated Hedera payments
- [ ] **AI Reports** — Analysis history, score evolution, PDF export
- [ ] **Administration** — RBAC management, wallet whitelist, white-label config

### 6.3 — Role-Based Views
- [ ] Admin view (full access)
- [ ] Issuer view (own assets only)
- [ ] Investor view (own vaults only)
- [ ] Auditor view (compliance-limited)

### 6.4 — UX Polish
- [ ] Notification system (48h before payments, post-execution confirmation)
- [ ] Loading states and error handling
- [ ] Responsive design

---

## Phase 7 — Integration & End-to-End Testing

- [ ] Full flow: tokenize (ADI) → create vault (Canton) → schedule coupons (Hedera) → analyze (0G)
- [ ] Multi-party demo: 3 users with different roles seeing different data
- [ ] Verify bounty compliance for each sponsor (ADI, Canton, Hedera, 0G)

---

## Phase 8 — Deliverables

- [ ] Public GitHub repository with complete documentation
- [ ] Live demo URL (deploy frontend on Vercel)
- [ ] README with setup instructions, architecture, privacy model
- [ ] Demo video (< 3 min) covering the full product flow
- [ ] `BOUNTY_COMPLIANCE.md` — Mapping bounties to implemented features

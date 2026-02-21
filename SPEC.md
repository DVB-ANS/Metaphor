# Metaphor — Project Specification

> Version 1.0 — February 21, 2026
> ETHDenver 2026 — New France Village Track

---

## 1. Purpose and Goals

Metaphor is a confidential, automated Real World Assets (RWA) hub designed for institutional finance. It allows asset managers, private banks, and family offices to tokenize, trade, automate, and analyze real-world assets across four blockchain/compute layers from a single dashboard.

### Problem Statement

Institutions tokenizing real-world assets (bonds, invoices, real estate) face three obstacles:

1. **Confidentiality** — Investment strategies and portfolio data are exposed on public blockchains.
2. **Automation** — Yield/coupon payments depend on centralized off-chain servers (cron jobs), creating single points of failure.
3. **Intelligence** — Risk analysis of RWA portfolios remains manual and fragmented.

### Solution

A unified platform where institutions can:

- **Tokenize** RWAs on a dedicated chain (ADI) with on-chain metadata (ISIN, coupon rate, maturity)
- **Negotiate** assets in confidential data rooms (Canton/Daml) with party-scoped visibility
- **Automate** coupon and yield payments deterministically on-chain (Hedera Schedule Service)
- **Analyze** vault risk via AI (0G Compute) with human-in-the-loop approval

### Bounty Targets

| Bounty | Sponsor | Core Requirement |
|--------|---------|------------------|
| ADI Foundation | ADI | MVP on ADI chain, real economic utility, white-label ready, RBAC/multisig |
| Canton Network | Canton | Native Daml contracts, deployed on Devnet L1, visibility separation demo |
| Hedera | Hedera | Schedule Service usage, coupon payments initiated from smart contract |
| 0G Labs | 0G | 0G Compute inference, structured decisions, human-in-the-loop approval |

---

## 2. Features

### F1 — Asset Tokenization (ADI Chain)

| Feature | Description |
|---------|-------------|
| **Token creation** | ERC-20 tokens with on-chain RWA metadata: ISIN, coupon rate (bps), maturity date (unix), issuer address |
| **Fractionalization** | Split a parent token into N child tokens (e.g., $1M bond into 1,000 x $1,000 tokens) |
| **Whitelist-gated transfers** | Only KYC-verified wallets (whitelisted on-chain) can send or receive tokens |
| **Burn at maturity** | Tokens are automatically burned at maturity; nominal is reimbursed |
| **Asset registry** | Factory maintains a list of all created tokens, queryable on-chain |
| **Token metadata** | `getMetadata()` returns ISIN, rate, maturity, issuer — stored in the contract, not off-chain |

### F2 — Confidential Vaults & Data Rooms (Canton/Daml)

| Feature | Description |
|---------|-------------|
| **Confidential vault creation** | Vault visible only to authorized parties; public sees nothing |
| **Party invitation** | Owner invites counterparties and auditors with scoped access |
| **Visibility levels** | Owner (full), Counterparty (composition + trades), Auditor (compliance only), Public (nothing) |
| **Private trading** | Bilateral offer/counter-offer negotiation visible only to the two parties |
| **Audit rights** | Limited third-party audit access — aggregate data only, no counterparty names or trade terms |
| **Immutable audit log** | Every action logged at the ledger level, visible only to authorized parties |

### F3 — Automated Coupon Payments (Hedera)

| Feature | Description |
|---------|-------------|
| **Bond registration** | Register a bond with token address, face value, rate, frequency, start date, maturity |
| **Payment date computation** | Auto-compute all payment dates from bond parameters (monthly/quarterly/semi-annual/annual) |
| **Schedule Service integration** | `scheduleCoupon()` calls Hedera precompile 0x16b (IHRC755 + IHRC1215) from Solidity |
| **Pro-rata distribution** | YieldDistributor snapshots holder balances and distributes yield proportionally |
| **Insufficient liquidity handling** | Payment suspended (not partially executed); alert emitted to issuer and investors |
| **Claim mechanism** | Holders claim their yield from snapshots |

### F4 — AI Risk Analysis (0G Labs)

| Feature | Description |
|---------|-------------|
| **On-demand analysis** | User clicks "Analyze this vault" — inference runs on 0G Compute |
| **Structured output** | Zod-validated report: global risk score (1-100), risk level, position analysis, recommendations, stress tests |
| **Stress testing** | Simulates macro scenarios (rate changes, issuer defaults, sector crises) with impact percentages |
| **Recommendations** | Actionable suggestions (rebalance, exit, add collateral) with approve/reject buttons |
| **Human-in-the-loop** | AI never has signing authority — every recommendation requires explicit user approval |
| **Mock fallback** | `ZG_USE_MOCK=true` enables deterministic mock analysis when 0G Compute is unavailable |
| **Report persistence** | Reports stored in JSON with reportId, status tracking (pending/approved/rejected) |

### F5 — Institutional Dashboard (Frontend)

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Scroll-animated hero with 4 feature sections; "Launch App" CTA |
| Dashboard | `/app` | Portfolio overview: total value, vault count, upcoming payments, latest AI analysis |
| My Vaults | `/vaults` | Vault list with filters (risk, type, status); links to detail |
| Vault Detail | `/vaults/[id]` | Composition, yield history, allocation chart, AI analysis panel |
| Issue Asset | `/issue` | Tokenization form (type, ISIN, nominal, rate, frequency, maturity, jurisdiction) |
| Data Room | `/data-room` | Canton vault management: parties, access levels, trade proposals |
| Yield Calendar | `/yield-calendar` | Timeline of past/upcoming Hedera payments with summary cards |
| AI Reports | `/ai-reports` | Report history, score evolution chart, approve/reject per recommendation |
| Administration | `/admin` | RBAC management, wallet whitelist, white-label configuration |
| Canton Demo | `/demo/canton` | 3-panel side-by-side view showing the same vault as Owner/Counterparty/Auditor |

### F6 — Role-Based Access Control

| Role | Can Issue | Can Invest | Can Audit | Can Administer | Confidential Data |
|------|-----------|------------|-----------|----------------|-------------------|
| Admin | Yes | Yes | Yes | Yes | All |
| Issuer | Yes | No | No | No | Own assets |
| Investor | No | Yes | No | No | Own vaults |
| Auditor | No | No | Yes | No | Compliance view only |

- Roles stored on-chain in `InstiVaultAccessControl` contract
- Backend reads roles via `hasRole()` and embeds them in JWT
- Frontend adapts UI based on JWT roles (sidebar items, page access)
- `RoleGate` component blocks unauthorized access with "Restricted Access" message

### F7 — Multi-Tenant White-Label

| Feature | Description |
|---------|-------------|
| **Institution registry** | Each institution gets isolated contracts via `InstitutionRegistry` |
| **2-of-N multisig** | Institution registration requires propose → approve → execute flow |
| **Branding** | Configurable institution name, primary color, logo, domain |
| **External deployer** | `InstitutionDeployer` works around EIP-170 bytecode limit |

### F8 — Authentication

| Feature | Description |
|---------|-------------|
| **Wallet-based auth** | Nonce generation → EIP-191 signature → JWT (24h expiry) |
| **Role embedding** | JWT contains on-chain roles fetched via `hasRole()` |
| **Dev mode** | `POST /api/auth/dev-login` returns JWT with all 4 roles (when `DEV_MODE=true`) |
| **Session restore** | JWT stored in localStorage, validated on mount via `/api/auth/me` |

---

## 3. Technical Architecture

### System Overview

```
                    FRONTEND (Next.js :3000)
                           |
                    BACKEND (Express :3001)
                    /      |       |       \
              ADI Chain   Hedera   Canton   0G Labs
             (Testnet)   (Testnet) (Devnet)  (Compute)
```

### Monorepo Structure

```
packages/
├── contracts-adi/       # Foundry — Solidity 0.8.24 (ADI chain)
│   ├── src/             # 6 source contracts
│   ├── test/            # 4 test files (111 tests)
│   ├── script/          # Deploy.s.sol + Demo.s.sol
│   └── abi/             # Extracted ABIs for backend
├── contracts-hedera/    # Solidity + Hedera SDK
│   ├── contracts/       # CouponScheduler, YieldDistributor, HederaScheduleService
│   ├── test/            # 2 test files (74 tests)
│   ├── src/             # TypeScript deploy/test scripts
│   └── abi/             # Extracted ABIs for backend
├── contracts-canton/    # Daml SDK
│   └── daml/            # 3 modules + 3 test files (28 tests)
├── ai-engine/           # TypeScript — 0G Compute
│   ├── src/             # risk-analyzer, strategy-simulator, 0g-client, mock
│   ├── __tests__/       # Vitest tests
│   └── prompts/         # LLM system prompts
├── backend/             # Express API (TypeScript, ESM)
│   ├── src/routes/      # v1, adi, hedera, canton, ai, auth, demo, health
│   ├── src/middleware/   # JWT auth + RBAC
│   ├── src/services/    # ai-client, canton-client
│   └── data/            # AI report persistence (JSON)
└── frontend/            # Next.js 16 + TailwindCSS 4 + RainbowKit
    ├── src/app/          # 10 pages (App Router)
    ├── src/components/   # shadcn/ui + custom (role-gate, layout)
    ├── src/contexts/     # auth-context
    ├── src/hooks/        # use-api
    ├── src/lib/          # api client, mock data, utils
    └── src/config/       # wagmi config
```

### Tech Stack

| Layer | Technology | Language |
|-------|-----------|----------|
| ADI contracts | Foundry + OpenZeppelin v5.5 | Solidity 0.8.24 |
| Canton contracts | Daml SDK 2.10.3 | Daml |
| Hedera contracts | Hedera Smart Contract Service + SDK | Solidity 0.8.24 + TypeScript |
| AI engine | 0G Compute + OpenAI SDK | TypeScript |
| Frontend | Next.js 16.1 + TailwindCSS 4 + RainbowKit | TypeScript (React 19) |
| Backend | Express 4 | TypeScript (ESM) |
| Web3 | wagmi 2.x + viem 2.x + ethers 6.x | TypeScript |
| Charts | Recharts 3 | TypeScript |
| Animations | GSAP + Motion | TypeScript |
| Package manager | pnpm workspaces | — |
| Solidity testing | Forge | Solidity |
| TS testing | Vitest | TypeScript |

---

## 4. Data Flows

### Authentication Flow

```
1. User connects wallet (RainbowKit)
2. User clicks "Sign In"
3. Frontend → POST /api/auth/nonce {address}
4. Backend generates nonce, stores 5 min
5. Frontend → wallet.signMessage(message)
6. Frontend → POST /api/auth/login {address, signature, message}
7. Backend verifies signature + fetches roles on-chain (hasRole)
8. Backend returns JWT {address, roles[], exp: 24h}
9. JWT stored in localStorage, auto-attached to all API requests
```

### Tokenization Flow (ADI)

```
1. Issuer fills form: name, ISIN, nominal value, rate, frequency, maturity, tokens
2. Frontend → POST /api/adi/tokens (via backend)
3. Backend → RWATokenFactory.createToken() on ADI chain
4. Factory deploys new RWAToken ERC-20 with on-chain metadata
5. TokenCreated event emitted with token address
6. Token registered in factory's registry
```

### Coupon Scheduling Flow (Hedera)

```
1. registerBond(token, paymentToken, faceValue, rate, frequency, startDate, maturity)
2. Payment dates auto-computed from parameters
3. scheduleAllCoupons() → creates Hedera scheduled txs via precompile 0x16b
4. At payment date → executeCoupon() distributes pro-rata via YieldDistributor
5. Insufficient liquidity → payment suspended, alert emitted
```

### AI Analysis Flow (0G Labs)

```
1. User clicks "Analyze this vault"
2. Frontend → POST /api/ai/analyze {vaultId}
3. Backend fetches vault composition on-chain (ADI VaultManager)
4. ai-engine formats data for LLM prompt
5. 0G Compute runs inference (or mock fallback)
6. Structured report returned: score, positions, stress tests, recommendations
7. Report displayed in dashboard
8. User clicks Approve/Reject per recommendation
9. AI NEVER signs transactions — human confirms before execution
```

### Canton Visibility Flow

```
1. Owner creates ConfidentialVault (Daml)
2. Owner invites Counterparty → VaultInvitation
3. Counterparty accepts → VaultAccessRight created
4. Owner invites Auditor → AuditInvitation
5. Auditor accepts → AuditRight created (compliance-only view)
6. Same vault returns different data per party role:
   - Owner: full composition, values, all parties, all trades, full audit log
   - Counterparty: composition with values, own trades only, 2 parties visible
   - Auditor: asset count only, ratings/jurisdiction (no values), no trades
```

---

## 5. Deployed Contracts

### ADI Chain (Chain ID: 99999)

| Contract | Address |
|----------|---------|
| InstiVaultAccessControl | `0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d` |
| RWATokenFactory | `0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65` |
| VaultManager | `0x6b6449bDEC04dd8717AC71565C7c065680C1534f` |
| InstitutionDeployer | `0x6804Fc931CC3DB9543b07581C3AEdcf1fA66179B` |
| InstitutionRegistry | `0xAB3Cbc56D958245a2688b2171417679e743B1daF` |

### Ethereum Sepolia (Chain ID: 11155111)

| Contract | Address |
|----------|---------|
| InstiVaultAccessControl | `0x6ccfbc2c0d3a794938258d760cba69adbef05043` |
| RWATokenFactory | `0xe6c7ccccf0ea80816cd4e8fad70270cf5836921b` |
| VaultManager | `0xa162023bd4267a5649025f616016a6ea4f6b8044` |
| InstitutionDeployer | `0x531d24caee73fcabe1486036821d85b3111bb274` |
| InstitutionRegistry | `0x442ec1e3079e6db66c24af692b43e7b756031002` |

### Hedera Testnet

| Contract | Account ID | EVM Address |
|----------|------------|-------------|
| CouponScheduler | `0.0.7996912` | `0x00000000000000000000000000000000007a05f0` |
| YieldDistributor | `0.0.7996914` | `0x00000000000000000000000000000000007a05f2` |

### Canton

| Module | Templates | Status |
|--------|-----------|--------|
| ConfidentialVault | ConfidentialVault, VaultInvitation, VaultAccessRight, TradeRequest, TradeSettlement | Code ready, 28 tests passing |
| PrivateTrade | TradeProposal, TradeAgreement | Code ready |
| AuditRight | AuditInvitation, AuditRight | Code ready |

---

## 6. API Endpoints

### V1 Aggregated API (Frontend)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/dashboard` | GET | Aggregated stats, vaults, payments, AI summary |
| `/api/v1/vaults` | GET | All vaults from VaultManager |
| `/api/v1/vaults/:id` | GET | Single vault with detail |
| `/api/v1/tokens` | GET | All RWA tokens from TokenFactory |
| `/api/v1/payments` | GET | All coupon payments from CouponScheduler |
| `/api/v1/ai/reports` | GET | All AI analysis reports |
| `/api/v1/ai/score-history` | GET | Risk score over time |
| `/api/v1/canton/vaults` | GET | Confidential vaults |
| `/api/v1/admin/wallets` | GET | Whitelisted wallets |

### ADI Direct API

| Route | Method | Auth | Role |
|-------|--------|------|------|
| `/api/adi/tokens` | POST | JWT | ISSUER |
| `/api/adi/tokens/:addr/fractionalize` | POST | JWT | ISSUER |
| `/api/adi/vaults` | POST | JWT | ISSUER |
| `/api/adi/vaults/:id/deposit` | POST | JWT | INVESTOR |
| `/api/adi/vaults/:id/withdraw` | POST | JWT | INVESTOR |
| `/api/adi/vaults/:id/allocate` | POST | JWT | ISSUER |
| `/api/adi/whitelist` | POST | JWT | ADMIN |
| `/api/adi/roles` | POST | JWT | ADMIN |

### Hedera Direct API

| Route | Method | Auth | Role |
|-------|--------|------|------|
| `/api/hedera/bonds` | POST | JWT | ADMIN/ISSUER |
| `/api/hedera/bonds/:id/schedule-all` | POST | JWT | ISSUER/ADMIN |
| `/api/hedera/yield/distribute` | POST | JWT | ADMIN/ISSUER |
| `/api/hedera/yield/claim` | POST | JWT | INVESTOR |

### AI Direct API

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/ai/analyze` | POST | JWT | Trigger 0G Compute analysis |
| `/api/ai/reports/:id/approve` | POST | JWT (ADMIN/ISSUER) | Approve recommendation |
| `/api/ai/reports/:id/reject` | POST | JWT (ADMIN/ISSUER) | Reject recommendation |

### Auth API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/nonce` | POST | Generate nonce for wallet |
| `/api/auth/login` | POST | Verify signature, return JWT |
| `/api/auth/dev-login` | POST | All-roles JWT (DEV_MODE only) |
| `/api/auth/me` | GET | Refresh roles from on-chain |

---

## 7. Test Coverage

| Package | Framework | Tests | Status |
|---------|-----------|-------|--------|
| contracts-adi | Forge | 111 | All passing |
| contracts-hedera | Forge | 74 | All passing |
| contracts-canton | Daml sandbox | 28 | All passing |
| ai-engine | Vitest | ~20 | All passing |
| backend | — | 0 | No tests |
| frontend | — | 0 | No tests |
| **Total** | | **213+** | |

---

## 8. Edge Cases and Constraints

### Smart Contract Constraints

- **Hedera address format**: Must use `PrivateKey.publicKey.toEvmAddress()` (ECDSA alias), never `AccountId.toSolidityAddress()` (long-zero format) for addresses compared against `msg.sender`
- **EIP-170 workaround**: `InstitutionDeployer` is a separate contract to avoid bytecode size limits on `InstitutionRegistry`
- **Floating pragmas**: All contracts use `^0.8.20` — acceptable for hackathon, should pin for production
- **Whitelist on transfer**: Both sender AND receiver must be whitelisted for RWAToken transfers
- **Pausable**: VaultManager can be paused by admin for emergency stop on all vault operations
- **No partial coupon execution**: If liquidity is insufficient, the entire payment is suspended (not partially distributed)

### Backend Constraints

- **CORS**: Currently wide open (`cors()` with no arguments) — acceptable for demo, restrict in production
- **JWT secret**: Must be set in `.env` (`JWT_SECRET`) — not hardcoded
- **AI persistence**: Reports stored in JSON file (`data/ai-reports.json`), not a database
- **Demo fallback**: All V1 endpoints fall back to demo data when on-chain services are unreachable
- **Canton silent failure**: Canton routes return `[]` if Canton is not configured

### Frontend Constraints

- **All text in English**: Per project conventions
- **Imperial units**: All measurements must use the imperial system
- **Fonts**: Space Grotesk (display), Geist Sans (body), Geist Mono (code)
- **SSR-safe wallet**: RainbowKit configured for server-side rendering compatibility

### Known Open Items

- Canton contracts not yet deployed to Devnet L1 (code ready, sandbox tested)
- 0G Compute endpoint not configured (running in mock mode)
- Frontend pages built with demo/mock data integration — real API calls partially wired
- No CI/CD pipeline
- No backend or frontend tests
- No live demo URL (Vercel deployment pending)
- No demo video recorded

---

## 9. Security Considerations

- No hardcoded secrets in source code — all via `.env` and `process.env`
- `.env` files in `.gitignore` and not tracked in git
- No XSS vectors (no `dangerouslySetInnerHTML` or `eval`)
- No SQL injection risk (no SQL database)
- 9 dependency vulnerabilities (all transitive, from 0G SDK and Hedera SDK)
- Open CORS policy (demo-only concern)
- AI never has signing authority — human-in-the-loop enforced at API level

---

## 10. Audit Summary

### Health Score: 58/100 (FAIR)

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Security | 7/10 | x4 | No secrets in code, proper env handling; open CORS, 9 transitive vulns |
| Code Quality | 5/10 | x3 | 213+ contract tests, but no backend/frontend tests; 111 console.log calls; no linting |
| Architecture | 8/10 | x2 | Clean monorepo, clear separation, proper fallbacks, good documentation |
| Dependencies | 6/10 | x2 | Single lockfile, 9 vulns (all transitive), reasonably current |
| Git & DevOps | 4/10 | x2 | No CI/CD, no git hooks, inconsistent commit messages |
| Claude Config | 6/10 | x3 | Good CLAUDE.md, but no hooks/agents/rules, no settings.json |

### Key Gaps

1. No CI/CD pipeline (GitHub Actions)
2. No backend or frontend tests
3. No ESLint configuration at root level
4. Open CORS policy
5. 111 console.log statements in source
6. Canton deployment pending
7. 0G Compute not configured (mock only)
8. Missing root README.md (being created)

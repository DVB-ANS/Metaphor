# Metaphor

## Built for ETHDenver 2026 — New France Village Track

Metaphor was developed for ETHDenver 2026, targeting 4 bounties: **ADI Foundation**, **Canton Network**, **Hedera**, and **0G Labs**. The hackathon challenges developers to build real-world applications across multiple blockchain ecosystems. Metaphor addresses the fundamental complexity of institutional RWA (Real World Assets) management by unifying tokenization, confidential trading, automated yield payments, and AI-powered risk analysis into a single platform — 4 chains, 1 interface.

## The problem Metaphor solves

Institutions tokenizing real-world assets (bonds, invoices, real estate) face three obstacles that no single platform addresses today:

1. **Confidentiality** — Investment strategies and portfolio compositions are exposed on public blockchains. Institutions cannot negotiate without revealing their hand to the entire market.
2. **Automation** — Coupon and yield payments depend on centralized off-chain servers (cron jobs), creating single points of failure and operational risk.
3. **Intelligence** — Risk analysis of RWA portfolios remains manual, fragmented across spreadsheets, and disconnected from on-chain data.

Metaphor is intentionally integrated: issuers tokenize assets on ADI chain with on-chain metadata (ISIN, coupon rate, maturity), negotiate in Canton confidential data rooms where visibility is enforced at the protocol level, schedule coupon payments deterministically via Hedera's Schedule Service precompile, and analyze portfolio risk through 0G Compute with human-in-the-loop approval. No intermediaries, no manual settlements, no cron jobs. The entire lifecycle — from issuance to maturity — is trustless, automated, and confidential because each layer is built natively on the right chain for the job.

## Challenges we ran into

Building a full-stack institutional platform across 4 different blockchain ecosystems presented several learning curves:

- **Hedera Address Format**: On Hedera, `msg.sender` resolves to the ECDSA-derived alias address, not the long-zero format from `AccountId.toSolidityAddress()`. Our deploy scripts passed the wrong format to `Ownable`, so `onlyOwner` checks always reverted. We had to derive the ECDSA alias via `PrivateKey.publicKey.toEvmAddress()` for all admin addresses.
- **Canton Visibility Model**: Implementing true privacy in Daml — where the auditor's transaction tree literally doesn't contain counterparty data (it's not hidden, it doesn't exist) — required rethinking how we structure templates and party roles.
- **Multi-Chain Orchestration**: Coordinating authentication, role-checking, and data fetching across ADI Chain (ethers.js), Hedera (SDK + EVM), Canton (Daml HTTP JSON API), and 0G Labs (Compute SDK) from a single Express backend.
- **EIP-170 Bytecode Limit**: `InstitutionRegistry` exceeded the contract size limit, requiring an external `InstitutionDeployer` pattern to separate deployment logic.
- **Schedule Service Precompile**: Calling Hedera's `0x16b` precompile (IHRC755 + IHRC1215) directly from Solidity for coupon scheduling — no documentation examples existed for this pattern.

## Links

- **GitHub Repository**: [github.com/DVB-ANS/ETH-DENVER](https://github.com/DVB-ANS/ETH-DENVER)
- **ADI Chain Explorer**: [explorer.ab.testnet.adifoundation.ai](https://explorer.ab.testnet.adifoundation.ai)
- **Hedera HashScan**: [hashscan.io/testnet](https://hashscan.io/testnet)

## What is Metaphor's unique value proposition?

Metaphor turns institutional RWA management into a unified workflow across 4 specialized chains. Issuers tokenize once on ADI chain, negotiate confidentially on Canton, automate coupon payments on Hedera, and analyze risk via 0G Compute — all from one dashboard. Unlike platforms that force everything onto a single chain (sacrificing privacy or automation), Metaphor uses each chain for what it does best:

- **ADI Chain**: ERC-20 tokens with on-chain RWA metadata (ISIN, rate, maturity) + RBAC + multi-tenant white-label with 2-of-N multisig governance
- **Canton/Daml**: Protocol-level privacy — the same vault shows different data to owners, counterparties, and auditors. Not UI hiding — ledger-enforced
- **Hedera**: Deterministic coupon payments via Schedule Service precompile `0x16b`, called directly from Solidity. No cron jobs, no off-chain servers
- **0G Labs**: Structured risk reports (Zod-validated) with stress tests and recommendations. AI never signs transactions — humans approve everything

The product proves it end-to-end: tokenize an asset, create a vault, invite counterparties to a private data room, schedule automated coupon payments, run AI analysis, and approve or reject recommendations — all on-chain, all auditable, all from a single interface.

## Who is the target customer?

**Primary**: Asset managers, private banks, and family offices managing $50M-$500M in fixed income portfolios who need:
- **Confidential negotiation** without exposing strategies on public chains
- **Automated yield distribution** without operational overhead
- **On-chain compliance** with KYC-whitelisted transfers and role-based access

**Secondary**: Corporate treasurers issuing $1M-$50M bonds where traditional underwriting fees (2-5%) are prohibitive, and regulators who benefit from on-chain audit trails with controlled visibility.

## Who are the closest competitors and how is Metaphor different?

Closest competitors include Securitize (Ethereum/Polygon tokenization), Ondo Finance (tokenized treasuries), and Centrifuge (real-world asset financing). These solutions either:
1. **Expose everything publicly**: Single-chain platforms can't enforce privacy at the protocol level
2. **Rely on off-chain servers**: Coupon payments triggered by cron jobs create single points of failure
3. **Lack AI integration**: Risk analysis is disconnected from on-chain portfolio data

Metaphor eliminates all three:
- **Protocol-level privacy**: Canton/Daml enforces visibility at the ledger — auditors can't see what they shouldn't, even with full database access
- **On-chain automation**: Hedera Schedule Service precompile executes payments deterministically from Solidity
- **Integrated intelligence**: 0G Compute analyzes actual portfolio composition with structured, actionable output — and the AI never has signing authority

## Technology Stack

### Smart Contracts (ADI Chain — Solidity)
- **Foundry**: Build, test, and deploy framework
- **OpenZeppelin v5.5**: ERC-20, AccessControl, Pausable base contracts
- **Solidity 0.8.24**: 6 contracts, 111 tests passing

### Smart Contracts (Hedera — Solidity + SDK)
- **Hedera Smart Contract Service**: EVM-compatible execution
- **Schedule Service Precompile (0x16b)**: IHRC755 + IHRC1215 interfaces
- **Hedera SDK (TypeScript)**: Deployment and interaction scripts
- **Solidity 0.8.24**: 2 contracts, 74 tests passing

### Smart Contracts (Canton — Daml)
- **Daml SDK 2.10.3**: Native Daml templates with party-scoped visibility
- **3 modules, 9 templates**: ConfidentialVault, PrivateTrade, AuditRight
- **28 tests passing**: Visibility separation verified

### AI Engine (0G Labs)
- **0G Compute**: Decentralized inference for risk analysis
- **OpenAI SDK**: Compatible client for 0G broker
- **Zod**: Schema validation for structured AI output
- **TypeScript**: Risk analyzer + strategy simulator

### Backend (Express)
- **Express.js**: RESTful API bridging all 4 chains
- **ethers.js 6**: ADI Chain + Hedera contract interaction
- **JWT (jsonwebtoken)**: Wallet-based authentication with on-chain role embedding
- **TypeScript (ESM)**: Strict mode, modern module system

### Frontend (Next.js)
- **Next.js 16.1**: App Router with 10 pages
- **TailwindCSS 4**: Utility-first styling
- **RainbowKit + wagmi 2.x + viem 2.x**: Wallet connection and Web3 integration
- **Recharts 3**: Portfolio and risk visualization charts
- **GSAP + Motion**: Scroll animations on landing page
- **shadcn/ui**: Component library

### Infrastructure
- **pnpm workspaces**: Monorepo with 6 packages
- **Node.js 20+**: Runtime requirement
- **Forge + Vitest**: Solidity and TypeScript testing

## Architecture Overview

```
                     FRONTEND (Next.js :3000)
                     ├── 10 pages (App Router)
                     ├── RoleGate + route-access.ts
                     ├── auth-context (JWT + wagmi)
                     └── RainbowKit (wallet connect)
                                |
                                | fetch + JWT Bearer
                                v
                     BACKEND (Express :3001)
                     ├── middleware/auth.ts (JWT verify)
                     ├── middleware/rbac.ts (on-chain roles)
                     ├── routes/v1.ts (aggregated API)
                     └── services/ (ai-client, canton-client)
                      /        |         |          \
                ethers.js   ethers.js   HTTP      0G SDK
                  |            |         |          |
             ADI Chain     Hedera    Canton      0G Labs
             (99999)      Testnet    Devnet     Compute
                |            |         |          |
          6 contracts   2 contracts  3 Daml    risk-analyzer
          111 tests     74 tests    28 tests   ~20 tests
```

### Authentication Flow
1. User connects wallet (RainbowKit)
2. Frontend requests nonce → Backend generates nonce (5 min expiry)
3. User signs EIP-191 message → Frontend submits signature
4. Backend verifies signature + fetches roles on-chain via `hasRole()`
5. JWT returned with address + roles (24h expiry)
6. All API requests include JWT Bearer token

### Monorepo Structure

```
packages/
├── contracts-adi/       # Foundry — 6 Solidity contracts (ADI chain)
├── contracts-hedera/    # Solidity + Hedera SDK (coupon automation)
├── contracts-canton/    # Daml templates (confidential vaults)
├── ai-engine/           # TypeScript (0G Compute risk analysis)
├── backend/             # Express API (bridges all 4 chains)
└── frontend/            # Next.js dashboard (10 pages)
```

## Deployed Contracts

### ADI Chain (Chain ID: 99999)

| Contract | Address | Explorer |
|----------|---------|---------|
| InstiVaultAccessControl | `0x8E7D...656d` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d) |
| RWATokenFactory | `0x0eD2...7d65` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65) |
| VaultManager | `0x6b64...534f` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0x6b6449bDEC04dd8717AC71565C7c065680C1534f) |
| InstitutionRegistry | `0xAB3C...1daF` | [View](https://explorer.ab.testnet.adifoundation.ai/address/0xAB3Cbc56D958245a2688b2171417679e743B1daF) |

### Hedera Testnet

| Contract | Account ID | Explorer |
|----------|------------|---------|
| CouponScheduler | `0.0.7996912` | [View](https://hashscan.io/testnet/contract/0.0.7996912) |
| YieldDistributor | `0.0.7996914` | [View](https://hashscan.io/testnet/contract/0.0.7996914) |

### Canton (Daml)

| Module | Templates |
|--------|-----------|
| ConfidentialVault | ConfidentialVault, VaultInvitation, VaultAccessRight, TradeRequest, TradeSettlement |
| PrivateTrade | TradeProposal, TradeAgreement |
| AuditRight | AuditInvitation, AuditRight |

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A Hedera Testnet account ([portal.hedera.com](https://portal.hedera.com))

### Installation

```bash
# Clone and install
git clone https://github.com/DVB-ANS/ETH-DENVER.git
cd ETH-DENVER
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your keys (see .env.example for all variables)
```

### Run Locally

```bash
# Terminal 1 — Backend API
pnpm dev:backend    # Express on http://localhost:3001

# Terminal 2 — Frontend
pnpm dev:frontend   # Next.js on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Run Tests

```bash
pnpm test           # All tests (ADI + Hedera + Canton + AI)

# Or individually:
pnpm test:adi       # 111 Solidity tests (Foundry)
pnpm test:hedera    # 74 Solidity tests (Foundry)
pnpm test:canton    # 28 Daml tests
pnpm test:ai        # AI engine tests (Vitest)
```

## Test Results

| Package | Framework | Tests | Status |
|---------|-----------|-------|--------|
| contracts-adi | Forge | 111 | All passing |
| contracts-hedera | Forge | 74 | All passing |
| contracts-canton | Daml | 28 | All passing |
| ai-engine | Vitest | ~20 | All passing |
| **Total** | | **213+** | **All passing** |

## Bounties

| Sponsor | What We Built | Key Proof |
|---------|---------------|-----------|
| **ADI Foundation** | Multi-tenant tokenization platform with RBAC, 2-of-N multisig, and white-label support. 6 contracts deployed on ADI chain (99999) + Sepolia. | Live tokenization tx + vault creation tx + whitelist tx on chain 99999. InstitutionRegistry with isolated contracts per institution. |
| **Canton Network** | Native Daml confidential vaults with 9 templates across 3 modules. Party-scoped visibility enforced at the ledger protocol level. | 3-panel demo: same vault returns different data per role. Auditor's transaction tree doesn't contain counterparty data — it doesn't exist. |
| **Hedera** | On-chain coupon scheduling via Schedule Service precompile (`0x16b`). CouponScheduler + YieldDistributor deployed on Hedera Testnet. | `scheduleCoupon()` calls IHRC755 + IHRC1215 directly from Solidity. 2 bonds registered with automated payment dates. |
| **0G Labs** | Structured risk analysis via 0G Compute with Zod-validated reports, stress tests, and human-in-the-loop approval. | AI returns scored positions + macro stress scenarios. Every recommendation requires explicit user approval — AI never signs transactions. |

## Team

| Dev | Scope |
|-----|-------|
| Dev A | Solidity contracts (ADI + Hedera) |
| Dev B | Daml contracts (Canton) + AI engine (0G Labs) |
| Dev C | Frontend (Next.js) + Backend (Express) |

## Documentation

- **[SPEC.md](./markdown/SPEC.md)** — Full project specification (features, architecture, data flows, edge cases)
- **[DEPLOY.md](./markdown/DEPLOY.md)** — Step-by-step deployment guide
- **[DEMO_GUIDE.md](./markdown/DEMO_GUIDE.md)** — 20-minute demo walkthrough with terminal commands
- **[BOUNTY_COMPLIANCE.md](./markdown/BOUNTY_COMPLIANCE.md)** — Bounty requirement checklist with evidence
- **[PROJECT_OVERVIEW.md](./markdown/PROJECT_OVERVIEW.md)** — Detailed product overview
- **[DEPLOYED_CONTRACTS.md](./markdown/DEPLOYED_CONTRACTS.md)** — All contract addresses across chains
- **[TIMELINE.md](./markdown/TIMELINE.md)** — Development roadmap and phases

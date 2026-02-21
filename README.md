# Metaphor

Confidential and automated RWA (Real World Assets) hub for institutional finance. Built for ETHDenver 2026.

Metaphor lets institutions tokenize real-world assets, trade them in private data rooms, automate coupon payments, and analyze portfolio risk with AI — all from a single dashboard.

## What It Does

**4 layers, 1 platform:**

- **Tokenization (ADI Chain)** — Create ERC-20 tokens representing bonds, invoices, or other real-world assets with on-chain metadata (ISIN, coupon rate, maturity). Transfer restricted to KYC-whitelisted wallets only.

- **Confidential Trading (Canton/Daml)** — Private data rooms where institutions negotiate without exposing strategies. The same vault shows different data to owners, counterparties, and auditors — enforced at the protocol level.

- **Automated Yields (Hedera)** — Coupon payments scheduled on-chain via Hedera's Schedule Service precompile. No cron jobs, no off-chain servers. Payments distribute pro-rata to token holders automatically.

- **AI Risk Analysis (0G Labs)** — On-demand vault analysis via 0G Compute. Returns a structured risk report with scores, stress tests, and recommendations. The AI never executes transactions — humans approve everything.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A Hedera Testnet account ([portal.hedera.com](https://portal.hedera.com))

### Setup

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
pnpm test           # All tests (ADI + Hedera + AI)

# Or individually:
cd packages/contracts-adi && forge test        # 111 Solidity tests
cd packages/contracts-hedera && forge test     # 74 Solidity tests
pnpm --filter ai-engine test                   # AI engine tests
```

## Architecture

```
Frontend (Next.js)  →  Backend (Express)  →  4 Chains/Services
                                           ├── ADI Chain (tokenization)
                                           ├── Hedera (coupon automation)
                                           ├── Canton (confidential vaults)
                                           └── 0G Labs (AI inference)
```

### Monorepo Packages

| Package | Purpose | Tech |
|---------|---------|------|
| `contracts-adi` | Tokenization, vaults, RBAC, white-label | Solidity + Foundry |
| `contracts-hedera` | Coupon scheduling, yield distribution | Solidity + Hedera SDK |
| `contracts-canton` | Confidential vaults, private trading | Daml |
| `ai-engine` | Risk analysis, stress testing | TypeScript + 0G Compute |
| `backend` | API bridging all 4 layers | Express (TypeScript) |
| `frontend` | Institutional dashboard | Next.js + TailwindCSS |

## Deployed Contracts

### ADI Chain (Chain ID: 99999)

| Contract | Address |
|----------|---------|
| AccessControl | [`0x8E7D...656d`](https://explorer.ab.testnet.adifoundation.ai/address/0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d) |
| RWATokenFactory | [`0x0eD2...7d65`](https://explorer.ab.testnet.adifoundation.ai/address/0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65) |
| VaultManager | [`0x6b64...534f`](https://explorer.ab.testnet.adifoundation.ai/address/0x6b6449bDEC04dd8717AC71565C7c065680C1534f) |
| InstitutionRegistry | [`0xAB3C...1daF`](https://explorer.ab.testnet.adifoundation.ai/address/0xAB3Cbc56D958245a2688b2171417679e743B1daF) |

### Hedera Testnet

| Contract | Explorer |
|----------|---------|
| CouponScheduler (`0.0.7996912`) | [HashScan](https://hashscan.io/testnet/contract/0.0.7996912) |
| YieldDistributor (`0.0.7996914`) | [HashScan](https://hashscan.io/testnet/contract/0.0.7996914) |

## Test Results

| Package | Tests | Status |
|---------|-------|--------|
| contracts-adi | 111 | Passing |
| contracts-hedera | 74 | Passing |
| contracts-canton | 28 | Passing |
| ai-engine | ~20 | Passing |
| **Total** | **213+** | **All passing** |

## Project Structure

```
ETH-DENVER/
├── packages/
│   ├── contracts-adi/       # Foundry — 6 Solidity contracts
│   ├── contracts-hedera/    # Solidity + Hedera SDK
│   ├── contracts-canton/    # Daml templates
│   ├── ai-engine/           # 0G Compute risk analysis
│   ├── backend/             # Express API
│   └── frontend/            # Next.js dashboard
├── SPEC.md                  # Full project specification
├── markdown/                # Additional documentation
│   ├── PROJECT_OVERVIEW.md  # Detailed product description
│   ├── DEPLOY.md            # Deployment guide
│   ├── DEMO_GUIDE.md        # Demo walkthrough
│   ├── BOUNTY_COMPLIANCE.md # Bounty requirements mapping
│   ├── DEPLOYED_CONTRACTS.md # All contract addresses
│   └── TIMELINE.md          # Development roadmap
├── .env.example             # Environment variable template
└── CLAUDE.md                # Claude Code context
```

## Documentation

- **[SPEC.md](./SPEC.md)** — Full project specification (features, architecture, data flows, edge cases)
- **[markdown/DEPLOY.md](./markdown/DEPLOY.md)** — Step-by-step deployment guide
- **[markdown/DEMO_GUIDE.md](./markdown/DEMO_GUIDE.md)** — Demo walkthrough with terminal commands
- **[markdown/BOUNTY_COMPLIANCE.md](./markdown/BOUNTY_COMPLIANCE.md)** — Bounty requirement checklist
- **[markdown/PROJECT_OVERVIEW.md](./markdown/PROJECT_OVERVIEW.md)** — Detailed product overview

## Team

| Dev | Scope |
|-----|-------|
| Dev A | Solidity contracts (ADI + Hedera) |
| Dev B | Daml contracts (Canton) + AI engine (0G Labs) |
| Dev C | Frontend (Next.js) + Backend (Express) |

## Bounties

| Sponsor | What We Built |
|---------|---------------|
| **ADI Foundation** | Multi-tenant tokenization platform with RBAC, multisig, and white-label support |
| **Canton Network** | Native Daml confidential vaults with party-scoped visibility separation |
| **Hedera** | On-chain coupon scheduling via Schedule Service precompile (0x16b) |
| **0G Labs** | Structured risk analysis with human-in-the-loop approval via 0G Compute |

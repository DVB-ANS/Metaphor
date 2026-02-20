# Outward — Claude Context

## Project

Outward is a confidential, automated RWA (Real World Assets) hub for institutional finance. Built for ETHDenver 2026, New France Village track. Targeting 4 bounties: ADI Foundation, Canton Network, Hedera, 0G Labs.

## Team

3 developers working in parallel:
- **Dev A** — Solidity (ADI + Hedera contracts)
- **Dev B** — Daml (Canton) + AI (0G Labs)
- **Dev C** — Frontend (Next.js) + Backend (Express)

## Monorepo Structure

```
packages/
├── contracts-adi/       # Foundry — Solidity (ADI chain)
├── contracts-canton/    # Daml (Canton Devnet L1)
├── contracts-hedera/    # Solidity + Hedera SDK (Hedera Testnet)
├── ai-engine/           # TypeScript (0G Compute)
└── frontend/            # Next.js + TailwindCSS
```

A `packages/backend/` (Express API) will be created in Phase 1.

## Tech Stack

| Layer | Tech | Language |
|-------|------|----------|
| ADI contracts | Foundry + OpenZeppelin v5.5 | Solidity 0.8.24 |
| Canton contracts | Daml SDK | Daml |
| Hedera contracts | Hedera Smart Contract Service + SDK | Solidity + TypeScript |
| AI engine | 0G Compute | TypeScript |
| Frontend | Next.js + TailwindCSS | TypeScript |
| Backend | Express | TypeScript |
| Package manager | pnpm workspaces | — |

## Git Workflow

```
main      ← version stable, déployable (on ne push JAMAIS directement ici)
└── develop   ← branche d'intégration quotidienne (tous les PRs mergent ici)
    ├── feat/adi-*        ← Dev A
    ├── feat/hedera-*     ← Dev A
    ├── feat/canton-*     ← Dev B
    ├── feat/ai-*         ← Dev B
    ├── feat/frontend-*   ← Dev C
    └── feat/backend-*    ← Dev C
```

### Règles
1. **Toujours** créer sa feature branch depuis `develop` (`git checkout develop && git checkout -b feat/...`)
2. **PR vers `develop`**, jamais directement vers `main`
3. `main` est mis à jour uniquement quand `develop` est stable (avant démo, avant soumission)
4. Préfixes de commit : `feat:`, `fix:`, `test:`, `docs:`, `chore:`

## Key Contracts

### ADI (Solidity)
- `AccessControl.sol` — RBAC: Admin, Issuer, Investor, Auditor
- `RWATokenFactory.sol` — ERC-20 with metadata (ISIN, rate, maturity, issuer)
- `VaultManager.sol` — Vault lifecycle (create, deposit, withdraw, allocate)

### Canton (Daml)
- `ConfidentialVault` — Private vault with party-scoped visibility
- `PrivateTrade` — Bilateral offer/counter-offer
- `AuditRight` — Limited third-party audit access

### Hedera (Solidity)
- `CouponScheduler.sol` — Scheduled transactions via Hedera Schedule Service
- `YieldDistributor.sol` — Pro-rata yield distribution

## Conventions

- Solidity: Foundry for build/test, OpenZeppelin for base contracts
- TypeScript: strict mode, ESNext target, bundler module resolution
- Formatting: Prettier (single quotes, trailing commas, 100 char width)
- No secrets in repo — use `.env` (template in `.env.example`)
- All user-facing text across the entire site must be in English. All units must use the imperial system.

## Bounty Requirements (must not forget)

- **ADI**: MVP on ADI chain, real economic utility, white-label ready, RBAC/multisig
- **Canton**: Native Daml (no wrappers), deployed on Devnet L1, visibility separation demo
- **Hedera**: Schedule Service usage, coupon payments, initiated from smart contract
- **0G Labs**: 0G Compute inference, structured decisions, human-in-the-loop approval

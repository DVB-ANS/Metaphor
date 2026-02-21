# Outward — Claude Context

## Project

Outward is a confidential, automated RWA (Real World Assets) hub for institutional finance. Built for ETHDenver 2026, New France Village track. Targeting 4 bounties: ADI Foundation, Canton Network, Hedera, 0G Labs.

**Documentation:**
- [Project Overview](./PROJECT_OVERVIEW.md)
- [Timeline](./TIMELINE.md)

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
├── backend/             # Express API (TypeScript)
└── frontend/            # Next.js + TailwindCSS + RainbowKit
```

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

### ADI (Solidity) — Deployed on Sepolia + ADI Chain (99999)
- `InstiVaultAccessControl.sol` — RBAC: Admin, Issuer, Investor, Auditor + whitelisting
- `RWAToken.sol` — ERC-20 with RWA metadata (ISIN, rate, maturity, issuer) + whitelist transfer restrictions
- `RWATokenFactory.sol` — Factory for creating RWA tokens + fractionalization
- `VaultManager.sol` — Vault lifecycle (create, deposit, withdraw, allocate) + multi-token + Pausable
- `InstitutionRegistry.sol` — Multi-tenant white-label registry + 2-of-N multisig proposals
- `InstitutionDeployer.sol` — External deployer (EIP-170 workaround)

### Canton (Daml)
- `ConfidentialVault` — Private vault with party-scoped visibility
- `PrivateTrade` — Bilateral offer/counter-offer
- `AuditRight` — Limited third-party audit access

### Hedera (Solidity) — Deployed on Hedera Testnet
- `CouponScheduler.sol` — Scheduled coupon payments via Hedera Schedule Service precompile (0x16b), access-controlled execution (self-call / issuer / owner) + Pausable
- `YieldDistributor.sol` — Snapshot-based pro-rata yield distribution to bond holders
- `HederaScheduleService.sol` — Abstract base for Hedera precompile interaction (IHRC755 + IHRC1215)

## Typography

- **Display font**: Space Grotesk (`font-display`) — used for landing page title, subtitle, glass text, and CTA button
- **Body font**: Geist Sans (`font-sans`) — used for all UI/body text
- **Mono font**: Geist Mono (`font-mono`) — used for code/data

## Conventions

- Solidity: Foundry for build/test, OpenZeppelin for base contracts
- TypeScript: strict mode, ESNext target, bundler module resolution
- Formatting: Prettier (single quotes, trailing commas, 100 char width)
- No secrets in repo — use `.env` (template in `.env.example`)
- All user-facing text across the entire site must be in English. All units must use the imperial system.

## Known Bugs / Blockers

### Hedera — `registerBond` reverts (`CONTRACT_REVERT_EXECUTED`)

**Status**: FIXED — redeploy required (`pnpm deploy` in `packages/contracts-hedera`)

**Root cause**: On Hedera, `msg.sender` in the EVM resolves to the **ECDSA-derived alias address** (keccak256 of the public key, e.g. `0x40a1Db6B...`), NOT the long-zero address from `AccountId.toSolidityAddress()` (e.g. `0x0000...79af01`). The deploy script was passing the long-zero format to the `Ownable` constructor, so `onlyOwner` checks always failed because `msg.sender != owner()`.

**Fix applied**: `deploy.ts` now uses `PrivateKey.publicKey.toEvmAddress()` to derive the ECDSA alias and passes it as the `admin` constructor parameter. All scripts updated to use `getOperatorEvmAddress()` from `config.ts`. This ensures `owner()` stores the same address format as `msg.sender`.

**IMPORTANT — Hedera address convention**: Never use `AccountId.toSolidityAddress()` for addresses that will be compared against `msg.sender` in Solidity (Ownable admin, issuer, access control roles). Always use `getOperatorEvmAddress()` from `config.ts`.

**New contracts deployed** (2026-02-21):
- CouponScheduler: `0.0.7996912` / `0x00000000000000000000000000000000007a05f0`
- YieldDistributor: `0.0.7996914` / `0x00000000000000000000000000000000007a05f2`
- Admin (ECDSA alias): `0x40a1db6bf87e0416fde0d9cedd1d148186475ea0`
- 2 bonds registered (France OAT 2028 + US Treasury 10Y)

## Bounty Requirements (must not forget)

- **ADI**: MVP on ADI chain, real economic utility, white-label ready, RBAC/multisig
- **Canton**: Native Daml (no wrappers), deployed on Devnet L1, visibility separation demo
- **Hedera**: Schedule Service usage, coupon payments, initiated from smart contract
- **0G Labs**: 0G Compute inference, structured decisions, human-in-the-loop approval

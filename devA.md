# Dev A — Action Plan & Context (Solidity: ADI + Hedera)

> **Read this file first if you're a new Claude Code session.**
> It contains everything you need to work on Dev A's scope for InstiVault.

---

## Project Context

**InstiVault** is a confidential, automated RWA (Real World Assets) hub for institutional finance.
Built for **ETHDenver 2026**, New France Village track. Targeting 4 bounties: ADI Foundation, Canton Network, Hedera, 0G Labs.

**Team:** 3 devs in parallel:
- **Dev A (you)** — Solidity contracts on ADI chain + Hedera Testnet
- **Dev B** — Daml (Canton) + AI (0G Labs)
- **Dev C** — Frontend (Next.js) + Backend (Express)

**Key files to read for full context:**
- `CLAUDE.md` — project-wide instructions, conventions, full tech stack, bounty requirements
- `TIMELINE.md` — full roadmap for all 3 devs across all phases

---

## Monorepo Structure

```
ETH-Denver/                    ← root (pnpm workspaces)
├── CLAUDE.md                  ← project instructions (read if you need more context)
├── TIMELINE.md                ← full roadmap for all devs
├── devA.md                    ← THIS FILE
├── packages/
│   ├── contracts-adi/         ← Foundry project (Dev A)
│   │   ├── foundry.toml       ← solc 0.8.24, optimizer on (200 runs)
│   │   ├── remappings.txt     ← @openzeppelin/=lib/openzeppelin-contracts/
│   │   ├── lib/openzeppelin-contracts/  ← OZ v5.5 (git submodule)
│   │   ├── src/               ← Solidity source (DONE — 4 contracts)
│   │   ├── test/              ← Forge tests (DONE — 57 tests, all passing)
│   │   └── script/            ← Deployment scripts (Phase 3)
│   ├── contracts-hedera/      ← Hedera project (Dev A)
│   │   ├── package.json       ← @hashgraph/sdk ^2.55.0, tsx, typescript
│   │   ├── tsconfig.json      ← extends ../../tsconfig.base.json
│   │   ├── contracts/         ← Solidity source (TO CREATE)
│   │   └── src/               ← TypeScript SDK scripts (TO CREATE)
│   ├── contracts-canton/      ← Daml project (Dev B)
│   ├── ai-engine/             ← 0G Compute (Dev B)
│   └── frontend/              ← Next.js (Dev C)
```

---

## Tech Stack (Dev A specific)

| What | Tech | Version |
|------|------|---------|
| ADI contracts | Foundry + OpenZeppelin | Solidity ^0.8.20, OZ v5.5 |
| Hedera contracts | Solidity + Hedera Smart Contract Service | Solidity ^0.8.20 |
| Hedera SDK scripts | TypeScript + @hashgraph/sdk | ^2.55.0 |
| Build/test (ADI) | `forge build`, `forge test -vvv` | — |
| Package manager | pnpm workspaces | — |

---

## Git Workflow

```
main              ← stable, NEVER push directly
└── develop       ← integration branch, all PRs merge here
    ├── feat/adi-*        ← Dev A branches
    └── feat/hedera-*     ← Dev A branches
```

**Rules:**
1. **Always branch from `develop`**: `git checkout develop && git checkout -b feat/...`
2. **PR into `develop`**, never into `main`
3. **Commit prefixes:** `feat:`, `fix:`, `test:`, `docs:`, `chore:`
4. **Run `forge test -vvv`** before every commit on `contracts-adi`
5. **No secrets in repo** — use `.env`

---

## Progress Tracker

> **Update this section as you complete tasks.** Mark `[x]` when done, add dates.

| Phase | Branch | Status | Notes |
|-------|--------|--------|-------|
| 1. ADI Core | `feat/adi-core` | DONE (2026-02-19) | 4 contracts, 57 tests passing |
| 2A. Hedera Core | `feat/hedera-core` | NOT STARTED | — |
| 2B. ADI Token Logic | `feat/adi-token-logic` | NOT STARTED | Needs Phase 1 merged |
| 3. Hedera Edge Cases + Deploy | `feat/hedera-edge-cases` | NOT STARTED | Needs Phase 2A merged |
| 4. RBAC + White-Label | `feat/adi-rbac-whitelabel` | NOT STARTED | Needs Phases 1+3, with Dev B |
| 5. Frontend Integration | `feat/frontend-adi-hedera` | NOT STARTED | With Dev C |
| 6. E2E + Bounty Compliance | `develop` / `feat/polish` | NOT STARTED | Final phase |

---

## Phase 1 — ADI Core Contracts

**Branch:** `feat/adi-core` (create from `develop`)
**Directory:** `packages/contracts-adi/src/`
**Tests:** `packages/contracts-adi/test/`

```bash
git checkout develop && git checkout -b feat/adi-core
```

### 1.1 — `AccessControl.sol` → `packages/contracts-adi/src/AccessControl.sol`

RBAC system with 4 roles for the entire InstiVault platform.

**Roles:**
- `ADMIN_ROLE` — grant/revoke all roles, manage whitelist, admin operations
- `ISSUER_ROLE` — create tokens (RWATokenFactory), create/manage vaults (VaultManager)
- `INVESTOR_ROLE` — deposit/withdraw from vaults
- `AUDITOR_ROLE` — read-only access (view functions only)

**Features:**
- [x] Inherit from OpenZeppelin `AccessControl` (`@openzeppelin/contracts/access/AccessControl.sol`)
- [x] Define `bytes32` role constants for each role
- [x] KYC whitelist: `mapping(address => bool) private _whitelist`
- [x] `addToWhitelist(address)` — `ADMIN_ROLE` only
- [x] `removeFromWhitelist(address)` — `ADMIN_ROLE` only
- [x] `addToWhitelistBatch(address[])` — `ADMIN_ROLE` only (bonus)
- [x] `isWhitelisted(address) → bool` — public view
- [x] `checkWhitelisted(address)` — reverts with custom error if not whitelisted
- [x] Events: `WhitelistUpdated(address account, bool status)`
- [x] Constructor: deployer gets `DEFAULT_ADMIN_ROLE` + `ADMIN_ROLE`

### 1.2 — `RWATokenFactory.sol` → `packages/contracts-adi/src/RWATokenFactory.sol`

Factory that deploys ERC-20 tokens representing real-world assets with on-chain metadata.

**Struct `AssetMetadata`:**
```solidity
struct AssetMetadata {
    string isin;         // International Securities Identification Number
    uint256 rate;        // Annual coupon rate in basis points (e.g., 500 = 5%)
    uint256 maturity;    // Maturity date as unix timestamp
    address issuer;      // Issuer address
    string name;         // Token name (e.g., "French Gov Bond 2030")
    string symbol;       // Token symbol (e.g., "FGB30")
}
```

**Features:**
- [x] `createToken(TokenParams)` — restricted to `ISSUER_ROLE`
- [x] Deploys a new `RWAToken` contract
- [x] Registry: `mapping(string => address) tokenByISIN` + `mapping(address => bool) isRegistered` + `address[] allTokens`
- [x] `getTokenCount()`, `getTokenAt(index)`, `getAllTokens()`, `tokenByISIN(isin)`
- [x] ISIN uniqueness enforced
- [x] Events: `TokenCreated(address indexed token, string isin, address indexed issuer, string name, string symbol)`

### 1.2b — `RWAToken.sol` → `packages/contracts-adi/src/RWAToken.sol`

Individual ERC-20 token deployed by the factory.

- [x] Extends OpenZeppelin `ERC20` + `ERC20Burnable`
- [x] Stores `AssetMetadata` (isin, rate, maturity, issuer)
- [x] `mint(address to, uint256 amount)` — restricted to factory or issuer
- [x] Transfer hook (`_update`): check sender & receiver are whitelisted via `AccessControl` contract
- [x] Constructor receives: ConstructorParams struct (name, symbol, isin, rate, maturity, issuer, initialSupply, accessControl, factory)

### 1.3 — `VaultManager.sol` → `packages/contracts-adi/src/VaultManager.sol`

Manages vaults that hold collections of RWA tokens.

**Struct:**
```solidity
enum VaultStatus { Active, Paused, Closed }

struct Vault {
    uint256 id;
    address owner;
    VaultStatus status;
    uint256 createdAt;
}
```

**Features:**
- [x] `createVault()` — restricted to `ISSUER_ROLE`, returns vaultId
- [x] `deposit(uint256 vaultId, address token, uint256 amount)` — `INVESTOR_ROLE` + whitelisted + token registered
- [x] `withdraw(uint256 vaultId, address token, uint256 amount)` — `INVESTOR_ROLE`, checks balance
- [ ] `allocate(uint256 vaultId, address token, uint256 amount)` — `ISSUER_ROLE` (deferred to Phase 2B)
- [x] `getVaultInfo(uint256 vaultId)` — public view
- [x] `getVaultBalance(uint256 vaultId, address token)` — public view
- [x] `getDepositorBalance(uint256 vaultId, address token, address depositor)` — public view
- [x] `getVaultTokens(uint256 vaultId)` — public view (tracks all deposited tokens per vault)
- [x] `pauseVault` / `unpauseVault` / `closeVault` — `ADMIN_ROLE`
- [x] Events: `VaultCreated`, `Deposited`, `Withdrawn`, `VaultStatusChanged`
- [x] Modifiers: `vaultExists`, `vaultActive`, `onlyIssuer`, `onlyInvestor`, `onlyAdmin`
- [x] Custom errors: `NotIssuer`, `NotInvestor`, `NotAdmin`, `NotWhitelisted`, `VaultNotActive`, `VaultDoesNotExist`, `InsufficientBalance`, `TokenNotRegistered`, `ZeroAmount`

### 1.4 — Tests → `packages/contracts-adi/test/`

- [x] `AccessControl.t.sol` — 17 tests: role assignment/revocation, whitelist (single/batch/remove), unauthorized reverts, events
- [x] `RWATokenFactory.t.sol` — 13 tests: create token, metadata, ISIN uniqueness, KYC transfer enforcement, mint ACL, events
- [x] `VaultManager.t.sol` — 27 tests: create/deposit/withdraw lifecycle, multi-investor, vault status (pause/unpause/close), token tracking, all error paths, events

### 1.5 — PR Workflow

```bash
cd packages/contracts-adi && forge test -vvv
git add packages/contracts-adi/
git commit -m "feat: ADI core contracts — AccessControl, RWATokenFactory, VaultManager"
git push -u origin feat/adi-core
gh pr create --base develop --title "feat: ADI core contracts" --body "AccessControl (RBAC 4 roles + KYC whitelist), RWATokenFactory (ERC-20 + on-chain metadata), VaultManager (lifecycle management)"
```

**After merge:** update Progress Tracker above → `DONE`

---

## Phase 2A — Hedera Contracts

**Branch:** `feat/hedera-core` (create from `develop`)
**Solidity:** `packages/contracts-hedera/contracts/`
**TypeScript:** `packages/contracts-hedera/src/`

```bash
git checkout develop && git pull origin develop && git checkout -b feat/hedera-core
```

### 2A.1 — `CouponScheduler.sol` → `packages/contracts-hedera/contracts/CouponScheduler.sol`

Scheduled coupon payments. **CRITICAL BOUNTY REQUIREMENT: scheduling must be initiated FROM the smart contract, not off-chain.**

**Enums & Structs:**
```solidity
enum Frequency { Monthly, Quarterly, SemiAnnual, Annual }
enum PaymentStatus { Scheduled, Executed, Failed, Suspended }

struct Bond {
    uint256 id;
    address token;           // RWA token address
    uint256 rate;            // Coupon rate (basis points)
    Frequency frequency;
    uint256 startDate;
    uint256 maturityDate;
    address issuer;
}

struct ScheduledPayment {
    uint256 bondId;
    uint256 paymentDate;
    uint256 amount;
    PaymentStatus status;
}
```

**Features:**
- [ ] `registerBond(Bond)` — registers a bond for coupon scheduling
- [ ] `computePaymentDates(uint256 bondId) → uint256[]` — pure/view, computes all dates from bond params
- [ ] `scheduleCoupon(uint256 bondId, uint256 paymentDate)` — initiates Hedera scheduled transaction **from contract**
- [ ] `executeCoupon(uint256 bondId, uint256 paymentDate)` — callback when scheduled tx executes
- [ ] `getScheduledPayments(uint256 bondId) → ScheduledPayment[]` — view
- [ ] Events: `CouponScheduled(uint256 bondId, uint256 paymentDate, uint256 amount)`, `CouponExecuted(uint256 bondId, uint256 paymentDate)`

### 2A.2 — `YieldDistributor.sol` → `packages/contracts-hedera/contracts/YieldDistributor.sol`

Pro-rata yield distribution with snapshot mechanism.

**Features:**
- [ ] `distribute(address token, uint256 totalYield)` — creates snapshot, records pro-rata shares
- [ ] Snapshot: record each holder's balance at distribution time (`snapshotId → holder → balance`)
- [ ] `claimYield(address token, uint256 snapshotId)` — holder claims their share, one-time only
- [ ] `getUnclaimedYield(address holder, address token) → uint256` — view
- [ ] `getSnapshotInfo(uint256 snapshotId)` — view
- [ ] Double-claim protection (mapping of claimed snapshots per holder)
- [ ] Events: `YieldDistributed(address token, uint256 totalYield, uint256 snapshotId)`, `YieldClaimed(address holder, uint256 amount, uint256 snapshotId)`

### 2A.3 — TypeScript SDK Scripts → `packages/contracts-hedera/src/`

- [ ] `config.ts` — Hedera client setup (operator ID + key from `.env`)
- [ ] `deploy.ts` — deploy both contracts to Hedera Testnet via Hedera Smart Contract Service
- [ ] `schedule-coupon.ts` — helper to interact with CouponScheduler + Hedera Schedule Service

### 2A.4 — Tests

- [ ] `CouponScheduler.t.sol` — payment date computation, scheduling, edge cases
- [ ] `YieldDistributor.t.sol` — pro-rata math, snapshot, claim, double-claim prevention

### 2A.5 — PR

```bash
git add packages/contracts-hedera/
git commit -m "feat: Hedera contracts — CouponScheduler, YieldDistributor"
git push -u origin feat/hedera-core
gh pr create --base develop --title "feat: Hedera core contracts" --body "CouponScheduler (Schedule Service integration), YieldDistributor (pro-rata with snapshots)"
```

---

## Phase 2B — ADI Token Logic

**Branch:** `feat/adi-token-logic` (create from `develop` **after Phase 1 is merged**)
**Directory:** `packages/contracts-adi/src/`

```bash
git checkout develop && git pull origin develop && git checkout -b feat/adi-token-logic
```

### 2B.1 — Fractionalization

- [ ] Add `fractionalize(address token, uint256 fractions)` — splits asset into N equal ERC-20 shares
- [ ] Track: `mapping(address => address[]) public fractionalizedTokens` (original → fractions)

### 2B.2 — Burn-at-Maturity

- [ ] `RWAToken.burnAtMaturity()` — callable only after `maturityDate` has passed
- [ ] Burns all caller's tokens + triggers nominal reimbursement
- [ ] Final payment: last coupon + nominal value + burn in single tx
- [ ] Guard: `require(block.timestamp >= maturity, "Not mature")`
- [ ] Prevent double-burn per holder

### 2B.3 — Integration Tests

- [ ] Full lifecycle: `mint → transfer → coupon → maturity → burn`
- [ ] Edge: transfer between coupons, partial holdings at maturity

### 2B.4 — PR

```bash
git add packages/contracts-adi/
git commit -m "feat: ADI token logic — fractionalization, burn-at-maturity"
git push -u origin feat/adi-token-logic
gh pr create --base develop --title "feat: ADI token logic" --body "..."
```

---

## Phase 3 — Hedera Edge Cases + Deployments

**Branch:** `feat/hedera-edge-cases` (from `develop`, **after Phase 2A merged**)

```bash
git checkout develop && git pull origin develop && git checkout -b feat/hedera-edge-cases
```

### 3.1 — Edge Cases
- [ ] Insufficient liquidity: suspend payment, emit `PaymentSuspended` event
- [ ] All-or-nothing execution (no silent partial payments)
- [ ] Missed payment recovery logic

### 3.2 — Deployment Scripts
- [ ] `packages/contracts-adi/script/Deploy.s.sol` — Foundry deployment script for ADI chain
- [ ] `packages/contracts-hedera/src/deploy.ts` — deploy to Hedera Testnet
- [ ] Record deployed addresses in `deployments.json` at package root

### 3.3 — E2E Test
- [ ] Script: schedule → execute → verify balances on Hedera Testnet

### 3.4 — PR

```bash
git add packages/contracts-adi/ packages/contracts-hedera/
git commit -m "feat: Hedera edge cases + deployment scripts"
git push -u origin feat/hedera-edge-cases
gh pr create --base develop --title "feat: Hedera edge cases + deployments" --body "..."
```

---

## Phase 4 — RBAC + White-Label (with Dev B)

**Branch:** `feat/adi-rbac-whitelabel` (from `develop`, **after Phases 1+3 merged**)

```bash
git checkout develop && git pull origin develop && git checkout -b feat/adi-rbac-whitelabel
```

### 4.1 — `InstitutionRegistry.sol` → `packages/contracts-adi/src/InstitutionRegistry.sol`
- [ ] Multi-tenant: each institution gets its own namespace (own AccessControl + TokenFactory + VaultManager)
- [ ] `registerInstitution(string name, address admin)` — `ADMIN_ROLE` only
- [ ] Institution → deployed contracts mapping

### 4.2 — Multisig / Admin-Gated
- [ ] Critical ops require multisig or admin approval
- [ ] Consider OpenZeppelin `TimelockController` or simple 2-of-N pattern

### 4.3 — Coordinate with Dev B
- [ ] Align role names between ADI RBAC and Canton visibility model

### 4.4 — PR

```bash
git commit -m "feat: RBAC white-label + multi-tenant registry"
git push -u origin feat/adi-rbac-whitelabel
gh pr create --base develop --title "feat: RBAC white-label + multi-tenant" --body "..."
```

---

## Phase 5 — Frontend Integration Support (with Dev C)

**Branch:** `feat/frontend-adi-hedera` (Dev C leads)

Dev A tasks:
- [ ] Provide ABI files (auto-generated by Foundry in `packages/contracts-adi/out/`)
- [ ] Write/review backend bridge endpoints for ADI (tokenization, vault CRUD)
- [ ] Write/review backend bridge endpoints for Hedera (scheduling, payment status)
- [ ] Test contract interactions end-to-end from frontend

---

## Phase 6 — Bounty Compliance Checklists

### ADI Bounty (MUST HAVE)
- [ ] MVP deployed on ADI chain
- [ ] Real economic utility (tokenization + vault management + KYC whitelist)
- [ ] White-label ready (multi-tenant `InstitutionRegistry`)
- [ ] RBAC enforced (Admin, Issuer, Investor, Auditor — 4 roles)
- [ ] Multisig or admin-gated critical operations

### Hedera Bounty (MUST HAVE)
- [ ] Hedera Schedule Service used for coupon payments
- [ ] Scheduling initiated **FROM the smart contract** (not off-chain) — this is the #1 requirement
- [ ] Coupon payments distributed pro-rata to token holders
- [ ] Deployed on Hedera Testnet with working demo

---

## Branch Dependency Map

```
develop
├── feat/adi-core ───────────────────┐ (Phase 1, no dependency)
├── feat/hedera-core ────────────────┤ (Phase 2A, no dependency)
├── feat/adi-token-logic ◄───────────┤ (Phase 2B, needs Phase 1 merged)
├── feat/hedera-edge-cases ◄─────────┤ (Phase 3, needs Phase 2A merged)
├── feat/adi-rbac-whitelabel ◄───────┤ (Phase 4, needs Phases 1+3 merged)
└── feat/frontend-adi-hedera ◄───────┘ (Phase 5, needs all above merged)
```

| Order | Branch | Package(s) | Depends on | PR → |
|-------|--------|------------|------------|------|
| 1 | `feat/adi-core` | `contracts-adi` | — | `develop` |
| 2 | `feat/hedera-core` | `contracts-hedera` | — | `develop` |
| 3 | `feat/adi-token-logic` | `contracts-adi` | Phase 1 merged | `develop` |
| 4 | `feat/hedera-edge-cases` | both | Phase 2A merged | `develop` |
| 5 | `feat/adi-rbac-whitelabel` | `contracts-adi` | Phases 1+3 | `develop` |
| 6 | `feat/frontend-adi-hedera` | cross-package | All above | `develop` |

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `forge build` | Compile ADI contracts |
| `forge test -vvv` | Run ADI tests (verbose) |
| `forge test --match-contract AccessControl` | Run specific test file |
| `forge script script/Deploy.s.sol --broadcast` | Deploy ADI contracts |
| `pnpm --filter contracts-hedera run test` | Run Hedera tests |
| `git checkout develop && git pull` | Sync with latest develop |

## Conventions

- **Solidity ^0.8.20** — do not change compiler version
- **OpenZeppelin v5.5** — installed at `lib/openzeppelin-contracts/`, import via `@openzeppelin/`
- **Foundry** — `forge build`, `forge test`, `forge script` for ADI contracts
- **No secrets** — use `.env` files, never commit them
- **Formatting** — Prettier (single quotes, trailing commas, 100 char width) for TS; `forge fmt` for Solidity

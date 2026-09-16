<div align="center">

# 🗻 Metaphor

**A confidential, automated RWA hub for institutions: bonds tokenized on ADI Chain, negotiated in Canton data rooms the rest of the market cannot see, paid on a Hedera schedule with no keeper, and reviewed by an AI on 0G that never signs.**

[![ADI Chain](https://img.shields.io/badge/ADI%20Chain-Testnet%20(99999)-2563eb?style=flat-square)](https://explorer.ab.testnet.adifoundation.ai/address/0xab3cbc56d958245a2688b2171417679e743b1daf)
[![Hedera](https://img.shields.io/badge/Hedera-Schedule%20Service%20(0x16b)-7c3aed?style=flat-square)](https://hashscan.io/testnet/contract/0.0.7996912)
[![Canton](https://img.shields.io/badge/Canton-Daml%203.4-0f9d58?style=flat-square)](packages/contracts-canton)
[![0G](https://img.shields.io/badge/0G-Compute-1a1a1a?style=flat-square)](packages/ai-engine)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24%20%C2%B7%20Foundry-363636?style=flat-square)](packages/contracts-adi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

🏅 **Finalist — ADI Foundation, Open Project Submission ($300) · ETHDenver 2026**

**[Video demo](https://youtu.be/Dr8bLcU3o6A)** · **[Specification](./docs/SPEC.md)** · **[Bounty compliance](./docs/BOUNTY_COMPLIANCE.md)** · **[Demo guide](./docs/DEMO_GUIDE.md)**

</div>

Institutions that tokenize bonds on a public chain show their positions to the whole market, pay
coupons from a cron job on a server, and run risk analysis in spreadsheets that never see the ledger.
Metaphor gives each of those jobs to the chain built for it, behind a single dashboard: issuance and
access control on ADI Chain, confidential negotiation on Canton, coupon payments scheduled by the
Hedera network itself, and risk analysis on 0G Compute with a human approving every recommendation.
Four chains, one interface.

> 🏅 **Finalist on the ADI Foundation bounty at [ETHDenver 2026](https://ethdenver2026.devfolio.co/), Denver, February 2026.**
> One of the flagship Ethereum events of the year, with 186 projects submitted to its BUIDLathon.
> Three students from DeVinci Blockchain built Metaphor there for the New France Village track and
> four sponsor bounties at once (ADI Foundation, Canton Network, Hedera and 0G Labs), and it was named
> a finalist on ADI Foundation's $25,000 Open Project Submission bounty.

## Table of contents

- [How it works](#how-it-works)
- [Four chains, one interface](#four-chains-one-interface)
- [Architecture](#architecture)
- [Deployed contracts](#deployed-contracts)
- [What's live vs. simulated](#whats-live-vs-simulated)
- [Getting started](#getting-started)
- [Tests](#tests)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Team](#team)
- [License](#license)

## How it works

The life of a tokenized bond, from issuance to coupon:

1. **Issue on ADI Chain.** An issuer mints an ERC-20 through `RWATokenFactory`, with the ISIN, coupon
   rate, maturity and issuer written on chain. A transfer only settles when both wallets are
   whitelisted, and a token can be fractionalized into sub-tokens.
2. **Hold it in a vault.** `VaultManager` groups tokens into vaults (create, deposit, withdraw,
   allocate) behind four on-chain roles, Admin, Issuer, Investor and Auditor, and an emergency pause.
3. **Negotiate on Canton.** The data room is a Daml contract. The owner sees everything,
   counterparties see the composition and propose trades, an auditor holds a separate `AuditRight`
   with aggregate figures only, and for everyone else the contract does not exist.
4. **Pay the coupons on Hedera.** `CouponScheduler` registers the bond, derives its payment dates and
   schedules each coupon from Solidity through the Schedule Service precompile at `0x16b`: the network
   itself calls the payment on its date, with no keeper and no cron job. A payment is all or nothing:
   without enough liquidity it is marked failed, never paid in part. The issuer then distributes the
   coupon pro rata to holders through `YieldDistributor`, from a snapshot.
5. **Review the risk on 0G.** The AI engine sends the vault to 0G Compute and gets back a risk report
   validated against a schema: a global score, an analysis per position, stress tests and
   recommendations. Each recommendation waits for a human approval, and the AI has no signing
   authority.

Institutions come in as tenants: `InstitutionRegistry` gives each one its own isolated set of
contracts (access control, token factory, vault manager), and registering an institution takes two
admin approvals. Signing in is a wallet signature (EIP-191) exchanged for a 24-hour JWT whose roles are
read on chain.

## Four chains, one interface

| Layer | Where | What runs there |
|---|---|---|
| Issuance and access | **ADI Chain** (99999), also on Sepolia | `InstiVaultAccessControl` (four roles, whitelist) · `RWAToken` · `RWATokenFactory` · `VaultManager` · `InstitutionRegistry` (white-label tenants, two approvals) · `InstitutionDeployer` |
| Confidentiality | **Canton** (Daml) | nine templates in three modules: `ConfidentialVault` (vault, invitation, access right, trade request, settlement), `PrivateTrade` (multi-round offers, agreement), `AuditRight` (invitation, aggregate-only view) |
| Automation | **Hedera Testnet** | `CouponScheduler` (payment dates, scheduling through `IHRC755` and `IHRC1215`) · `YieldDistributor` (snapshot, pro-rata claims) |
| Intelligence | **0G Compute** | `ai-engine`: risk analyzer, strategy simulator and stress tests, reports validated with Zod, a deterministic mock as fallback |

On Canton the visibility is enforced by the ledger, not hidden by the interface:

```
Owner (signatory)          full access: manage parties, trade, settle
Counterparty (observer)    sees the vault composition, proposes trades
Auditor                    separate AuditRight contract, aggregate data only
Everyone else              nothing: the contract does not exist for them
```

Three things the build had to get right:

- **The Hedera sender.** Inside the EVM, `msg.sender` is the ECDSA alias of the account, not the
  long-zero address returned by `AccountId.toSolidityAddress()`. Every script derives the owner from
  the public key; with the long-zero form, `onlyOwner` always reverts.
- **Scheduling from Solidity.** The coupons are scheduled by calling the `0x16b` precompile directly
  from the contract, a pattern with no example in the Hedera documentation at the time.
- **The contract size limit.** `InstitutionRegistry` outgrew the EIP-170 bytecode limit, so deploying a
  tenant's contracts moved to the external `InstitutionDeployer`.

## Architecture

```
                     Next.js dashboard (:3000)
               RainbowKit · wagmi · viem · 10 pages
                                 │
                                 │  EIP-191 sign-in, JWT bearer
                                 ▼
                        Express API (:3001)
             on-chain roles · RBAC · aggregated v1 API
        ┌────────────────┬───────┴───────┬────────────────┐
    ethers.js        ethers.js       JSON API         0G broker
        │                │               │                │
    ADI Chain         Hedera          Canton         0G Compute
     (99999)          Testnet          Daml           inference
   6 contracts      2 contracts     9 templates     risk reports
```

The backend is the only component that talks to the four networks: ethers.js for ADI Chain and for
Hedera's JSON-RPC relay, the JSON API for the Daml ledger, and the 0G serving broker for inference. Its
aggregated `v1` API feeds the dashboard and falls back to demo data when a network is unreachable.

## Deployed contracts

**ADI Chain testnet** (chain 99999, [explorer](https://explorer.ab.testnet.adifoundation.ai/)) and
**Ethereum Sepolia** (chain 11155111):

| Contract | ADI Chain | Sepolia |
|---|---|---|
| `InstiVaultAccessControl` | [`0x8e7d4e14…dd656d`](https://explorer.ab.testnet.adifoundation.ai/address/0x8e7d4e14583a37770c743d33092bbcc4e3dd656d) | [`0x6ccfbc2c…f05043`](https://sepolia.etherscan.io/address/0x6ccfbc2c0d3a794938258d760cba69adbef05043) |
| `RWATokenFactory` | [`0x0ed29f8c…5d7d65`](https://explorer.ab.testnet.adifoundation.ai/address/0x0ed29f8c992bb10515296a301b27cd8f0a5d7d65) | [`0xe6c7cccc…36921b`](https://sepolia.etherscan.io/address/0xe6c7ccccf0ea80816cd4e8fad70270cf5836921b) |
| `VaultManager` | [`0x6b6449bd…c1534f`](https://explorer.ab.testnet.adifoundation.ai/address/0x6b6449bdec04dd8717ac71565c7c065680c1534f) | [`0xa162023b…6b8044`](https://sepolia.etherscan.io/address/0xa162023bd4267a5649025f616016a6ea4f6b8044) |
| `InstitutionRegistry` | [`0xab3cbc56…3b1daf`](https://explorer.ab.testnet.adifoundation.ai/address/0xab3cbc56d958245a2688b2171417679e743b1daf) | [`0x442ec1e3…031002`](https://sepolia.etherscan.io/address/0x442ec1e3079e6db66c24af692b43e7b756031002) |
| `InstitutionDeployer` | [`0x6804fc93…66179b`](https://explorer.ab.testnet.adifoundation.ai/address/0x6804fc931cc3db9543b07581c3aedcf1fa66179b) | [`0x531d24ca…1bb274`](https://sepolia.etherscan.io/address/0x531d24caee73fcabe1486036821d85b3111bb274) |

**Hedera Testnet:**

| Contract | Hedera ID | EVM address |
|---|---|---|
| `CouponScheduler` | [`0.0.7996912`](https://hashscan.io/testnet/contract/0.0.7996912) | `0x…007a05f0` |
| `YieldDistributor` | [`0.0.7996914`](https://hashscan.io/testnet/contract/0.0.7996914) | `0x…007a05f2` |

The twelve contracts were still deployed on 16 September 2026. The Daml package runs on a local Canton
sandbox, set up as described in [`packages/contracts-canton`](packages/contracts-canton/README.md).

## What's live vs. simulated

- **On chain:** the ADI contracts on ADI Chain testnet and Sepolia, and `CouponScheduler` and
  `YieldDistributor` on Hedera Testnet, where `CouponScheduler` holds five registered bonds with their
  coupon dates computed on chain.
- **Canton:** the Daml contracts pass 28 Daml Script tests and run on a local sandbox. The deployment
  on Canton's Devnet L1 asked for by the bounty was not done.
- **0G:** the engine calls 0G Compute when a provider is configured, and otherwise returns a
  deterministic mock report (`ZG_USE_MOCK=true` in `.env.example`).
- **Dashboard:** the aggregated API reads the contracts and falls back to demo data when a network is
  unreachable or empty, so parts of the dashboard can show demo figures.
- **No hosted deployment:** the product is shown in the [video demo](https://youtu.be/Dr8bLcU3o6A) and
  runs locally with the steps below.

## Getting started

Prerequisites: Node 20+, pnpm 9+ and Foundry. The Canton package also needs Java 17+ and DPM with the
Daml SDK 3.4.11, see [`packages/contracts-canton`](packages/contracts-canton/README.md).

```bash
git clone --recurse-submodules https://github.com/DVB-ANS/Metaphor.git
cd Metaphor
pnpm install

cp .env.example .env          # RPC endpoints, keys and deployed addresses, for every package
set -a && source .env && set +a

pnpm dev:backend              # Express API on http://localhost:3001
pnpm dev:frontend             # Next.js on http://localhost:3000
```

With `DEV_MODE=true`, `POST /api/auth/dev-login` returns a JWT holding the four roles, the quickest way
to open every page locally.

To deploy your own contracts, from the same shell:

```bash
# ADI Chain, or Sepolia with ADI_RPC_URL pointing at a Sepolia RPC
cd packages/contracts-adi
forge script script/Deploy.s.sol --rpc-url "$ADI_RPC_URL" --broadcast    # signs with ADI_PRIVATE_KEY
cd ../..

# Hedera Testnet, with HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY
pnpm --filter contracts-hedera run deploy
pnpm --filter contracts-hedera run register-bond
pnpm --filter contracts-hedera run schedule

# Canton, on a local sandbox (ledger API on 6865, JSON API on 7575)
pnpm build:canton
pnpm --filter contracts-canton run sandbox
```

## Tests

| Package | Framework | Tests |
|---|---|---|
| `contracts-adi` | Forge | 111 |
| `contracts-hedera` | Forge | 74 |
| `contracts-canton` | Daml Script | 28 |
| `ai-engine` | Vitest | 21 |

```bash
pnpm test          # the four suites
pnpm test:adi      # or one at a time: test:hedera, test:canton, test:ai
```

The Forge and Vitest suites were run again on 16 September 2026, 206 tests passing; the Daml suite
needs DPM.

## Tech stack

| Layer | Technology |
|---|---|
| ADI contracts | Solidity 0.8.24, Foundry, OpenZeppelin 5.5 |
| Hedera contracts | Solidity 0.8.24, Foundry, the Schedule Service system contract (`IHRC755`, `IHRC1215`), Hedera SDK |
| Canton contracts | Daml, SDK 3.4.11, DPM |
| AI engine | 0G Compute (`@0glabs/0g-serving-broker`), OpenAI-compatible client, Zod |
| Backend | Express 4, ethers 6, jsonwebtoken, TypeScript (ESM) |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, RainbowKit, wagmi, viem, Recharts, GSAP, Motion |
| Tooling | pnpm workspaces, Forge, Vitest, Prettier |

## Repository structure

```
packages/
  contracts-adi/          Foundry: roles, RWA tokens, vaults, white-label registry (ADI Chain, Sepolia)
  contracts-hedera/       Foundry and Hedera SDK: coupon scheduling, yield distribution, deploy scripts
  contracts-canton/       Daml: confidential vaults, private trades, audit rights, sandbox scripts
  ai-engine/              0G Compute client, risk analyzer, strategy simulator, prompts, mock
  backend/                Express API: wallet sign-in, RBAC, per-chain routes, aggregated v1 API
  frontend/               Next.js dashboard, 10 pages
docs/
  SPEC.md                 specification: features, data flows, API endpoints, constraints
  BOUNTY_COMPLIANCE.md    every bounty requirement, with its evidence
  DEMO_GUIDE.md           the demo walkthrough, with the commands that check each step on chain
```

## Team

Three students from **DeVinci Blockchain**, Paris, at ETHDenver 2026.

| | Role | |
|---|---|---|
| **Sofiane Ben Taleb** | frontend and backend | [GitHub](https://github.com/gamween) · [LinkedIn](https://www.linkedin.com/in/sofiane-ben-taleb/) |
| **Noé Wales** | Solidity contracts on ADI Chain and Hedera, backend integration | [GitHub](https://github.com/CHAAIISE) · [LinkedIn](https://www.linkedin.com/in/no%C3%A9-w/) |
| **Armand Séchon** | Daml contracts on Canton, AI engine on 0G | [GitHub](https://github.com/STOOOKEEE) · [LinkedIn](https://www.linkedin.com/in/armand-sechon/) |

## License

[MIT](LICENSE) © 2026 Sofiane Ben Taleb, Noé Wales and Armand Séchon. The Hedera system-contract
interfaces vendored in `packages/contracts-hedera/contracts/hedera-deps/` keep their Apache-2.0
license.

<div align="center">
<sub>Built for ETHDenver 2026 · New France Village track · ADI Foundation, Canton Network, Hedera and 0G Labs bounties</sub>
</div>

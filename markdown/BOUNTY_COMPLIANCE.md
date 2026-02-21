# Outward — Bounty Compliance

## ADI Foundation

> MVP on ADI chain with real economic utility, white-label ready, RBAC/multisig.

| Requirement | Status | Evidence |
|---|---|---|
| MVP deployed on ADI chain | Done | Chain 99999 — 5 contracts deployed ([addresses](./DEPLOYED_CONTRACTS.md)) |
| Also deployed on Sepolia | Done | Chain 11155111 — same 5 contracts |
| Real economic utility | Done | Tokenization + vault management + fractional ownership + coupon lifecycle |
| White-label ready | Done | `InstitutionRegistry` — multi-tenant, each institution gets isolated contracts |
| RBAC | Done | `InstiVaultAccessControl` — 4 roles: Admin, Issuer, Investor, Auditor + whitelisting |
| Multisig | Done | `InstitutionRegistry` — 2-of-N multisig proposals for institution registration |
| Pausable | Done | `VaultManager` — emergency pause on all vault operations |
| Tests | Done | **111 tests passing** (AccessControl: 17, TokenFactory: 28, VaultManager: 42, InstitutionRegistry: 24) |

### Contracts

| Contract | Purpose |
|---|---|
| `InstiVaultAccessControl` | RBAC (4 roles) + wallet whitelisting + batch operations |
| `RWAToken` | ERC-20 with on-chain RWA metadata (ISIN, rate, maturity, issuer) + whitelist transfer restrictions + burn-at-maturity |
| `RWATokenFactory` | Factory for creating RWA tokens + fractionalization into sub-tokens |
| `VaultManager` | Vault lifecycle (create, deposit, withdraw, allocate, deallocate) + multi-token + Pausable |
| `InstitutionRegistry` | Multi-tenant white-label registry + 2-of-N multisig proposals + deployer integration |
| `InstitutionDeployer` | External deployer (EIP-170 bytecode size workaround) |

---

## Canton Network

> Native Daml contracts, deployed on Canton, visibility separation demo.

| Requirement | Status | Evidence |
|---|---|---|
| Native Daml (no wrappers) | Done | 3 Daml modules: `ConfidentialVault`, `PrivateTrade`, `AuditRight` |
| Deployed on Canton | Done | LocalNet sandbox — DAR built, uploaded, transactions verified |
| Visibility separation demo | Done | 28 tests + live sandbox demo: Bob sees 0 vaults → add as counterparty → sees 1 vault |
| Tests | Done | **28 tests passing** (ConfidentialVault: 14, PrivateTrade: 7, AuditRight: 7) |
| Template coverage | Done | 9/9 templates created (100%), 26/39 choices exercised (66.7%) |

### Templates

| Template | Module | Purpose |
|---|---|---|
| `ConfidentialVault` | ConfidentialVault | Main vault — owner is signatory, counterparties are observers |
| `VaultInvitation` | ConfidentialVault | Propose/Accept invitation pattern for vault access |
| `VaultAccessRight` | ConfidentialVault | Proof of granted access (dual-signatory) |
| `TradeRequest` | ConfidentialVault | Bilateral trade request (owner + requester only) |
| `TradeSettlement` | ConfidentialVault | Immutable record of settled trade |
| `TradeProposal` | PrivateTrade | Multi-round offer/counter-offer negotiation |
| `TradeAgreement` | PrivateTrade | Binding trade agreement after negotiation |
| `AuditInvitation` | AuditRight | Owner invites auditor with compliance data |
| `AuditRight` | AuditRight | Limited audit view — aggregate data only, no counterparties or trade terms |

### Visibility Model

```
Owner (signatory)       → full access: create, modify, manage parties, trade
Counterparty (observer) → can see vault composition, propose trades
Auditor                 → separate AuditRight contract: aggregate data only
Public                  → sees nothing — vault does not exist
```

---

## Hedera

> Hedera Schedule Service usage, coupon payments, initiated from smart contract.

| Requirement | Status | Evidence |
|---|---|---|
| Hedera Schedule Service | Done | `CouponScheduler` uses precompile `0x16b` (IHRC755 + IHRC1215) |
| Coupon payments | Done | Automatic computation of payment dates from bond parameters |
| Initiated from smart contract | Done | `scheduleCoupon()` and `scheduleAllCoupons()` call Schedule Service directly from Solidity |
| Access control | Done | `executeCoupon` restricted to self-call / issuer / owner |
| Pausable | Done | Scheduling operations can be paused |
| Deployed on Hedera Testnet | Done | CouponScheduler: `0.0.7996912`, YieldDistributor: `0.0.7996914` |
| Tests | Done | **74 tests passing** (CouponScheduler: 50, YieldDistributor: 24) |

### Contracts

| Contract | Purpose |
|---|---|
| `CouponScheduler` | Bond registration, payment date computation (monthly/quarterly/semi-annual/annual), coupon scheduling via Hedera precompile, execution with liquidity checks |
| `YieldDistributor` | Snapshot-based pro-rata yield distribution to bond holders, claim mechanism |
| `HederaScheduleService` | Abstract base for Hedera precompile interaction (IHRC755 + IHRC1215) |

### Coupon Flow

```
1. registerBond(token, paymentToken, faceValue, rate, frequency, startDate, maturityDate)
2. Payment dates auto-computed from parameters
3. scheduleAllCoupons() → creates Hedera scheduled transactions via precompile 0x16b
4. At payment date → executeCoupon() distributes pro-rata to holders
5. Insufficient liquidity → payment suspended, alert emitted (no silent partial execution)
```

---

## 0G Labs

> 0G Compute inference, structured decisions, human-in-the-loop approval.

| Requirement | Status | Evidence |
|---|---|---|
| 0G Compute integration | Done | `ai-engine` package with `0g-client.ts` — broker setup, provider discovery, inference calls |
| Structured decisions | Done | `RiskReport` schema (Zod validated): globalScore, riskLevel, assetAnalysis, recommendations, stressTests |
| Human-in-the-loop | Done | AI NEVER executes transactions — every recommendation requires explicit user approval via `POST /api/ai/reports/:id/approve` |
| Mock fallback | Done | `ZG_USE_MOCK=true` → deterministic mock analysis for demo/testing |
| Backend wired | Done | `ai-engine` workspace package imported by backend, adapter layer converts types |

### AI Output Structure

```json
{
  "reportId": "report-006",
  "riskScore": 36,
  "riskLevel": "moderate",
  "recommendations": [
    {
      "id": "report-006-rec-1",
      "action": "hold",
      "description": "Portfolio is well balanced. No immediate action required.",
      "status": "pending_approval"
    }
  ],
  "stressTests": [
    { "scenario": "Central bank rate +1%", "impact": "-2.5%" },
    { "scenario": "Central bank rate +2%", "impact": "-5.1%" },
    { "scenario": "Default of highest-risk issuer", "impact": "-40.0%" }
  ],
  "positionAnalysis": [
    { "name": "France OAT 2028", "score": 38, "riskLevel": "moderate", "comment": "..." }
  ]
}
```

### Human-in-the-Loop Flow

```
1. User clicks "Analyze this vault"  → POST /api/ai/analyze
2. AI returns structured report      → displayed in dashboard
3. User reviews recommendations
4. User clicks "Approve"             → POST /api/ai/reports/:id/approve
5. Status changes from pending_approval → approved
6. Backend prepares unsigned tx       → frontend requests wallet signature
7. AI NEVER has signing authority
```

---

## Test Summary

| Package | Tests | Status |
|---|---|---|
| `contracts-adi` (Foundry) | 111 | All passing |
| `contracts-hedera` (Foundry) | 74 | All passing |
| `contracts-canton` (Daml) | 28 | All passing |
| `ai-engine` (TypeScript) | Mock verified | Working |
| `backend` (TypeScript) | Build clean | E2E flow verified |
| **Total** | **213+** | **All passing** |

## E2E Flow Verified

```
Auth (dev-login)     → JWT with 4 roles              ✓
Dashboard (V1 API)   → $6.3M total, 2 vaults, 6 payments  ✓
AI Analysis          → Score 36/100, 3 positions, 4 stress tests  ✓
Approve (HITL)       → pending_approval → approved    ✓
Reports list         → 6 reports, normalized format   ✓
Hedera payments      → 6 scheduled coupons from on-chain  ✓
```

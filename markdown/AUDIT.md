# Metaphor — Full Project Audit

> Date: February 21, 2026 | Branch: `develop` | Commit: `43f495c`

---

## 1. Project Health Score: 52/100

| Category | Score | Weight | Details |
|----------|-------|--------|---------|
| Security | 4/10 | x4 | 3 CRITICAL (hardcoded keys, JWT secret fallback), 6 HIGH |
| Smart Contracts | 7/10 | x3 | 1 CRITICAL logic bug, 2 HIGH (DoS vectors), good test coverage |
| Code Quality | 5/10 | x3 | 77+ `any` types, 9 console.log (backend), alert() usage |
| Architecture | 8/10 | x2 | Clean monorepo, proper separation, good fallbacks |
| Testing | 5/10 | x2 | 213+ contract tests, 0 backend tests, 0 frontend tests |
| DevOps | 2/10 | x2 | No CI/CD, no linting pipeline, no pre-commit hooks |
| Documentation | 8/10 | x1 | SPEC.md, README.md, CLAUDE.md all consistent |

---

## 2. Severity Summary

| Severity | Count | Breakdown |
|----------|-------|-----------|
| **CRITICAL** | 5 | Backend: 3, Contracts: 1, AI: 1 |
| **HIGH** | 12 | Backend: 6, Contracts: 3, Frontend: 3 |
| **MEDIUM** | 18 | Across all packages |
| **LOW** | 12 | Across all packages |
| **TOTAL** | **47** | |

---

## 3. CRITICAL Findings (fix before demo)

### C1. Hardcoded Private Keys Committed to Git
**Severity:** CRITICAL | **Package:** Backend
**Files:** `packages/backend/.env` (committed), `packages/backend/src/config.ts:34`

```
ADI_PRIVATE_KEY=0x086770b56038738eb84b22c53ec2e368a702087ffc2fc77f28d34deb9caaef66
ZG_PRIVATE_KEY=0xd0c53762ad996f7954a1dd44fb9f4a2fa8301d985cb2622290a666a61172e77d
HEDERA_PRIVATE_KEY fallback: 0x05a0252ccdfea79d6ba3b8a222e365108414f50b6edebc9a6d68dadc0f4d4cf2
```

**Impact:** Complete compromise of ADI signer, 0G account, and Hedera signer. Keys are in git history forever.
**Fix:** Rotate ALL keys immediately. Remove `.env` from git history (BFG/filter-branch). Remove hardcoded fallbacks in `config.ts`.

---

### C2. Hardcoded JWT Secret Fallback
**Severity:** CRITICAL | **Package:** Backend
**File:** `packages/backend/src/middleware/auth.ts:6`

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'metaphor-dev-secret';
```

**Impact:** If env var missing, anyone can forge valid JWTs with any role.
**Fix:** Remove fallback. Crash on startup if `JWT_SECRET` is not set.

---

### C3. InstitutionRegistry Proposal ID 0 Bug
**Severity:** CRITICAL | **Package:** contracts-adi
**File:** `InstiVaultAccessControl.sol` — `approveProposal()`, `executeProposal()`

```solidity
if (p.id == 0 && proposalId != 0) revert ProposalNotFound(proposalId);
```

Proposal IDs start at 0 (`_nextProposalId++`). The first proposal can never be approved or executed because `p.id == 0` is true for both uninitialized AND the first valid proposal.

**Fix:** `if (proposalId >= _nextProposalId) revert ProposalNotFound(proposalId);`

---

### C4. Canton Party Header Impersonation
**Severity:** CRITICAL | **Package:** Backend
**File:** `packages/backend/src/routes/canton.ts:24-25`

```typescript
function getParty(req: Request): string {
  return (req.headers['x-canton-party'] as string) || cantonClient.resolveParty('admin');
}
```

**Impact:** Any user can set `x-canton-party: BNP_Paribas_Admin` header and execute Daml commands as ANY party. Complete authorization bypass on Canton.
**Fix:** Validate header value against authenticated user's wallet/role.

---

### C5. AI Prompt Injection via Custom Scenarios
**Severity:** CRITICAL | **Package:** ai-engine
**File:** `packages/ai-engine/src/strategy-simulator.ts:30-38`

```typescript
customScenarios.map((s, i) => `${i + 1}. ${s}`)  // User input injected into LLM prompt
```

**Impact:** Attacker can inject instructions to manipulate risk scores.
**Fix:** Add Zod validation: `z.string().max(200).regex(/^[a-zA-Z0-9\s\+\-\%\.]+$/)`.

---

## 4. HIGH Findings

| # | Finding | Package | File |
|---|---------|---------|------|
| H1 | Unrestricted CORS (`cors()` with no config) | Backend | `index.ts:40` |
| H2 | Missing input validation on contract calls (addresses, amounts) | Backend | `routes/adi.ts:52,78,89` |
| H3 | No rate limiting on any endpoint | Backend | All routes |
| H4 | AI report file write race condition (concurrent `writeFileSync`) | Backend | `services/ai-client.ts:43` |
| H5 | DEV_MODE auto-provisions all roles on login | Backend | `routes/auth.ts:61-81` |
| H6 | Missing unvalidated vault ID parameter | Backend | `routes/adi.ts:78` |
| H7 | CouponScheduler bond ID 0 validation bug (same pattern as C3) | Contracts | `CouponScheduler.sol:204` |
| H8 | Unbounded loop in `getUnclaimedYield()` — gas DoS | Contracts | `YieldDistributor.sol:143` |
| H9 | Arithmetic underflow risk in `withdraw()` | Contracts | `VaultManager.sol:165` |
| H10 | JWT stored in localStorage (XSS vulnerable) | Frontend | `lib/api.ts:8-17` |
| H11 | No error boundaries in React app | Frontend | Entire app |
| H12 | `alert()`/`confirm()` for critical actions (8 instances) | Frontend | vaults, admin, data-room |

---

## 5. MEDIUM Findings

| # | Finding | Package |
|---|---------|---------|
| M1 | Error messages leak implementation details to clients | Backend |
| M2 | 24 instances of `any` type in backend | Backend |
| M3 | 9 console.log statements in backend | Backend |
| M4 | Canton JWT unsigned (acceptable for Devnet only) | Backend |
| M5 | Missing pagination on list endpoints | Backend |
| M6 | Missing request body size limit | Backend |
| M7 | Missing ReentrancyGuard on CouponScheduler + YieldDistributor | Contracts |
| M8 | Unbounded arrays: `getAllTokens()`, `getVaultTokens()` | Contracts |
| M9 | RWAToken allows silent burn via `transfer(address(0))` | Contracts |
| M10 | 53+ instances of `any` type in frontend | Frontend |
| M11 | No JWT expiry check on session restore | Frontend |
| M12 | Auth race condition (multiple signIn calls) | Frontend |
| M13 | Optimistic updates without rollback | Frontend |
| M14 | Missing form input validation (Issue page) | Frontend |
| M15 | No React.memo on heavy components | Frontend |
| M16 | 0G client: private key in memory without cleanup | AI Engine |
| M17 | No request timeout on 0G inference calls | AI Engine |
| M18 | GSAP + Motion.js redundancy (~500KB waste) | Frontend |

---

## 6. Package-by-Package Status

### contracts-adi (Solidity)
| Metric | Value |
|--------|-------|
| Contracts | 6 |
| Tests | 111 passing |
| Deployed | ADI Chain (99999) + Sepolia |
| Critical bugs | 1 (proposal ID 0) |
| Missing | Pagination on view functions, ReentrancyGuard |

### contracts-hedera (Solidity)
| Metric | Value |
|--------|-------|
| Contracts | 2 (+5 deps) |
| Tests | 74 passing |
| Deployed | Hedera Testnet (live) |
| Critical bugs | 0 (but bond ID 0 HIGH) |
| Missing | Pagination on getUnclaimedYield, ReentrancyGuard |

### contracts-canton (Daml)
| Metric | Value |
|--------|-------|
| Modules | 3 |
| Tests | 28 passing |
| Deployed | NOT DEPLOYED (sandbox only) |
| Critical bugs | 0 |
| Missing | Cross-party attack tests, Devnet deployment |

### ai-engine (TypeScript)
| Metric | Value |
|--------|-------|
| Files | 8 source + 2 prompts |
| Tests | ~20 passing |
| Mode | Mock only (0G not configured) |
| Critical bugs | 1 (prompt injection) |
| Missing | Request timeouts, key cleanup |

### backend (Express)
| Metric | Value |
|--------|-------|
| Routes | 8 files, 50+ endpoints |
| Tests | 0 |
| Running | Yes (port 3001) |
| Critical bugs | 3 (keys, JWT, party header) |
| Missing | Rate limiting, input validation, CORS config, tests |

### frontend (Next.js)
| Metric | Value |
|--------|-------|
| Pages | 10 |
| Components | 31 UI + 3 layout |
| Tests | 0 |
| Running | Yes (port 3000) |
| Critical bugs | 0 (HIGH: localStorage JWT) |
| Missing | Error boundaries, form validation, tests |

---

## 7. Bounty Compliance Checklist

### ADI Foundation
| Requirement | Status | Gap |
|-------------|--------|-----|
| MVP on ADI chain | DEPLOYED | - |
| Real economic utility | YES (tokenization + vaults) | - |
| White-label ready | YES (InstitutionRegistry) | Proposal ID 0 bug (C3) |
| RBAC/multisig | YES (4 roles + 2-of-N) | First proposal blocked |

### Canton Network
| Requirement | Status | Gap |
|-------------|--------|-----|
| Native Daml (no wrappers) | YES | - |
| Deployed on Devnet L1 | **NO** | Code ready, 28 tests, not deployed |
| Visibility separation demo | YES (3-panel demo page) | Party header bypass (C4) |

### Hedera
| Requirement | Status | Gap |
|-------------|--------|-----|
| Schedule Service usage | YES (0x16b precompile) | - |
| Coupon payments | YES (2 bonds registered) | Bond ID 0 bug (H7) |
| Initiated from smart contract | YES (CouponScheduler) | - |

### 0G Labs
| Requirement | Status | Gap |
|-------------|--------|-----|
| 0G Compute inference | CODE READY | Not configured (mock mode) |
| Structured decisions | YES (Zod-validated reports) | - |
| Human-in-the-loop approval | YES (approve/reject) | Prompt injection risk (C5) |

---

## 8. Test Coverage Matrix

| Package | Unit | Integration | E2E | Total |
|---------|------|-------------|-----|-------|
| contracts-adi | 111 | 0 | 0 | 111 |
| contracts-hedera | 74 | 0 | 1 (e2e-test.ts) | 75 |
| contracts-canton | 28 | 0 | 0 | 28 |
| ai-engine | ~20 | 0 | 0 | ~20 |
| backend | 0 | 0 | 0 | **0** |
| frontend | 0 | 0 | 0 | **0** |
| **Total** | **213+** | **0** | **1** | **234** |

### Untested Critical Paths
1. Backend auth flow (nonce -> signature -> JWT)
2. Backend contract interaction error handling
3. Frontend role-gating behavior
4. Frontend form submission flows
5. AI report lifecycle (analyze -> approve -> reject)
6. Canton trade settlement
7. Hedera coupon payment recovery (`recoverPayment`)
8. VaultManager concurrent allocate + withdraw

---

## 9. Priority Action Plan

### IMMEDIATE (before demo)

```
1. [ ] ROTATE ALL PRIVATE KEYS (ADI, Hedera, 0G)
2. [ ] Remove .env from git history
3. [ ] Remove JWT_SECRET and HEDERA_PRIVATE_KEY fallbacks
4. [ ] Fix InstitutionRegistry proposal ID 0 bug
5. [ ] Fix Canton party header validation
6. [ ] Add CORS restrictions (whitelist localhost:3000)
```

### BEFORE SUBMISSION

```
7.  [ ] Deploy Canton contracts to Devnet L1
8.  [ ] Configure 0G Compute endpoint (exit mock mode)
9.  [ ] Add input validation on backend routes
10. [ ] Add rate limiting middleware
11. [ ] Fix CouponScheduler bond ID 0 validation
12. [ ] Add error boundaries to frontend
13. [ ] Replace alert()/confirm() with Dialog components
14. [ ] Add Zod validation to AI custom scenarios
```

### NICE TO HAVE

```
15. [ ] Add CI/CD pipeline (.github/workflows)
16. [ ] Add backend tests (auth, routes)
17. [ ] Add frontend tests (role-gating, forms)
18. [ ] Add pagination to unbounded view functions
19. [ ] Add ReentrancyGuard to Hedera contracts
20. [ ] Replace localStorage JWT with httpOnly cookies
21. [ ] Remove unused three.js dependency
22. [ ] Replace 53+ `any` types with proper interfaces
23. [ ] Add structured logging (replace console.log)
```

---

## 10. Architecture Diagram

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
              DEPLOYED      DEPLOYED    NOT YET    MOCK MODE
```

---

*Generated by Claude Opus 4.6 — Full codebase audit across 6 packages, 47 findings.*

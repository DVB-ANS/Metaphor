# Dev C — Progress Notes

## Phase 1 — Frontend Scaffold + Backend Init (DONE)

### Completed
- [x] Initialize Next.js 16 + TailwindCSS v4 (`packages/frontend/`) — App Router
- [x] Install and configure shadcn/ui (new-york style, neutral, lucide icons)
- [x] Configure wallet connection — RainbowKit 2.x + wagmi 2.x + viem 2.x + react-query
- [x] App layout: Sidebar navigation + Topbar with ConnectButton
- [x] Static Dashboard page (mock data)
- [x] Static Issue Asset form
- [x] Setup Express backend (`packages/backend/`) — health endpoint, CORS
- [x] Backend added to pnpm workspace + root scripts

## Phase 2 — Enhanced Pages (DONE)

### Completed
- [x] **My Vaults** — Filter controls: search, risk level, status, asset type. Cards link to vault detail.
- [x] **Vault Detail** (`/vaults/[id]`) — Key metrics, asset composition table, allocation pie chart (recharts), risk score history bar chart, upcoming + past payments, "Analyze with AI" button with loading state, AI analysis panel with position analysis + stress tests + recommendations, human-in-the-loop approve/reject with confirmation dialog
- [x] **Data Room** — Canton visibility model explainer (Owner/Counterparty/Auditor), confidential vault list with authorized parties table (role, visibility, public key), PrivateTrade proposals with accept/counter/reject actions, invite party dialog
- [x] **Yield Calendar** — Summary stats (total distributed, upcoming, completed count, scheduled count), tabbed view (Timeline / Upcoming / Completed), visual timeline with month groupings and "Now" marker, vault filter
- [x] **AI Reports** — Risk score evolution line chart (recharts) with risk zone reference lines, vault filter, position analysis per report, approve/reject per recommendation with confirmation dialog, PDF export button (mock)
- [x] **Administration** — RBAC grid with role counts + permission badges, wallet whitelist table with add/remove, white-label config form (institution name, domain, color picker, logo upload placeholder, live preview)

### Dependencies added
- `recharts` — Charts (pie, bar, line)
- `progress` shadcn component — Risk score visualization

### Tech Choices
- **Router**: App Router (app/ directory)
- **UI**: shadcn/ui + TailwindCSS v4
- **Wallet**: RainbowKit + wagmi v2
- **Icons**: lucide-react
- **Charts**: recharts
- **Backend**: Express + tsx (dev), TypeScript strict
- **Language rule**: All user-facing text must be in English. All units must use the imperial system.

### Run Commands
```bash
pnpm dev:frontend   # Next.js on port 3000
pnpm dev:backend    # Express on port 4000
```

### Routes
| Route | Page | Status |
|-------|------|--------|
| `/` | Landing | Done |
| `/app` | Dashboard | Done |
| `/vaults` | My Vaults (with filters) | Done |
| `/vaults/[id]` | Vault Detail + AI analysis | Done |
| `/issue` | Issue Asset form | Done |
| `/data-room` | Canton Data Room | Done |
| `/yield-calendar` | Hedera Yield Calendar | Done |
| `/ai-reports` | 0G AI Reports | Done |
| `/admin` | Administration | Done |
| `/demo/canton` | Canton 3-Panel Demo | Done |

## Phase 3 (Backend Bridges) — DONE

### Completed
- [x] **Canton bridge** — Full Daml JSON API proxy (`packages/backend/src/routes/canton.ts`)
  - Canton JSON API client (`services/canton-client.ts`) — create, exercise, query, fetch with party-scoped JWT auth
  - Vault CRUD: `POST/GET /api/canton/vaults`, `GET /api/canton/vaults/:id`
  - Asset management: `POST/DELETE /api/canton/vaults/:id/assets`
  - Invitations: `POST /api/canton/vaults/:id/invite`, accept/decline
  - Counterparties: `POST/DELETE /api/canton/vaults/:id/counterparties`
  - Trades: `POST /api/canton/vaults/:id/trades`, accept/reject, `GET /api/canton/trades`
  - Lifecycle: freeze, activate, close
  - Party resolution via `X-Canton-Party` header or env fallback
- [x] **0G bridge** — AI analysis endpoints (`packages/backend/src/routes/ai.ts`)
  - `POST /api/ai/analyze` — triggers 0G Compute inference (mock fallback when 0G not configured)
  - `GET /api/ai/reports` — list reports (filter by vaultId)
  - `GET /api/ai/reports/:id` — single report detail
  - `POST /api/ai/reports/:id/approve` — approve recommendation (single or all)
  - `POST /api/ai/reports/:id/reject` — reject recommendation (single or all)
  - In-memory report store with structured response matching Dev B's spec
- [x] **ADI bridge** — Tokenization + vault + institution endpoints (`packages/backend/src/routes/adi.ts`)
  - `GET/POST /api/adi/tokens` — list & create RWA tokens
  - `POST /api/adi/tokens/:address/fractionalize` — fractionalize tokens
  - `POST /api/adi/vaults` — create vault, `GET /api/adi/vaults/:id` — vault info
  - `GET /api/adi/vaults/:id/balance/:token` — balance check
  - `POST /api/adi/vaults/:id/deposit|withdraw|allocate|deallocate` — vault operations
  - `GET/POST /api/adi/institutions` — list & register institutions
  - `POST /api/adi/institutions/propose` — multisig proposal flow
  - `POST /api/adi/institutions/proposals/:id/approve|execute` — governance actions
- [x] **Hedera bridge** — Coupon scheduling + yield distribution (`packages/backend/src/routes/hedera.ts`)
  - `GET/POST /api/hedera/bonds` — list & register bonds
  - `GET /api/hedera/bonds/:id` — bond detail with payment schedule
  - `POST /api/hedera/bonds/:id/schedule-all|schedule` — schedule coupons
  - `POST /api/hedera/bonds/:bondId/payments/:date/recover` — recover failed payments
  - `GET /api/hedera/yield/snapshots/:id` — snapshot info
  - `POST /api/hedera/yield/distribute` — yield distribution
  - `POST /api/hedera/yield/claim` — claim yield
  - `GET /api/hedera/yield/unclaimed/:holder/:paymentToken` — unclaimed amounts
- [x] **Auth middleware** — Wallet-based authentication (`packages/backend/src/middleware/auth.ts`)
  - Nonce generation + SIWE-style signature verification
  - JWT token issuance (24h expiry)
  - `requireAuth` middleware — blocks unauthenticated requests
  - `optionalAuth` middleware — populates req.auth if token present
  - Auth routes: `POST /api/auth/nonce`, `POST /api/auth/login`, `GET /api/auth/me`
- [x] **RBAC middleware** — Role verification (`packages/backend/src/middleware/rbac.ts`)
  - `requireRole('ADMIN', 'ISSUER', ...)` — checks JWT claim + on-chain fallback
  - `requireWhitelist()` — verifies wallet whitelist on ADI AccessControl
  - `fetchWalletRoles(address)` — queries all 4 roles from contract
  - Role hashes computed via `ethers.id()` matching Solidity `keccak256()`
- [x] Auth + RBAC applied to all write endpoints across ADI, Hedera, Canton, and AI routes
- [x] Shared types: `src/types/canton.ts`, `src/types/ai.ts`, `src/types/auth.ts`
- [x] Updated `.env.example` with `CANTON_JSON_API_PORT`, `CANTON_LEDGER_ID`, `CANTON_PACKAGE_ID`, `JWT_SECRET`

## Phase 4 (Frontend ↔ Backend Integration) — DONE

### Completed
- [x] **API client** — `packages/frontend/src/lib/api.ts`
  - Shared fetch wrapper with JWT auth header injection
  - Token stored in localStorage, auto-attached to all requests
  - `ApiError` class with status + body for structured error handling
  - Convenience methods: `api.get()`, `api.post()`, `api.put()`, `api.delete()`
- [x] **Auth context** — `packages/frontend/src/contexts/auth-context.tsx`
  - Full nonce → wallet signature → JWT flow using wagmi `signMessageAsync`
  - Session restore from localStorage on mount (validates via `/api/auth/me`)
  - Auto-clear on wallet disconnect or address change
  - Exposes: `isAuthenticated`, `roles`, `signIn()`, `signOut()`, `hasRole()`
- [x] **Sign In / Sign Out** — Topbar shows explicit "Sign In" button when wallet connected but not authenticated
  - Role badges displayed after sign-in
  - Error display for failed sign-in attempts
- [x] **Backend demo API** — `packages/backend/src/routes/demo.ts`
  - New route file serving UI-friendly demo data with mock fallbacks
  - Does NOT modify Dev A's routes (no merge conflict risk)
  - Endpoints: `/api/demo/dashboard`, `/api/demo/vaults`, `/api/demo/payments`, `/api/demo/canton/vaults`, `/api/demo/canton/demo/:vaultId/:role`, `/api/demo/ai/reports`, `/api/demo/ai/score-history`, `/api/demo/admin/wallets`, `/api/demo/admin/roles`
  - Canton demo endpoint returns party-scoped views (owner/counterparty/auditor) with proper data filtering
- [x] **Dashboard** wired to `/api/demo/dashboard` — stats, vaults, upcoming payments, latest AI analysis
- [x] **My Vaults** wired to `/api/demo/vaults` — vault list with filters
- [x] **Data Room** wired to `/api/demo/canton/vaults` — confidential vaults + trades
- [x] **Yield Calendar** wired to `/api/demo/payments` + `/api/demo/vaults` — payments + vault filter
- [x] **AI Reports** wired to `/api/demo/ai/reports` + `/api/demo/ai/score-history` — reports + chart data
- [x] **Administration** wired to `/api/demo/admin/wallets` — wallet whitelist + role counts
- [x] All pages have loading states (animated pulse) and error states (red message + backend hint)

## Phase 4b (Canton Bounty Demo) — DONE

### Completed
- [x] **Canton 3-Panel Demo** — `/demo/canton`
  - Dedicated page with 3 side-by-side panels: Owner / Counterparty / Auditor
  - Each panel fetches from `/api/demo/canton/demo/cv-1/:role`
  - **Owner view**: Full vault data, all assets with values, all parties, all trades (with accept/counter/reject buttons), complete audit log
  - **Counterparty view**: Vault data with values, assets with financials, only own party + owner visible, only own trades visible, no audit log
  - **Auditor view**: Vault name + asset count (no total value), assets with ratings/jurisdiction only (no values/coupons), only owner visible, no trades, compliance-only audit log
  - Restricted data shown with lock icons and "restricted" labels
  - Legend explaining each role's access level
  - Explanation of Canton Network / Daml templates (ConfidentialVault, PrivateTrade, AuditRight)
  - Added to sidebar navigation (Columns3 icon)
  - Color-coded panel borders: neutral (owner), blue (counterparty), yellow (auditor)

## Phase 5 (Role-Based Views) — DONE

### Completed
- [x] **RoleGate component** — `packages/frontend/src/components/role-gate.tsx`
  - `<RoleGate allowed={['ADMIN']}>` — wraps content, shows "Restricted Access" message if user lacks role
  - `<RoleOnly role="ISSUER">` — silent variant, renders nothing if unauthorized
  - Shows user's current roles and what roles are required
  - Unauthenticated users see content by default (pages handle their own auth)
- [x] **Issue Asset** — gated to ADMIN + ISSUER roles
- [x] **Administration** — gated to ADMIN role only
- [x] Loading states on all API-wired pages
- [x] Error states with backend connection hints

### New Files Created
| File | Purpose |
|------|---------|
| `frontend/src/lib/api.ts` | API client with JWT auth |
| `frontend/src/contexts/auth-context.tsx` | Auth state management |
| `frontend/src/hooks/use-api.ts` | Generic data-fetching hook |
| `frontend/src/components/role-gate.tsx` | Role-based access control UI |
| `frontend/src/app/demo/canton/page.tsx` | Canton 3-panel bounty demo |
| `backend/src/routes/demo.ts` | Demo API with mock fallbacks |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/providers/web3-provider.tsx` | Added AuthProvider inside RainbowKit |
| `frontend/src/components/layout/topbar.tsx` | Added Sign In/Out buttons + role badges |
| `frontend/src/components/layout/sidebar.tsx` | Added Canton Demo nav item |
| `frontend/src/app/app/page.tsx` | Wired to `/api/demo/dashboard` |
| `frontend/src/app/vaults/page.tsx` | Wired to `/api/demo/vaults` |
| `frontend/src/app/data-room/page.tsx` | Wired to `/api/demo/canton/vaults` |
| `frontend/src/app/yield-calendar/page.tsx` | Wired to `/api/demo/payments` |
| `frontend/src/app/ai-reports/page.tsx` | Wired to `/api/demo/ai/reports` |
| `frontend/src/app/admin/page.tsx` | Wired to `/api/demo/admin/wallets` + RoleGate |
| `frontend/src/app/issue/page.tsx` | Added RoleGate for ADMIN/ISSUER |
| `backend/src/index.ts` | Registered demo routes |

## Running the Demo

```bash
# Terminal 1 — Backend
pnpm dev:backend    # Express on port 4000

# Terminal 2 — Frontend
pnpm dev:frontend   # Next.js on port 3000
```

Both servers must be running. The frontend fetches data from the backend's demo API which provides mock fallbacks for all services (ADI, Hedera, Canton, 0G).

### Demo Flow
1. Open `http://localhost:3000` — Landing page
2. Click "Launch App" — Dashboard
3. Connect wallet (MetaMask / WalletConnect)
4. Click "Sign In" — wallet signature prompt
5. Navigate through all pages — data loads from backend
6. Visit `/demo/canton` — 3-panel visibility demo for Canton bounty
7. Try `/admin` — requires ADMIN role
8. Try `/issue` — requires ADMIN or ISSUER role

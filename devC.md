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

### Run Commands
```bash
pnpm dev:frontend   # Next.js on port 3000
pnpm dev:backend    # Express on port 4000
```

### Routes
| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard | Done |
| `/vaults` | My Vaults (with filters) | Done |
| `/vaults/[id]` | Vault Detail + AI analysis | Done |
| `/issue` | Issue Asset form | Done |
| `/data-room` | Canton Data Room | Done |
| `/yield-calendar` | Hedera Yield Calendar | Done |
| `/ai-reports` | 0G AI Reports | Done |
| `/admin` | Administration | Done |

## Phase 3 (Backend Bridges) — Next
- [ ] ADI bridge — Tokenization + vault endpoints
- [ ] Canton bridge — Daml ledger API proxy
- [ ] Hedera bridge — Coupon scheduling + payment status
- [ ] 0G bridge — AI analysis trigger + results
- [ ] Auth middleware (wallet-based)
- [ ] Role verification middleware (RBAC from ADI)

## Phase 4 (Integration) — After Phase 3
- [ ] Wire Issue Asset form to ADI RWATokenFactory via backend
- [ ] Wire My Vaults to VaultManager via backend
- [ ] Wire Yield Calendar to Hedera CouponScheduler via backend
- [ ] Live data on Dashboard
- [ ] Wire Data Room to Canton Daml via backend
- [ ] Wire Vault Detail "Analyze with AI" to 0G via backend
- [ ] Wire AI Reports to display structured results
- [ ] Human-in-the-loop UI wired to real transactions

## Phase 5 (Role-Based Views) — After Phase 4
- [ ] Admin view (full access)
- [ ] Issuer view (own assets only)
- [ ] Investor view (own vaults only)
- [ ] Auditor view (compliance-limited)
- [ ] Notification system
- [ ] Loading states and error handling
- [ ] Responsive design

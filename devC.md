# Dev C — Progress Notes

## Phase 1 — Frontend Scaffold + Backend Init

### Completed
- [x] Initialize Next.js 16 + TailwindCSS v4 (`packages/frontend/`) — App Router
- [x] Install and configure shadcn/ui (new-york style, neutral, lucide icons)
  - Components: Button, Card, Input, Label, Select, Badge, Table, Separator, Sheet, Avatar, DropdownMenu, Tooltip, Tabs, Dialog, Form, Textarea
- [x] Configure wallet connection — RainbowKit 2.x + wagmi 2.x + viem 2.x + react-query
  - ADI custom chain configured (placeholder chain ID 0xAD1)
  - WalletConnect + MetaMask supported
- [x] App layout: Sidebar navigation + Topbar with ConnectButton
  - Routes: Dashboard, My Vaults, Issue Asset, Data Room, Yield Calendar, AI Reports, Administration
- [x] Static **Dashboard** page (mock data) — stats grid, vault list, upcoming payments, last AI analysis
- [x] Static **Issue Asset** form — asset type, name, nominal value, coupon rate, frequency, maturity, token count, jurisdiction
- [x] Static **My Vaults** page — vault cards with risk scores
- [x] Static **Data Room** page — placeholder for Canton integration
- [x] Static **Yield Calendar** page — upcoming + past payments
- [x] Static **AI Reports** page — mock risk analysis reports with stress tests
- [x] Static **Administration** page — RBAC overview, wallet whitelist placeholder, white-label placeholder
- [x] Setup Express backend (`packages/backend/`) — health endpoint, CORS, structured for Phase 3 bridges
- [x] Backend added to pnpm workspace + root scripts

### Tech Choices
- **Router**: App Router (app/ directory)
- **UI**: shadcn/ui + TailwindCSS v4
- **Wallet**: RainbowKit + wagmi v2
- **Icons**: lucide-react
- **Backend**: Express + tsx (dev), TypeScript strict

### Run Commands
```bash
pnpm dev:frontend   # Next.js on port 3000
pnpm dev:backend    # Express on port 4000
```

## Next Steps (Phase 2)
- [ ] Wire vault detail page (individual vault view with composition + charts)
- [ ] Add "Analyze with AI" button flow
- [ ] Human-in-the-loop UI for AI recommendations (approve/reject)
- [ ] Responsive design polish

## Phase 3 (Backend Bridges) — Upcoming
- [ ] ADI bridge — Tokenization + vault endpoints
- [ ] Canton bridge — Daml ledger API proxy
- [ ] Hedera bridge — Coupon scheduling + payment status
- [ ] 0G bridge — AI analysis trigger + results
- [ ] Auth middleware (wallet-based)
- [ ] Role verification middleware (RBAC from ADI)

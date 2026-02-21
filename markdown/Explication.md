# Explication — Architecture Outward (ETHDenver 2026)

> Reference technique pour debug & fix. A supprimer apres le hackathon.

---

## 1. Vue d'ensemble

```
                    FRONTEND (Next.js :3000)
                           |
                    BACKEND (Express :3001)
                    /      |       |       \
              ADI Chain   Hedera   Canton   0G Labs
             (Testnet)   (Testnet) (Devnet)  (Compute)
```

| Chain | Reseau | Chain ID | RPC | Contrats | Responsable | Bounty |
|-------|--------|----------|-----|----------|-------------|--------|
| **ADI** | ADI Testnet | 99999 | `https://rpc.ab.testnet.adifoundation.ai/` | AccessControl, TokenFactory, VaultManager, InstitutionRegistry, InstitutionDeployer | Dev A | ADI Foundation |
| **Hedera** | Testnet | — | Hedera SDK | CouponScheduler, YieldDistributor | Dev A | Hedera |
| **Canton** | Devnet L1 | — | `localhost:7575` | ConfidentialVault, PrivateTrade, AuditRight (.daml) | Dev B | Canton Network |
| **0G Labs** | Testnet | — | `https://evmrpc-testnet.0g.ai` | AI inference via 0G Compute broker | Dev B | 0G Labs |

---

## 2. Adresses deployees

### ADI (ADI Testnet — chain 99999)

| Contrat | Adresse | Env var |
|---------|---------|---------|
| InstiVaultAccessControl | `0x8E7D4E14583a37770C743D33092bbCC4E3Dd656d` | `ADI_ACCESS_CONTROL_ADDRESS` |
| RWATokenFactory | `0x0eD29f8c992bB10515296A301B27cd8F0a5d7d65` | `ADI_TOKEN_FACTORY_ADDRESS` |
| VaultManager | `0x6b6449bDEC04dd8717AC71565C7c065680C1534f` | `ADI_VAULT_MANAGER_ADDRESS` |
| InstitutionDeployer | `0x6804Fc931CC3DB9543b07581C3AEdcf1fA66179B` | — |
| InstitutionRegistry | `0xAB3Cbc56D958245a2688b2171417679e743B1daF` | `ADI_INSTITUTION_REGISTRY_ADDRESS` |

> Anciennes adresses Sepolia (deprecated) : AccessControl `0x6cCFbc...`, TokenFactory `0xE6C7cc...`, VaultManager `0xA16202...`, Registry `0x442EC1...`

**Signer backend** : `0x4aC22453d386C2498bccbE9E12e43CfB56A341C5`
- Roles : ADMIN (set par le constructeur)
- Pas encore ISSUER, INVESTOR, AUDITOR — a configurer
- Pas encore whiteliste — a configurer
- Balance : ~10 ETH de gas sur ADI testnet

### Hedera (Testnet)

| Contrat | Adresse | Env var |
|---------|---------|---------|
| CouponScheduler | `0x000000000000000000000000000000000079e46e` | `HEDERA_COUPON_SCHEDULER_ADDRESS` |
| YieldDistributor | `0x000000000000000000000000000000000079e472` | `HEDERA_YIELD_DISTRIBUTOR_ADDRESS` |

### Canton

**Non deploye.** Les env vars `CANTON_LEDGER_HOST`, `CANTON_PARTY_*` sont vides.

### 0G Labs

**Partiellement configure.** RPC + private key presentes. `ZG_COMPUTE_ENDPOINT` et `ZG_API_KEY` vides → l'AI tourne en mock.
- RPC : `https://evmrpc-testnet.0g.ai`
- Mock : `ZG_USE_MOCK=true`

---

## 3. Routes Backend — Qui appelle quoi

### `/api/auth` — Authentification

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/nonce` | POST | Non | Genere un nonce pour le wallet |
| `/api/auth/login` | POST | Non | Verifie signature + retourne JWT |
| `/api/auth/dev-login` | POST | Non | JWT avec tous les roles (DEV_MODE=true only) |
| `/api/auth/me` | GET | JWT | Refresh roles depuis on-chain |

### `/api/v1` — Donnees on-chain agregees (frontend)

| Route | Method | Source | Si vide |
|-------|--------|--------|---------|
| `/api/v1/dashboard` | GET | VaultManager + TokenFactory + CouponScheduler + AI store | Stats a 0, arrays `[]` |
| `/api/v1/vaults` | GET | VaultManager.nextVaultId() → iterate | `[]` |
| `/api/v1/vaults/:id` | GET | VaultManager.getVaultInfo(id) | 404 |
| `/api/v1/tokens` | GET | TokenFactory.getAllTokens() → metadata | `[]` |
| `/api/v1/payments` | GET | CouponScheduler.bondCount() → iterate | `[]` |
| `/api/v1/ai/reports` | GET | In-memory + JSON file store | `[]` |
| `/api/v1/ai/score-history` | GET | Pas de persistence | `[]` |
| `/api/v1/canton/vaults` | GET | cantonClient.query (try/catch) | `[]` |
| `/api/v1/admin/wallets` | GET | Pas d'enumeration on-chain | `[]` |

### `/api/adi` — Interactions ADI chain

| Route | Method | Auth | Role | Contrat |
|-------|--------|------|------|---------|
| `/api/adi/tokens` | GET | Non | — | TokenFactory.getAllTokens() |
| `/api/adi/tokens` | POST | JWT | ISSUER | TokenFactory.createToken() |
| `/api/adi/tokens/:addr/fractionalize` | POST | JWT | ISSUER | TokenFactory.fractionalize() |
| `/api/adi/vaults` | POST | JWT | ISSUER | VaultManager.createVault() |
| `/api/adi/vaults/:id` | GET | Non | — | VaultManager.getVaultInfo() |
| `/api/adi/vaults/:id/deposit` | POST | JWT | INVESTOR | VaultManager.deposit() |
| `/api/adi/vaults/:id/withdraw` | POST | JWT | INVESTOR | VaultManager.withdraw() |
| `/api/adi/vaults/:id/allocate` | POST | JWT | ISSUER | VaultManager.allocate() |
| `/api/adi/vaults/:id/deallocate` | POST | JWT | ISSUER | VaultManager.deallocate() |
| `/api/adi/institutions` | GET | Non | — | InstitutionRegistry.getInstitutionCount() |
| `/api/adi/institutions` | POST | JWT | ADMIN | InstitutionRegistry.registerInstitution() |
| `/api/adi/whitelist` | POST | JWT | ADMIN | AccessControl.addToWhitelist() |
| `/api/adi/roles` | POST | JWT | ADMIN | AccessControl.grantRole() |

### `/api/hedera` — Interactions Hedera

| Route | Method | Auth | Role | Contrat |
|-------|--------|------|------|---------|
| `/api/hedera/bonds` | GET | Non | — | CouponScheduler.bondCount() → iterate |
| `/api/hedera/bonds/:id` | GET | Non | — | CouponScheduler.getBond() + getPaymentDates() |
| `/api/hedera/bonds` | POST | JWT | ADMIN/ISSUER | CouponScheduler.registerBond() |
| `/api/hedera/bonds/:id/schedule-all` | POST | JWT | ISSUER/ADMIN | CouponScheduler.scheduleAllCoupons() |
| `/api/hedera/bonds/:id/schedule` | POST | JWT | ISSUER/ADMIN | CouponScheduler.scheduleCoupon() |
| `/api/hedera/yield/distribute` | POST | JWT | ADMIN/ISSUER | YieldDistributor.distribute() |
| `/api/hedera/yield/claim` | POST | JWT | INVESTOR | YieldDistributor.claimYield() |

### `/api/ai` — 0G Compute

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/ai/analyze` | POST | JWT | Lance inference 0G (ou mock). Auto-fetch vault data on-chain si pas d'assets[] |
| `/api/ai/reports` | GET | Non | Liste tous les reports (filtre ?vaultId=) |
| `/api/ai/reports/:id` | GET | Non | Un report |
| `/api/ai/reports/:id/approve` | POST | JWT ADMIN/ISSUER | Approuve une recommandation |
| `/api/ai/reports/:id/reject` | POST | JWT ADMIN/ISSUER | Rejette une recommandation |

### `/api/canton` — Canton Network

| Route | Method | Description |
|-------|--------|-------------|
| `/api/canton/vaults` | POST/GET | Creer/lister vaults confidentiels |
| `/api/canton/vaults/:id/invite` | POST | Inviter une party |
| `/api/canton/vaults/:id/assets` | POST/DELETE | Deposer/retirer un asset |
| `/api/canton/trades` | GET | Lister les trades |
| `/api/canton/trades/:id/accept` | POST | Accepter un trade |
| `/api/canton/trades/:id/reject` | POST | Rejeter un trade |
| `/api/canton/vaults/:id/freeze` | POST | Geler un vault |

> **Note**: Toutes les routes Canton echouent silencieusement si Canton n'est pas configure.

### `/api/demo` — Mock data (legacy)

Encore utilise par `/demo/canton` pour la demo 3 panneaux (owner/counterparty/auditor). Ne pas supprimer.

---

## 4. Contrats — Fonctions principales

### InstiVaultAccessControl (ADI)

```
Roles: ADMIN_ROLE, ISSUER_ROLE, INVESTOR_ROLE, AUDITOR_ROLE
Fonctions:
  addToWhitelist(address)     — ADMIN only
  removeFromWhitelist(address) — ADMIN only
  isWhitelisted(address) → bool
  hasRole(bytes32, address) → bool
  grantRole(bytes32, address) — ADMIN only

Erreurs courantes:
  NotWhitelisted(address) → 0xdf17e316
```

### RWATokenFactory (ADI)

```
Fonctions:
  createToken({name, symbol, isin, rate, maturity, initialSupply}) → address
  fractionalize(token, fractions) → address
  getAllTokens() → address[]
  getTokenCount() → uint256

Erreurs courantes:
  NotIssuer()              → 0x54ec5063  ← signer n'a pas ISSUER_ROLE
  TransferNotWhitelisted() → 0xc7be2aea  ← signer pas whiteliste (mint = transfer)
  ISINAlreadyExists()      → isin deja utilise
```

### RWAToken (ADI)

```
Fonctions:
  name() → string
  symbol() → string
  totalSupply() → uint256
  getMetadata() → (isin, rate, maturity, issuer)
  mint(to, amount) — factory ou issuer only
  transfer() — les 2 parties doivent etre whitelisted !

Erreurs courantes:
  TransferNotWhitelisted(address) → le from OU le to n'est pas whiteliste
  OnlyFactoryOrIssuer()           → seul la factory ou l'issuer peut mint
```

### VaultManager (ADI)

```
Fonctions:
  createVault() → uint256 vaultId  — ISSUER only
  deposit(vaultId, token, amount)  — INVESTOR only, vault must be Active
  withdraw(vaultId, token, amount) — INVESTOR only
  allocate(vaultId, token, strategy, amount)   — ISSUER only
  deallocate(vaultId, token, strategy, amount) — ISSUER only

  nextVaultId() → uint256
  getVaultInfo(id) → (owner, status, createdAt)
  getVaultTokens(id) → address[]
  getVaultBalance(id, token) → uint256

Status: 0=Active, 1=Paused, 2=Closed

Erreurs courantes:
  NotIssuer()        → pas ISSUER_ROLE
  NotInvestor()      → pas INVESTOR_ROLE
  VaultNotActive()   → vault pause ou ferme
  TokenNotRegistered() → le token n'est pas dans la factory
  NotWhitelisted()   → pas dans la whitelist
```

### CouponScheduler (Hedera)

```
Fonctions:
  registerBond(token, paymentToken, faceValue, rate, frequency, startDate, maturityDate, issuer) → bondId
  scheduleCoupon(bondId, paymentDate) — utilise precompile 0x16b !
  scheduleAllCoupons(bondId)
  executeCoupon(bondId, paymentDate) — callback Hedera

  bondCount() → uint256
  getBond(id) → Bond
  getPaymentDates(bondId) → uint256[]
  getPayment(bondId, date) → ScheduledPayment
  getCouponAmount(bondId) → uint256

Frequency: 0=Monthly, 1=Quarterly, 2=SemiAnnual, 3=Annual
PaymentStatus: 0=Pending, 1=Scheduled, 2=Executed, 3=Failed, 4=Suspended
```

### YieldDistributor (Hedera)

```
Fonctions:
  distribute(token, paymentToken, totalYield, holders[]) → snapshotId
  claimYield(paymentToken, snapshotId)
  getUnclaimedYield(holder, paymentToken) → uint256
  getSnapshotInfo(id) → (token, paymentToken, totalYield, totalSupply, timestamp, claimed, holderCount)
```

---

## 5. Pages Frontend — Quelle API chaque page utilise

| Page | URL | API v1 | API directe | Commentaire |
|------|-----|--------|-------------|-------------|
| Dashboard | `/app` | `v1/dashboard` | — | Empty state si rien on-chain |
| Vaults | `/vaults` | `v1/vaults` | — | Pas de bouton "Create Vault" (manquant !) |
| Vault detail | `/vaults/[id]` | `v1/vaults/:id`, `v1/payments`, `v1/ai/reports`, `v1/ai/score-history` | `ai/analyze`, `ai/reports/:id/approve`, `ai/reports/:id/reject` | Analyze with AI + human-in-the-loop |
| Issue token | `/issue` | — | `adi/tokens` (POST) | Role gate: ADMIN/ISSUER |
| Admin | `/admin` | `v1/admin/wallets` | `adi/whitelist`, `adi/roles` | Role gate: ADMIN |
| AI Reports | `/ai-reports` | `v1/ai/reports`, `v1/ai/score-history`, `v1/vaults` | `ai/reports/:id/approve`, `ai/reports/:id/reject` | Approve/reject recommendations |
| Data Room | `/data-room` | `v1/canton/vaults` | `canton/vaults/:id/invite`, `canton/trades/:id/accept`, `canton/trades/:id/reject` | Vide si Canton pas config |
| Yield Calendar | `/yield-calendar` | `v1/payments`, `v1/vaults` | — | Vide si pas de bonds Hedera |
| Canton Demo | `/demo/canton` | — | `demo/canton/demo/:vaultId/:role` | **Garde les mocks** pour la demo bounty |

---

## 6. Flux d'authentification

```
1. User connecte wallet (RainbowKit)      ← juste l'adresse, PAS de JWT
2. User clique "Sign In"
3. Frontend → POST /api/auth/nonce {address}
4. Backend genere nonce, stocke 5min
5. Frontend → wallet.signMessage(message)  ← l'user signe
6. Frontend → POST /api/auth/login {address, signature, message}
7. Backend verifie signature + check roles on-chain
8. Backend retourne JWT {address, roles, exp: 24h}
9. JWT stocke dans localStorage('metaphor_jwt')
10. Toutes les requetes incluent Authorization: Bearer <jwt>
```

**Raccourci dev** : `POST /api/auth/dev-login` → JWT avec ADMIN+ISSUER+INVESTOR+AUDITOR (si `DEV_MODE=true` dans .env)

---

## 7. Erreurs communes et solutions

| Erreur | Cause | Fix |
|--------|-------|-----|
| `NotIssuer() 0x54ec5063` | Signer n'a pas ISSUER_ROLE | `POST /api/adi/roles {address, role: "issuer"}` avec JWT ADMIN |
| `TransferNotWhitelisted() 0xc7be2aea` | Adresse pas whitelistee (mint = transfer) | `POST /api/adi/whitelist {address}` avec JWT ADMIN |
| `NotWhitelisted() 0xdf17e316` | Adresse pas dans la whitelist pour VaultManager | Idem whitelist |
| `Missing Authorization header` | Pas de JWT dans la requete | Se connecter wallet + Sign In, ou dev-login |
| `Invalid or expired token` | JWT expire (>24h) ou mauvais secret | Re-login |
| `Vault has no assets on-chain` | AI analyze sur un vault vide | Deposer des tokens d'abord |
| `TokenNotRegistered()` | Token pas cree via la factory | Creer via `/api/adi/tokens` |
| `CORS error` | Frontend et backend sur des ports differents | Backend a `cors()` active, verifier `NEXT_PUBLIC_API_URL` |
| Canton routes retournent `[]` | Canton pas configure | Remplir `CANTON_LEDGER_HOST` + `CANTON_PARTY_*` |
| AI toujours `[Mock]` | 0G pas configure | Remplir `ZG_COMPUTE_ENDPOINT` + `ZG_API_KEY` |

---

## 8. Ce qui est fait vs ce qui manque

### ADI (Dev A) — 90% fait

- [x] Contrats deployes sur ADI Testnet (chain 99999)
- [x] Routes backend completes
- [x] Frontend connecte a on-chain (v1 routes)
- [x] Issue page fonctionne
- [ ] **Signer pas encore ISSUER + whiteliste sur ADI testnet** (fresh deploy)
- [ ] **Pas de bouton "Create Vault" dans le frontend**
- [ ] Rien depose dans les vaults (0 assets on-chain)
- [ ] Pas d'institution enregistree

### Hedera (Dev A) — 80% fait

- [x] Contrats deployes sur testnet
- [x] Routes backend completes
- [ ] Pas de bonds enregistres (bondCount = 0)
- [ ] Schedule Service pas teste end-to-end

### Canton (Dev B) — 40% fait

- [x] Contrats Daml ecrits (3 templates + tests)
- [x] Backend client + routes
- [x] Demo page (mock) pour bounty
- [ ] **Pas deploye sur Canton Devnet**
- [ ] **Env vars vides**
- [ ] Pas de lien avec les donnees ADI

### 0G Labs (Dev B) — 55% fait

- [x] Client 0G Compute code
- [x] Routes backend (analyze, approve, reject)
- [x] Human-in-the-loop (approve/reject)
- [x] Reports persistes en JSON
- [x] Auto-fetch vault data on-chain
- [x] RPC + private key configures
- [ ] **ZG_COMPUTE_ENDPOINT vide** (mock seulement)
- [ ] **Pas d'execution des recommandations**

### Frontend (Dev C) — 85% fait

- [x] Toutes les pages existent
- [x] Auth wallet + JWT
- [x] Role gating
- [x] Empty states
- [x] Connecte a on-chain (v1)
- [ ] **Manque bouton Create Vault**
- [ ] Manque feedback erreur plus visible sur /issue

---

## 9. Variables d'environnement (.env)

```bash
# ADI (ADI Testnet chain 99999) — FONCTIONNEL
ADI_RPC_URL=https://rpc.ab.testnet.adifoundation.ai/
ADI_PRIVATE_KEY=0x086770b...
ADI_CHAIN_ID=99999
ADI_ACCESS_CONTROL_ADDRESS=0x8E7D4E14...
ADI_TOKEN_FACTORY_ADDRESS=0x0eD29f8c...
ADI_VAULT_MANAGER_ADDRESS=0x6b6449bD...
ADI_INSTITUTION_REGISTRY_ADDRESS=0xAB3Cbc56...

# Hedera (Testnet) — FONCTIONNEL
HEDERA_OPERATOR_ID=0.0.7974657
HEDERA_OPERATOR_KEY=3030020100...
HEDERA_COUPON_SCHEDULER_ADDRESS=0x00000000...79e46e
HEDERA_YIELD_DISTRIBUTOR_ADDRESS=0x00000000...79e472

# Canton — VIDE (Dev B doit configurer)
CANTON_LEDGER_HOST=
CANTON_PARTY_ADMIN=
CANTON_PARTY_ISSUER=
CANTON_PARTY_INVESTOR=
CANTON_PARTY_AUDITOR=

# 0G Labs — PARTIELLEMENT CONFIGURE
ZG_RPC_URL=https://evmrpc-testnet.0g.ai
ZG_PRIVATE_KEY=0xd0c537...
ZG_USE_MOCK=true
ZG_COMPUTE_ENDPOINT=              ← VIDE (Dev B doit configurer)
ZG_API_KEY=                       ← VIDE (Dev B doit configurer)

# Backend
PORT=3001
DEV_MODE=true

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ADI_RPC_URL=https://rpc.ab.testnet.adifoundation.ai/
```

---

## 10. Fichiers cles par package

```
packages/
├── contracts-adi/
│   ├── src/                          ← 6 contrats Solidity
│   ├── abi/                          ← ABIs JSON (utilises par le backend)
│   ├── script/Deploy.s.sol           ← Script de deploiement Foundry
│   └── script/Demo.s.sol             ← Script de demo (create token + vault)
│
├── contracts-hedera/
│   ├── contracts/                    ← CouponScheduler, YieldDistributor, HederaScheduleService
│   ├── abi/                          ← ABIs JSON
│   └── src/deploy.ts                 ← Script de deploiement Hedera SDK
│
├── contracts-canton/
│   ├── daml/ConfidentialVault.daml    ← Template principal
│   ├── daml/PrivateTrade.daml        ← Negociation bilaterale
│   ├── daml/AuditRight.daml          ← Acces audit limite
│   └── daml.yaml                     ← Config SDK Daml 2.10.3
│
├── ai-engine/
│   ├── src/0g-client.ts              ← Client 0G Compute reel
│   ├── src/risk-analyzer.ts          ← Analyse de risque + prompt
│   ├── src/strategy-simulator.ts     ← Stress tests
│   └── src/mock.ts                   ← Mock quand 0G pas dispo
│
├── backend/
│   ├── src/index.ts                  ← Express app, monte toutes les routes
│   ├── src/config.ts                 ← Provider ethers, ABIs, adresses
│   ├── src/routes/
│   │   ├── auth.ts                   ← Nonce + login + dev-login
│   │   ├── adi.ts                    ← Tokens, vaults, institutions, roles
│   │   ├── hedera.ts                 ← Bonds, scheduling, yield
│   │   ├── canton.ts                 ← Vaults confidentiels, trades
│   │   ├── ai.ts                     ← Analyze, reports, approve/reject
│   │   ├── v1.ts                     ← Routes agregees on-chain pour frontend
│   │   └── demo.ts                   ← Mock data (garde pour demo Canton)
│   ├── src/services/
│   │   ├── ai-client.ts              ← Store AI + forward 0G + persistence JSON
│   │   └── canton-client.ts          ← Client HTTP Daml JSON API
│   ├── src/middleware/
│   │   ├── auth.ts                   ← JWT sign/verify + nonce store
│   │   └── rbac.ts                   ← Role check on-chain
│   └── data/ai-reports.json          ← Persistence AI (gitignored)
│
└── frontend/
    ├── src/app/
    │   ├── page.tsx                  ← Landing (/)
    │   ├── app/page.tsx              ← Dashboard (/app)
    │   ├── vaults/page.tsx           ← Vaults list (/vaults)
    │   ├── vaults/[id]/page.tsx      ← Vault detail (/vaults/:id)
    │   ├── issue/page.tsx            ← Issue token (/issue)
    │   ├── admin/page.tsx            ← Admin panel (/admin)
    │   ├── ai-reports/page.tsx       ← AI reports (/ai-reports)
    │   ├── data-room/page.tsx        ← Canton data room (/data-room)
    │   ├── yield-calendar/page.tsx   ← Hedera payments (/yield-calendar)
    │   └── demo/canton/page.tsx      ← Canton visibility demo (/demo/canton)
    ├── src/contexts/auth-context.tsx  ← JWT + wallet auth state
    ├── src/lib/api.ts                ← Fetch wrapper avec JWT auto
    └── src/lib/mock-data.ts          ← Types + helpers (plus de mock data unused)
```

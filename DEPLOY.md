# InstiVault — Deploy Guide

Guide pour deployer les smart contracts ADI + Hedera et configurer le backend.

---

## Prerequis

| Outil | Installation |
|-------|-------------|
| Foundry | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| Node.js 18+ | `brew install node` ou [nodejs.org](https://nodejs.org) |
| pnpm | `npm install -g pnpm` |
| Compte Hedera Testnet | [portal.hedera.com](https://portal.hedera.com) (gratuit, 10 000 HBAR testnet) |

---

## Etape 1 — Creer le fichier `.env`

```bash
cp .env.example .env
```

Remplis les valeurs dans `.env` :

```env
# Ta cle privee (deployer) — METS TA VRAIE CLE ICI
ADI_PRIVATE_KEY=0xTACLEPRIVEE...

# ADI chain RPC — pour test local c'est Anvil (localhost)
# Pour la vraie ADI chain, remplace par le RPC qu'ils fournissent
ADI_RPC_URL=http://localhost:8545

# Hedera — recupere depuis portal.hedera.com > ton profil
HEDERA_OPERATOR_ID=0.0.XXXXXX
HEDERA_OPERATOR_KEY=302e020100300506032b6570...
HEDERA_NETWORK=testnet
```

---

## Etape 2 — Deploy sur ADI Chain

### Option A : Test local avec Anvil

Ouvre un terminal et lance Anvil (blockchain locale) :

```bash
anvil
```

Anvil affiche 10 comptes de test. Copie la premiere cle privee dans `.env` :

```
ADI_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ADI_RPC_URL=http://localhost:8545
```

### Option B : Deploy sur la vraie ADI chain

Remplace `ADI_RPC_URL` par le RPC URL fourni par ADI Foundation, et `ADI_PRIVATE_KEY` par ta cle privee avec du gas sur cette chain.

### Lancer le deploy

```bash
cd packages/contracts-adi

# Charge le .env depuis la racine
source ../../.env

# Deploy (dry run pour verifier)
forge script script/Deploy.s.sol --rpc-url $ADI_RPC_URL --broadcast -vvv
```

Tu verras dans la console :

```
=== InstiVault ADI Deploy ===
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
InstiVaultAccessControl: 0x5FbDB2315678afecb367f032d93F642f64180aa3
RWATokenFactory: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VaultManager: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
InstitutionRegistry: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

=== Copy these to your .env ===
ADI_ACCESS_CONTROL_ADDRESS= 0x5FbDB2315678afecb367f032d93F642f64180aa3
ADI_TOKEN_FACTORY_ADDRESS= 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ADI_VAULT_MANAGER_ADDRESS= 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
ADI_INSTITUTION_REGISTRY_ADDRESS= 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

### Copie les adresses dans `.env`

Ouvre `.env` et colle les adresses :

```env
ADI_ACCESS_CONTROL_ADDRESS=0x5FbDB...
ADI_TOKEN_FACTORY_ADDRESS=0xe7f17...
ADI_VAULT_MANAGER_ADDRESS=0x9fE46...
ADI_INSTITUTION_REGISTRY_ADDRESS=0xCf7Ed...
```

---

## Etape 3 — Deploy sur Hedera Testnet

### Creer un compte Hedera

1. Va sur [portal.hedera.com](https://portal.hedera.com)
2. Cree un compte gratuit
3. Va dans ton profil > copie **Account ID** (ex: `0.0.4515614`) et **DER Private Key**
4. Mets-les dans `.env` :

```env
HEDERA_OPERATOR_ID=0.0.4515614
HEDERA_OPERATOR_KEY=302e020100300506032b6570...
HEDERA_NETWORK=testnet
```

### Compiler les contrats Hedera

```bash
cd packages/contracts-hedera
forge build
```

### Lancer le deploy

```bash
# Installe les deps node
pnpm install

# Deploy
pnpm run deploy
```

Le script affiche :

```
Deploying contracts to Hedera Testnet...
Operator: 0.0.4515614

1. Deploying CouponScheduler...
   CouponScheduler deployed: 0.0.4515700
   EVM address: 0x000000000000000000000000000000000044e3a4

2. Deploying YieldDistributor...
   YieldDistributor deployed: 0.0.4515701
   EVM address: 0x0000000000000000000000000000000000044e3a5

Deployment complete! Addresses saved to /path/to/deployments.json
```

Les adresses sont aussi sauvegardees dans `packages/contracts-hedera/deployments.json`.

### Copie les adresses EVM dans `.env`

```env
HEDERA_COUPON_SCHEDULER_ADDRESS=0x0000000000000000000000000000000000044e3a4
HEDERA_YIELD_DISTRIBUTOR_ADDRESS=0x0000000000000000000000000000000000044e3a5
```

---

## Etape 4 — Lancer le backend

```bash
cd packages/backend

# Copie le .env du backend (ou il lira le .env racine si dotenv est configure)
cp .env.example .env
```

Remplis `packages/backend/.env` avec les memes valeurs :

```env
# ADI
ADI_RPC_URL=http://localhost:8545
ADI_PRIVATE_KEY=0xTACLE...

# ADI Addresses (depuis Etape 2)
ADI_ACCESS_CONTROL_ADDRESS=0x5FbDB...
ADI_TOKEN_FACTORY_ADDRESS=0xe7f17...
ADI_VAULT_MANAGER_ADDRESS=0x9fE46...
ADI_INSTITUTION_REGISTRY_ADDRESS=0xCf7Ed...

# Hedera Addresses (depuis Etape 3)
HEDERA_COUPON_SCHEDULER_ADDRESS=0x00000...
HEDERA_YIELD_DISTRIBUTOR_ADDRESS=0x00000...

# Server
PORT=3001
```

### Installer et lancer

```bash
pnpm install
pnpm run dev
```

Le backend tourne sur `http://localhost:3001`. Verifie avec :

```bash
curl http://localhost:3001/health
# {"status":"ok","service":"instivault-backend"}
```

---

## Etape 5 — Verifier que tout marche

### Test ADI (via backend)

```bash
# Lister les tokens
curl http://localhost:3001/api/adi/tokens

# Lister les institutions
curl http://localhost:3001/api/adi/institutions
```

### Test Hedera (via backend)

```bash
# Lister les bonds
curl http://localhost:3001/api/hedera/bonds
```

### Test Hedera E2E (direct)

```bash
cd packages/contracts-hedera
pnpm run e2e
```

---

## Resume : ou mettre quoi

```
.env (racine)
├── ADI_PRIVATE_KEY          ← ta cle privee
├── ADI_RPC_URL              ← RPC de la chain ADI (ou localhost:8545)
├── ADI_ACCESS_CONTROL_ADDRESS    ← sortie de Deploy.s.sol
├── ADI_TOKEN_FACTORY_ADDRESS     ← sortie de Deploy.s.sol
├── ADI_VAULT_MANAGER_ADDRESS     ← sortie de Deploy.s.sol
├── ADI_INSTITUTION_REGISTRY_ADDRESS ← sortie de Deploy.s.sol
├── HEDERA_OPERATOR_ID       ← portal.hedera.com
├── HEDERA_OPERATOR_KEY      ← portal.hedera.com
├── HEDERA_COUPON_SCHEDULER_ADDRESS  ← sortie de deploy.ts
└── HEDERA_YIELD_DISTRIBUTOR_ADDRESS ← sortie de deploy.ts

packages/backend/.env         ← copie les memes valeurs ici
```

---

## Troubleshooting

| Probleme | Solution |
|----------|----------|
| `Missing ADI_PRIVATE_KEY` | Verifie que `.env` est bien rempli et que tu as fait `source .env` |
| `forge script` echoue | Verifie que Anvil tourne (`anvil`) ou que `ADI_RPC_URL` est correct |
| Hedera deploy echoue `INSUFFICIENT_PAYER_BALANCE` | Ton compte testnet n'a plus de HBAR — recree un compte sur portal.hedera.com |
| Hedera deploy echoue `CONTRACT_REVERT_EXECUTED` | Le gas est insuffisant — augmente `setGas(3_000_000)` dans deploy.ts |
| Backend crash `Cannot read abi` | Les ABIs n'existent pas — lance `forge build` dans les deux packages d'abord |
| `ECONNREFUSED localhost:8545` | Anvil n'est pas lance — ouvre un terminal et lance `anvil` |

# Outward — Hub RWA Confidentiel et Automatisé pour les Institutions

## Contexte

### Hackathon
- **Événement :** ETHDenver 2026
- **Track ciblé :** New France Village
- **Thématiques du track :** DeFi, TradFi, Real World Assets (RWA), adoption institutionnelle

### Problème adressé
Les institutions financières souhaitant tokeniser et gérer des actifs du monde réel (obligations, factures, immobilier) font face à trois obstacles majeurs :

1. **Confidentialité** — Les stratégies d'investissement et les données de portefeuille sont exposées sur les blockchains publiques
2. **Automatisation** — Le versement des rendements/coupons dépend de serveurs centralisés (off-chain), créant des points de défaillance
3. **Intelligence décisionnelle** — L'analyse de risque des portefeuilles RWA reste manuelle et fragmentée

### Solution : Outward
Un hub intégré où les institutions peuvent :
- **Tokeniser** des RWA sur une infrastructure dédiée
- **Négocier** ces actifs en toute confidentialité
- **Automatiser** les paiements de coupons/rendements de manière déterministe on-chain
- **Analyser** leurs vaults via un assistant IA embarqué

---

## Fonctionnalités Concrètes

### Vue d'ensemble produit

Outward se présente comme une **plateforme SaaS white-label** destinée aux asset managers, banques privées et family offices. L'interface est un dashboard institutionnel unique qui orchestre les 4 couches techniques de manière transparente pour l'utilisateur final.

### F1 — Émission & Tokenisation d'actifs (ADI)

**Ce que l'utilisateur fait concrètement :**

Un asset manager se connecte au dashboard, clique sur "Émettre un nouvel actif" et remplit un formulaire structuré :

| Champ | Exemple |
|---|---|
| Type d'actif | Obligation corporate | invoices
| Nom | BondToken-ACME-2026 |
| Valeur nominale | 1 000 000 USD |
| Taux de coupon | 5% annuel |
| Fréquence de paiement | Semestrielle |
| Date de maturité | 15/02/2028 |
| Nombre de tokens | 1 000 (= 1 000 USD / token) |
| Juridiction | France |

**Ce qui se passe en coulisses :**
- Le contrat `RWATokenFactory` mint 1 000 tokens ERC-20 sur la chaîne ADI
- Chaque token porte des métadonnées on-chain (ISIN, taux, maturité, émetteur)
- Le contrat `AccessControl` attribue les rôles : l'émetteur est `Issuer`, les acheteurs seront `Investor`, un cabinet d'audit externe peut être ajouté comme `Auditor`

**Fonctionnalités détaillées :**
- **Registre d'actifs** — Liste de tous les RWA tokenisés avec statut (actif, échu, en défaut)
- **Fractionnement** — Un actif de 1M USD peut être divisé en 1 000 tokens de 1 000 USD, rendant l'investissement accessible à des tickets plus petits
- **Transferts contrôlés** — Seuls les wallets whitelistés (KYC validé) peuvent recevoir des tokens. Un transfert vers un wallet non autorisé est bloqué au niveau du smart contract
- **Burn à maturité** — À l'échéance de l'obligation, les tokens sont automatiquement brûlés et le nominal est remboursé
- **Multi-tenant white-label** — Chaque institution peut déployer sa propre instance avec son branding (logo, couleurs, nom de domaine)

---

### F2 — Vaults Confidentiels & Data Rooms Privées (Canton)

**Ce que l'utilisateur fait concrètement :**

Une banque privée crée un "Vault Confidentiel" et y dépose des tokens RWA. Elle invite une contrepartie (un fonds d'investissement) à consulter le vault pour une potentielle transaction. Un auditeur est ajouté avec des droits limités.

**Scénario concret — Data Room M&A :**
```
1. BNP Paribas tokenise un portefeuille de créances (10M USD) sur ADI
2. BNP crée un Vault Confidentiel sur Canton et y dépose les tokens
3. BNP invite BlackRock à consulter le vault :
   → BlackRock voit : composition du portefeuille, rendements historiques, rating
   → BlackRock ne voit PAS : les autres vaults de BNP, ni le prix de réserve
4. BNP invite Deloitte comme auditeur :
   → Deloitte voit : la conformité réglementaire, les dates, les montants
   → Deloitte ne voit PAS : l'identité de BlackRock ni les termes de négociation
5. BlackRock fait une offre via un PrivateTrade (visible uniquement par BNP et BlackRock)
6. BNP accepte → le transfert de tokens s'exécute, personne d'autre ne le sait
```

**Fonctionnalités détaillées :**
- **Création de vault confidentiel** — L'utilisateur choisit les parties autorisées et leur niveau d'accès (lecture seule, proposition de trade, audit)
- **Invitation de parties** — Mécanisme d'invitation par clé publique Canton. La partie invitée reçoit une notification et accepte/refuse
- **Niveaux de visibilité granulaires** :
  - `Owner` — Voit tout, peut modifier le vault, accepter/refuser des trades
  - `Counterparty` — Voit la composition et peut proposer un trade
  - `Auditor` — Vue en lecture seule limitée aux données de compliance
  - `Public` — Ne voit rien (le vault n'existe pas pour le monde extérieur)
- **Négociation privée (PrivateTrade)** — Système d'offre/contre-offre bilatéral. Chaque proposition est un contrat Daml visible uniquement par les deux parties
- **Historique d'audit immuable** — Chaque action (consultation, offre, acceptation) est loggée dans Canton mais visible uniquement par les parties concernées

---

### F3 — Paiements de Coupons Automatisés (Hedera)

**Ce que l'utilisateur fait concrètement :**

Lors de la créa tion d'un vault contenant un titre obligataire, l'utilisateur active l'option "Automatiser les rendements". Le système configure automatiquement les paiements planifiés.

**Scénario concret — Coupon semestriel :**
```
Obligation : BondToken-ACME-2026
├── Valeur totale : 1 000 000 USD
├── Taux : 5% annuel → 2.5% par semestre → 25 000 USD / paiement
├── Fréquence : Semestrielle
├── Détenteurs : 15 investisseurs institutionnels
│
│  Jour J (création du vault) :
│  └─ Le CouponScheduler crée 4 transactions planifiées via Hedera :
│       ├── Paiement #1 : 15/08/2026 → 25 000 USD distribués au prorata
│       ├── Paiement #2 : 15/02/2027 → 25 000 USD distribués au prorata
│       ├── Paiement #3 : 15/08/2027 → 25 000 USD distribués au prorata
│       └── Paiement #4 : 15/02/2028 → 25 000 USD + remboursement nominal
│
│  Jour du paiement (automatique, sans intervention) :
│  └─ Hedera Schedule Service exécute la transaction
│       └─ YieldDistributor répartit les tokens aux 15 détenteurs
│            ├── Investisseur A (détient 10%) → reçoit 2 500 USD
│            ├── Investisseur B (détient 25%) → reçoit 6 250 USD
│            └── ... (au prorata des parts détenues)
```

**Fonctionnalités détaillées :**
- **Configuration automatique** — L'utilisateur ne fait rien manuellement : les dates de paiement sont calculées à partir des paramètres de l'obligation
- **Distribution au prorata** — Si un investisseur vend une partie de ses tokens entre deux coupons, le paiement suivant est recalculé automatiquement en fonction du snapshot des détenteurs
- **Dashboard de suivi des rendements** — Vue calendrier montrant : paiements passés (avec montants), paiements à venir (avec dates), rendement cumulé
- **Alertes** — Notification 48h avant chaque paiement planifié + confirmation après exécution
- **Gestion des défauts** — Si le pool de liquidité du vault est insuffisant pour couvrir un coupon, une alerte est remontée à l'émetteur et aux investisseurs. Le paiement est suspendu (pas d'exécution partielle silencieuse)
- **Remboursement à maturité** — Le dernier paiement inclut le remboursement du nominal + le dernier coupon. Les tokens RWA sont brûlés automatiquement

---

### F4 — Assistant IA de Gestion des Risques (0G Labs)

**Ce que l'utilisateur fait concrètement :**

Sur le dashboard d'un vault, l'utilisateur clique sur "Analyser ce vault". L'assistant IA scanne la composition du vault et retourne un rapport structuré en 10-15 secondes.

**Scénario concret — Analyse d'un vault multi-actifs :**
```
Vault : "Fixed Income Europe Q1"
├── Composition :
│   ├── 40% — Obligations souveraines France (AAA, 2.1%)
│   ├── 35% — Corporate bonds Allemagne (A+, 4.3%)
│   └── 25% — Factures affacturées Italie (BBB, 7.8%)
│
│  L'utilisateur clique "Analyser ce vault"
│
│  RAPPORT IA (généré via 0G Compute) :
│  ┌──────────────────────────────────────────────────┐
│  │  SCORE DE RISQUE GLOBAL : 42/100 (Modéré)        │
│  │                                                    │
│  │  ANALYSE PAR POSITION :                            │
│  │  ✅ Obligations France : Risque faible (12/100)    │
│  │     → Rating souverain stable, duration courte     │
│  │  ⚠️ Corporate Allemagne : Risque modéré (38/100)   │
│  │     → Secteur industriel exposé au cycle            │
│  │  🔴 Factures Italie : Risque élevé (71/100)        │
│  │     → Concentration géographique + rating BBB       │
│  │                                                    │
│  │  RECOMMANDATIONS :                                 │
│  │  1. Réduire l'exposition Italie de 25% à 15%       │
│  │     → Réallouer 10% vers obligations France        │
│  │  2. Ajouter une couverture de taux (swap)          │
│  │     → Duration du portefeuille = 3.2 ans           │
│  │                                                    │
│  │  STRESS TEST :                                     │
│  │  • Si taux BCE +1% → Valeur du vault : -2.8%       │
│  │  • Si taux BCE +2% → Valeur du vault : -5.4%       │
│  │  • Si défaut Italie → Valeur du vault : -18.2%     │
│  │                                                    │
│  │  [Approuver rééquilibrage] [Rejeter] [Détails]     │
│  └──────────────────────────────────────────────────┘
```

**Fonctionnalités détaillées :**
- **Analyse on-demand** — L'utilisateur déclenche l'analyse manuellement (pas de trading automatique)
- **Score de risque composite** — Note de 1 à 100 calculée à partir de : rating des actifs, concentration géographique/sectorielle, duration, volatilité historique
- **Recommandations actionnables** — Chaque recommandation est liée à une action concrète (rééquilibrage, ajout de collatéral, sortie de position) avec un bouton d'exécution
- **Stress testing** — Simulation de scénarios macro (hausse des taux, défaut d'un émetteur, crise sectorielle) avec impact chiffré sur la valeur du vault
- **Human-in-the-loop strict** — L'IA ne peut JAMAIS exécuter une transaction seule. Chaque action recommandée passe par un écran de confirmation explicite avec résumé de l'impact
- **Historique des analyses** — L'utilisateur peut consulter les analyses passées et suivre l'évolution du score de risque dans le temps
- **Export PDF** — Le rapport IA peut être exporté en PDF pour reporting interne ou partage avec les auditeurs

---

### F5 — Dashboard Institutionnel (Frontend)

**Vue principale — Portfolio Overview :**
```
┌──────────────────────────────────────────────────────────────┐
│  Outward           [Vault: Fixed Income EU]  [🔔] [Admin] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  VALEUR TOTALE DES ACTIFS          RENDEMENT YTD             │
│  $12,450,000                       +4.2%                     │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 3 Vaults    │ │ 12 Actifs   │ │ 2 Paiements │            │
│  │ actifs      │ │ tokenisés   │ │ à venir     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
│  VAULTS                                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Fixed Income EU    │ $5.2M │ Risk: 42 │ 🟢 Actif    │    │
│  │ US Treasury Pool   │ $4.8M │ Risk: 18 │ 🟢 Actif    │    │
│  │ EM Corporate       │ $2.4M │ Risk: 67 │ 🟡 Attention│    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  PROCHAIN PAIEMENT                                           │
│  BondToken-ACME-2026 → 25,000 USD → dans 12 jours           │
│                                                              │
│  DERNIÈRE ANALYSE IA                                         │
│  Vault "EM Corporate" — Score 67/100 — 1 recommandation      │
│  [Voir le rapport]                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Pages et fonctionnalités du frontend :**

| Page | Description |
|---|---|
| **Dashboard** | Vue d'ensemble : valeur totale, nombre de vaults, prochains paiements, alertes |
| **Mes Vaults** | Liste des vaults avec filtres (par risque, par type d'actif, par statut) |
| **Détail Vault** | Composition, historique des rendements, graphique d'évolution, bouton "Analyser IA" |
| **Émettre un actif** | Formulaire de tokenisation (type, montant, taux, maturité, juridiction) |
| **Data Room** | Gestion des vaults confidentiels Canton : invitations, niveaux d'accès, négociations |
| **Calendrier Rendements** | Vue calendrier des paiements automatisés Hedera (passés et à venir) |
| **Rapports IA** | Historique des analyses, évolution des scores, exports PDF |
| **Administration** | Gestion des rôles (RBAC), whitelist de wallets, configuration white-label |

---

### F6 — Gestion des Rôles & Permissions (RBAC)

Le système définit **4 rôles** avec des permissions strictes :

| Rôle | Peut émettre | Peut investir | Peut auditer | Peut administrer | Voit les données confidentielles |
|---|---|---|---|---|---|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ (toutes) |
| **Issuer** (Émetteur) | ✅ | ❌ | ❌ | ❌ | ✅ (ses propres actifs) |
| **Investor** | ❌ | ✅ | ❌ | ❌ | ✅ (ses vaults uniquement) |
| **Auditor** | ❌ | ❌ | ✅ | ❌ | ⚠️ (vue compliance limitée) |

**Cas d'usage concrets :**
- Un `Admin` de BNP déploie l'instance Outward avec le branding BNP
- Un `Issuer` tokenise un portefeuille de créances et crée un vault
- Un `Investor` (BlackRock) achète des tokens et suit ses rendements
- Un `Auditor` (Deloitte) vérifie la conformité sans voir les stratégies

---

## Scénario de Démo Complet (Vidéo < 3 min)

Ce scénario sera utilisé pour la vidéo de démonstration et la présentation aux juges :

```
00:00 - 00:20  INTRO
  "Outward permet aux institutions de tokeniser, négocier en confidentialité,
   automatiser les rendements et analyser les risques de leurs actifs réels."

00:20 - 00:50  TOKENISATION (ADI)
  → L'asset manager se connecte
  → Il tokenise une obligation corporate de 1M USD, coupon 5% semestriel
  → 1 000 tokens sont créés sur ADI

00:50 - 01:20  CONFIDENTIALITÉ (Canton)
  → Création d'un vault confidentiel
  → Invitation d'une contrepartie (vue investisseur) et d'un auditeur (vue limitée)
  → Démonstration : 3 écrans côte à côte montrant ce que chaque partie voit

01:20 - 01:50  AUTOMATISATION (Hedera)
  → Les paiements de coupons sont planifiés automatiquement
  → Vue calendrier : 4 paiements sur 2 ans
  → Simulation d'un paiement exécuté → les investisseurs reçoivent leur part

01:50 - 02:30  ANALYSE IA (0G Labs)
  → Clic sur "Analyser ce vault"
  → Le rapport IA apparaît : score de risque, recommandations, stress test
  → L'utilisateur clique "Approuver rééquilibrage" → la transaction se prépare
  → Confirmation explicite avant exécution

02:30 - 02:50  RÉCAP
  "4 couches, 1 plateforme. Tokenisation, confidentialité, automatisation, intelligence.
   Outward — le hub RWA institutionnel."
```

---

## Architecture Technique — 4 Couches

Le projet s'appuie sur **4 technologies sponsors**, chacune avec un rôle strict et indispensable. Aucune n'est un ajout cosmétique — chaque couche est une dépendance fonctionnelle du système.

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Web App)                    │
│             Interface institutionnelle React             │
├─────────────┬──────────────┬─────────────┬──────────────┤
│   Couche 1  │   Couche 2   │  Couche 3   │  Couche 4    │
│     ADI     │    Canton    │   Hedera    │   0G Labs    │
│ Tokenisation│ Confidentialité│ Automatisation│     IA     │
└─────────────┴──────────────┴─────────────┴──────────────┘
```

### Couche 1 — Exécution & Tokenisation (ADI Foundation)

| Élément | Détail |
|---|---|
| **Rôle** | Infrastructure principale de tokenisation et gestion des RWA |
| **Actifs tokenisés** | Obligations, factures, titres de créance |
| **Déploiement** | Chaîne ADI (MVP déployé) |
| **Fonctionnalités clés** | Mint/burn de tokens RWA, registre d'actifs, transferts contrôlés |

**Exigences du bounty ADI :**
- MVP déployé sur la chaîne ADI adapté à un usage institutionnel
- Utilité économique réelle (pas un PoC théorique)
- Architecture prête pour la marque blanche (white-label ready)
- Contrôles d'administration basés sur les rôles (RBAC) ou multisigs

**Contrats déployés (Sepolia + ADI Chain 99999) :**
- `InstiVaultAccessControl` — RBAC (Admin, Issuer, Investor, Auditor) + whitelisting
- `RWAToken` — ERC-20 avec métadonnées RWA + restrictions de transfert + burn à maturité
- `RWATokenFactory` — Factory de tokens RWA + fractionnement
- `VaultManager` — Gestion des vaults (dépôt, retrait, allocation) + Pausable
- `InstitutionRegistry` — Registre multi-tenant white-label + multisig 2-of-N
- `InstitutionDeployer` — Deployer externe (contournement EIP-170)

---

### Couche 2 — Confidentialité (Canton Network)

| Élément | Détail |
|---|---|
| **Rôle** | Permettre les transactions RWA sans exposer les stratégies des institutions |
| **Cas d'usage** | Private M&A data rooms, Private DeFi |
| **Déploiement** | Devnet Canton L1 |
| **Langage** | Daml (contrats natifs, pas de wrappers) |

**Exigences du bounty Canton :**
- Contrats intelligents écrits **nativement en Daml**
- Déploiement sur le **Devnet Canton L1**
- Démonstration claire de la **séparation de visibilité** entre les parties (qui voit quoi)

**Modèle de confidentialité :**
```
Institution A ──┐
                 ├── Vault partagé (données visibles uniquement aux parties autorisées)
Institution B ──┘
                    │
Auditeur ───────────┘ (vue limitée : compliance uniquement)
                    │
Public ─────────────X (aucune visibilité sur les positions/stratégies)
```

**Templates Daml prévus :**
- `ConfidentialVault` — Vault dont les détails ne sont visibles que par les parties autorisées
- `PrivateTrade` — Proposition et exécution de trades RWA en confidentialité
- `AuditRight` — Droit d'audit limité accordé à un tiers (vue partielle)

---

### Couche 3 — Automatisation (Hedera)

| Élément | Détail |
|---|---|
| **Rôle** | Automatiser le versement des rendements/coupons de manière déterministe |
| **Mécanisme** | Hedera Schedule Service (transactions planifiées) |
| **Avantage** | Aucune dépendance à des serveurs off-chain (cron jobs, keepers) |

**Exigences du bounty Hedera :**
- Utilisation du **Hedera Schedule Service** pour créer et exécuter des transactions planifiées
- Paiements de coupons pour titres tokenisés
- Transactions initiées **directement depuis un smart contract**

**Flux d'automatisation :**
```
1. Institution crée un vault avec un titre obligataire tokenisé (ADI)
2. Le smart contract Hedera planifie automatiquement les paiements de coupons
   → Ex: coupon de 5% semestriel → paiement planifié tous les 6 mois
3. À la date prévue, le Hedera Schedule Service exécute le paiement
4. Les tokens de rendement sont distribués aux détenteurs du vault
5. Tout est on-chain, déterministe, sans intervention humaine
```

**Contrats déployés (Hedera Testnet) :**
- `CouponScheduler` — Planification via precompile 0x16b (IHRC755 + IHRC1215) + access control + Pausable
- `YieldDistributor` — Distribution pro-rata par snapshot aux détenteurs de tokens RWA
- `HederaScheduleService` — Base abstraite pour l'interaction avec le precompile Hedera

---

### Couche 4 — Intelligence Artificielle / DeFAI (0G Labs)

| Élément | Détail |
|---|---|
| **Rôle** | Assistant IA pour l'analyse de risque et la recommandation de gestion de vault |
| **Infrastructure** | 0G Compute (inférence on-chain) |
| **Principe** | Human-in-the-loop — l'utilisateur approuve avant toute exécution |

**Exigences du bounty 0G Labs :**
- Intégration de **0G Compute** pour l'inférence IA
- L'IA produit des **décisions structurées** (simulations de stratégies de vault)
- **Approbation explicite** de l'utilisateur avant toute exécution de transaction

**Fonctionnalités IA :**
```
Entrée : Données du vault (composition, rendements, échéances, risques)
    │
    ▼
0G Compute (inférence)
    │
    ▼
Sortie structurée :
  - Score de risque du vault (1-100)
  - Recommandations (rééquilibrage, sortie de position, ajout de collatéral)
  - Simulation de scénarios (stress test : que se passe-t-il si taux +2% ?)
    │
    ▼
Dashboard utilisateur → Bouton "Approuver & Exécuter" ou "Rejeter"
```

---

## Flux Utilisateur Global

```
┌──────────────────────────────────────────────────────────────────┐
│                        FLUX OUTWARD                          │
│                                                                  │
│  1. LOGIN                                                        │
│     └─ Connexion wallet institutionnel (rôle assigné via RBAC)   │
│                                                                  │
│  2. TOKENISATION (ADI)                                           │
│     └─ L'institution tokenise un actif (ex: obligation 5% p.a.)  │
│     └─ Le token est créé sur la chaîne ADI                       │
│                                                                  │
│  3. CONFIGURATION VAULT (ADI + Canton)                           │
│     └─ Création d'un vault confidentiel                          │
│     └─ Définition des parties autorisées (Canton/Daml)           │
│     └─ Les données restent privées entre les parties             │
│                                                                  │
│  4. AUTOMATISATION RENDEMENTS (Hedera)                           │
│     └─ Le vault configure les paiements de coupons automatiques  │
│     └─ Hedera Schedule Service planifie les transactions          │
│     └─ Exécution déterministe sans serveur off-chain             │
│                                                                  │
│  5. ANALYSE IA (0G Labs)                                         │
│     └─ L'assistant IA analyse le vault en temps réel             │
│     └─ Recommandations de gestion des risques                    │
│     └─ L'utilisateur approuve ou rejette avant exécution          │
│                                                                  │
│  6. MONITORING                                                   │
│     └─ Dashboard institutionnel : positions, rendements, risques │
│     └─ Vue auditeur limitée (compliance)                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Stack Technique

| Composant | Technologie |
|---|---|
| **Frontend** | React / Next.js + TailwindCSS |
| **Wallet** | WalletConnect / MetaMask (adapté ADI) |
| **Smart Contracts (ADI)** | Solidity (EVM-compatible) |
| **Smart Contracts (Canton)** | Daml |
| **Smart Contracts (Hedera)** | Solidity (Hedera Smart Contract Service) + Hedera SDK |
| **IA / Inférence** | 0G Compute |
| **Backend API** | Node.js / Express (bridge entre les couches) |
| **Déploiement** | Vercel (frontend) + Devnets/Testnets (contrats) |

---

## Structure du Dépôt

```
ETH-Denver/
├── CLAUDE.md                     # Context Claude Code
├── PROJECT_OVERVIEW.md           # Ce fichier
├── TIMELINE.md                   # Roadmap et suivi d'avancement
├── .env.example                  # Template des variables d'environnement
├── packages/
│   ├── contracts-adi/            # Foundry — Solidity (ADI chain)
│   │   ├── src/                  # 6 contrats (InstiVaultAccessControl, RWAToken, etc.)
│   │   ├── test/                 # 111 tests Forge
│   │   ├── script/               # Deploy.s.sol + Demo.s.sol
│   │   ├── abi/                  # ABIs extraits pour le backend
│   │   └── broadcast/            # Records de déploiement (Sepolia + ADI)
│   ├── contracts-hedera/         # Solidity + Hedera SDK
│   │   ├── contracts/            # CouponScheduler, YieldDistributor, HederaScheduleService
│   │   ├── test/                 # 74 tests Forge
│   │   ├── src/                  # Scripts TS (deploy, schedule-coupon, e2e-test)
│   │   ├── abi/                  # ABIs extraits pour le backend
│   │   └── deployments.json      # Adresses déployées Hedera Testnet
│   ├── contracts-canton/         # Templates Daml (Canton Network)
│   │   └── daml/                 # ConfidentialVault, PrivateTrade, AuditRight + tests
│   ├── ai-engine/                # Module IA (0G Compute)
│   │   └── src/                  # risk-analyzer, strategy-simulator, 0g-client
│   ├── backend/                  # Express API (TypeScript)
│   │   └── src/                  # Routes (adi, hedera, canton, ai) + config
│   └── frontend/                 # Next.js + TailwindCSS + RainbowKit
│       └── src/                  # Pages, composants UI, mock data
└── pnpm-workspace.yaml
```

---

## Bounties Ciblés — Checklist de Conformité

### ADI Foundation
- [x] MVP déployé sur chaîne ADI (99999) + Sepolia (11155111)
- [x] Utilité économique réelle (tokenisation + vault + fractionnement + allocation)
- [x] Architecture white-label ready (InstitutionRegistry multi-tenant)
- [x] RBAC (4 rôles) + multisig 2-of-N pour l'administration
- [x] Pausable sur VaultManager (arrêt d'urgence)
- [x] 111 tests passants + script de démo (`Demo.s.sol`)

### Canton Network
- [x] Contrats Daml natifs (ConfidentialVault, PrivateTrade, AuditRight)
- [ ] Déployés sur Devnet Canton L1
- [x] Séparation de visibilité démontrée (Owner/Counterparty/Auditor)

### Hedera
- [x] Utilisation du Hedera Schedule Service (precompile 0x16b)
- [x] Transactions planifiées créées et exécutées (paiements de coupons)
- [x] Initiation depuis un smart contract (pas depuis un script off-chain)
- [x] Access control sur executeCoupon + Pausable
- [x] 74 tests passants, déployé sur Hedera Testnet

### 0G Labs
- [x] Intégration de 0G Compute (inférence)
- [x] Décisions structurées produites par l'IA (score de risque, recommandations)
- [x] Human-in-the-loop : approbation utilisateur avant exécution

---

## Livrables Hackathon

| Livrable | Statut | Description |
|---|---|---|
| Dépôt GitHub public | [x] Créé | github.com/DVB-ANS/ETH-DENVER |
| URL de démo live | [ ] À déployer | Interface web institutionnelle fonctionnelle |
| Vidéo de démo | [ ] À enregistrer | < 3 minutes, flux complet du produit |
| README complet | [ ] À rédiger | Setup, architecture, modèle de confidentialité |

---

## Risques Techniques Identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| Daml (Canton) — langage peu familier | Élevé | Commencer le développement Daml en priorité |
| Hedera Schedule Service — documentation limitée | Moyen | Prototyper rapidement avec le SDK Hedera |
| Interopérabilité entre 4 chaînes/services | Élevé | Backend API comme couche d'orchestration |
| 0G Compute — SDK en phase early | Moyen | Fallback possible sur un mock d'inférence pour la démo |
| Temps limité (hackathon) | Élevé | Prioriser les exigences critiques de chaque bounty |

---

## Prochaines Étapes

1. ~~Initialiser le repo~~ ✅
2. ~~Canton/Daml~~ ✅ (templates + tests, reste deploy Devnet L1)
3. ~~ADI~~ ✅ (6 contrats, 111 tests, déployé Sepolia + ADI)
4. ~~Hedera~~ ✅ (74 tests, déployé Hedera Testnet)
5. ~~0G Labs~~ ✅ (risk-analyzer, strategy-simulator, mock fallback)
6. **Frontend** — Remplacer les mock data par les vrais appels API backend
7. **Deploy Canton** — Déployer les templates Daml sur Devnet L1
8. **Tests & Démo** — Scénario de bout en bout + enregistrement vidéo

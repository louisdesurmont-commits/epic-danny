# 🧊 App Traca — Gestion décongélation & stock frigo

Application web métier dédiée à la gestion :

- des besoins de décongélation
- des stocks frigo par lot
- des expéditions (OT)
- des mouvements de stock
- de la traçabilité (lots)

---

## 🚀 Objectif

Faciliter le pilotage opérationnel en cuisine / production :

- anticiper les besoins de décongélation
- suivre précisément les stocks par lot
- tracer tous les mouvements (inventaire, ajustement, expédition)
- sécuriser les flux en cas de rappel produit

---

## 🧩 Fonctionnalités principales

### 📦 1. Gamme produits

- Import des produits via fichier
- Gestion des cibles journalières (Lun → Dim)
- Modification rapide des paramètres produit

---

### 📥 2. Import OT

- Import des ordres de transfert
- Visualisation par boutique / OT
- Consolidation des quantités par SKU

---

### ❄️ 3. Besoins de décongélation

- Calcul automatique des besoins
- Basé sur :
  - stock actuel
  - OT à venir
  - cibles journalières
- Bouton de recalcul manuel

---

### ✅ 4. Validation décongélation

- Allocation par lot
- Validation / rejet des lignes
- Génération automatique :
  - des mouvements
  - des entrées en stock frigo

---

### 🚚 5. Expéditions

- Sélection :
  - date
  - boutique
  - OT
- Allocation intelligente par lot :
  - mono-lot automatique
  - multi-lots
- Gestion des cas :
  - complet
  - partiel
  - rupture totale
- Confirmation avec alertes si rupture

---

### 🧊 6. Stock frigo

- Vue consolidée par SKU / lot
- Ajustements manuels
- Inventaires :
  - comparaison théorique vs réel
  - calcul automatique de l’écart

---

### 🔄 7. Mouvements

- Historique complet
- Types :
  - entrée frigo
  - sortie OT
  - ajustement
  - inventaire
  - expédition
- Filtres :
  - type
  - SKU
  - lot
  - description

---

## 🧠 Architecture (mise à jour)

### 📁 Organisation du projet

src/
├── components/
├── screens/
├── hooks/
│ ├── useAppData.ts ← état global + persistance
│ ├── useStockOperations.ts ← logique stock
│ ├── useMovementFilters.ts ← filtres mouvements
├── services/
│ ├── appDataService.ts ← localStorage
│ ├── fileImportService.ts
├── utils/
│ ├── fridgeStockMutations.ts
│ ├── shipments.ts
│ ├── defrost.ts
│ ├── transferOrders.ts
├── types.ts ← source unique des types
├── App.tsx ← orchestration UI

---

## 🔑 Principes d’architecture

### 1. Séparation claire des responsabilités

- `App.tsx` → orchestration UI uniquement
- `hooks/` → logique métier par domaine
- `utils/` → fonctions pures
- `services/` → accès données (localStorage, import)

---

### 2. Source unique des types

Tous les types sont centralisés dans :
src/types.ts

➡️ Aucun type ne doit être défini dans un hook ou un composant

---

### 3. Gestion centralisée des données

Le hook :
useAppData.ts

gère :

- le state principal
- le chargement initial
- la persistance automatique

➡️ `App.tsx` ne gère plus directement le stockage

---

### 4. Logique métier isolée

Exemples :

- `useStockOperations` → ajustements + inventaires
- `useMovementFilters` → filtrage UI
- `shipments.ts` → logique expédition

➡️ facilite maintenance et évolutions

---

## 💾 Persistance des données

- Stockage : **localStorage**
- Clé : `oai_app_data_v1`
- Géré par :

gère :

- le state principal
- le chargement initial
- la persistance automatique

➡️ `App.tsx` ne gère plus directement le stockage

---

### 4. Logique métier isolée

Exemples :

- `useStockOperations` → ajustements + inventaires
- `useMovementFilters` → filtrage UI
- `shipments.ts` → logique expédition

➡️ facilite maintenance et évolutions

---

## 💾 Persistance des données

- Stockage : **localStorage**
- Clé : `oai_app_data_v1`
- Géré par :
  src/services/appDataService.ts

Fonctions principales :

- `loadInitialAppData`
- `persistAppData`
- `resetAppData`

---

## ⚠️ Règles importantes

### 🔒 Traçabilité

- Tous les mouvements sont historisés
- Les lots sont obligatoires

### 🚫 Cohérence métier

- Pas de surexpédition
- Gestion explicite des ruptures
- Quantité expédiée = somme des allocations

---

## 🧪 Tests manuels recommandés

Après modification :

- ajustement stock
- inventaire
- validation décongélation
- expédition avec rupture
- filtres mouvements

Puis recharger la page pour vérifier la persistance

---

## 🔜 Roadmap technique (suggestions)

- [ ] Extraction du workflow expéditions (`useShipmentWorkflow`)
- [ ] OCR des étiquettes (SKU + lot)
- [ ] Backend/API (remplacer localStorage)
- [ ] Authentification utilisateurs
- [ ] Export PDF / CSV
- [ ] Gestion multi-sites

---

## 👨‍🍳 Contexte métier

Application conçue pour un usage terrain :

- production alimentaire
- gestion de lots
- contraintes de traçabilité fortes
- volume opérationnel quotidien élevé

---

## ⚙️ Stack technique

- React + TypeScript
- Architecture modulaire par hooks
- Aucun backend (actuellement)
- Déploiement possible via Vercel / Netlify

---

## 📌 Notes

Projet en évolution rapide.  
Les refactorings récents ont permis :

- une meilleure séparation des responsabilités
- une réduction de la complexité de `App.tsx`
- une base solide pour l’ajout de nouvelles fonctionnalités

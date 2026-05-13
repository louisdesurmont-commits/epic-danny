# App Traça

Application web de gestion simplifiée des flux agroalimentaires :

- décongélation,
- stock frigo,
- expéditions,
- mouvements de stock,
- import d’OT,
- traçabilité par lots,
- journal des opérations,
- authentification utilisateurs.

Le projet est conçu pour être :

- simple à utiliser sur le terrain,
- rapide sur mobile/tablette,
- exploitable par des équipes opérationnelles non techniques,
- traçable pour les besoins qualité et sécurité alimentaire.

---

# Stack technique

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend / Base de données

- Supabase

  - PostgreSQL
  - Authentification utilisateurs
  - Row Level Security (RLS)

## Fonctionnalités complémentaires

- OCR via Tesseract.js
- Génération PDF
- Gestion des états via hooks React

---

# Fonctionnalités principales

## 1. Gestion du stock frigo

Le stock est géré par :

- numéro d’article,
- lot,
- DLC,
- quantité.

Chaque ligne de stock représente un lot distinct.

Fonctions disponibles :

- ajustement manuel,
- inventaire,
- entrées,
- sorties,
- consommation par décongélation,
- consommation par expédition.

Le stock est persisté dans Supabase.

---

## 2. Journal des mouvements

Tous les mouvements sont historisés :

- date,
- heure,
- utilisateur,
- type de mouvement,
- lot,
- article,
- quantité,
- commentaire.

Types de mouvements :

- entrée frigo,
- sortie OT,
- ajustement,
- inventaire,
- expédition.

Le journal est filtrable par :

- type,
- article,
- description,
- lot.

---

## 3. Décongélation

Le module de décongélation permet :

- de calculer les besoins de décongélation,
- de proposer automatiquement les quantités,
- de sélectionner les lots,
- de valider ou ignorer les besoins,
- de tracer les opérations.

Fonctionnalités :

- validation unitaire,
- validation en masse,
- gestion multi-lots,
- contrôle des quantités,
- scan d’étiquette,
- OCR des lots.

Les besoins sont persistés dans Supabase.

---

## 4. OCR / Scan d’étiquette

Le système permet :

- l’ouverture de l’appareil photo,
- le scan d’étiquettes,
- la reconnaissance OCR,
- l’extraction du code article,
- l’extraction du numéro de lot.

Le parser reconstruit les lots selon les règles métier définies.

Utilisation :

- scan global,
- pré-remplissage automatique des lots,
- accélération des opérations terrain.

---

## 5. Gestion des OT (Transfer Orders)

Les OT peuvent être importés.

Le système :

- stocke les OT dans Supabase,
- gère les lignes d’OT,
- calcule les besoins,
- suit les statuts.

Les OT servent de base :

- aux besoins de décongélation,
- aux préparations,
- aux expéditions.

---

## 6. Expéditions

Le module expédition permet :

- de sélectionner les OT ouverts,
- de préparer les allocations de lots,
- de gérer les ruptures,
- de valider les expéditions.

Fonctionnalités :

- allocation automatique,
- allocation multi-lots,
- validation avec contrôle,
- gestion des quantités partielles,
- suivi des statuts.

Les expéditions génèrent automatiquement des mouvements de stock.

---

## 7. Génération PDF

L’application génère plusieurs documents PDF :

- bons de livraison,
- listes de préparation,
- documents imprimables.

Fonctionnalités :

- mise en page optimisée terrain,
- gestion des lots,
- gestion des descriptions longues,
- format impression.

---

## 8. Authentification utilisateurs

L’accès à l’application nécessite :

- un compte utilisateur,
- un mot de passe.

L’authentification est gérée via Supabase Auth.

Chaque utilisateur possède :

- un compte Auth,
- un profil applicatif.

Les opérations sont tracées avec :

- user_id,
- username,
- date,
- heure.

---

# Sécurité

## Row Level Security (RLS)

Les tables Supabase sont protégées par RLS.

Seuls les utilisateurs authentifiés peuvent accéder aux données.

Tables sécurisées :

- catalog_products
- stock_lots
- stock_movements
- transfer_orders
- transfer_order_lines
- defrost_state
- user_profiles

---

# Structure du projet

## Dossiers principaux

```text
src/
 ├── components/
 ├── hooks/
 ├── lib/
 ├── screens/
 ├── services/
 ├── types/
 ├── utils/
```

## Services Supabase

### `supabaseStockService.ts`

Gestion :

- stock,
- mouvements,
- synchronisation.

### `supabaseTransferOrdersService.ts`

Gestion :

- OT,
- lignes d’OT,
- imports.

### `supabaseDefrostService.ts`

Gestion :

- état de décongélation.

### `authService.ts`

Gestion :

- connexion,
- session utilisateur,
- déconnexion.

---

# Installation

## 1. Installer les dépendances

```bash
npm install
```

## 2. Variables d’environnement

Créer un fichier `.env` :

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

# Supabase

## Tables principales

- catalog_products
- stock_lots
- stock_movements
- transfer_orders
- transfer_order_lines
- defrost_state
- user_profiles

---

# Authentification

## Création d’un utilisateur

Dans Supabase :

Authentication → Users → Add user

Puis créer le profil :

```sql
insert into user_profiles (id, username)
select id, 'Nom utilisateur'
from auth.users
where email = 'utilisateur@entreprise.com';
```

---

# Développement

## Lancer l’application

```bash
npm run dev
```

---

# Déploiement

Le frontend peut être déployé sur :

- Vercel,
- Netlify,
- Codesandbox,
- autre hébergement statique.

Supabase héberge :

- base PostgreSQL,
- authentification,
- API.

---

# Philosophie produit

L’objectif du projet est de fournir un outil :

- simple,
- rapide,
- orienté terrain,
- adapté à l’agroalimentaire,
- traçable,
- mobile-first.

Le focus est mis sur :

- l’efficacité opérationnelle,
- la simplicité utilisateur,
- la sécurité alimentaire,
- la traçabilité des lots.

# CLAUDE.md - ODL Tools Dashboard

## 📌 Qu'est-ce que cette application ?

**ODL Tools Dashboard** est le **dashboard central** de l'écosystème O!Deal Tools.

- **URL Production**: https://app.odl-tools.ch
- **URL Locale**: http://localhost:3001
- **Technologie**: Next.js 15.5.5 (App Router)
- **Base de données**: Supabase PostgreSQL
- **Authentification**: SSO avec Supabase Auth

## 🎯 Fonctionnalités Principales

### 1. **Système d'Authentification SSO**
- Login/Logout avec Supabase Auth
- Gestion des profils utilisateurs
- RLS (Row Level Security) sur toutes les tables
- Système de rôles (super_admin, admin, user)
- Onboarding et validation de profils

### 2. **Calculateurs Intégrés**
- **Transport** (`/transport-calculator`) - Calcul des coûts de transport avec optimisation palettes
- **Logistique** (`/logistics-calculator`) - Calcul des frais de logistique
- **Douanes** (`/customs-calculator`) - Calcul des droits de douane

### 3. **API de Validation**
- Endpoint `/api/validate-item` - Validation des offres fournisseurs
- Authentification par API Key (SHA256)
- Calcul COGS, marges, savings
- 16 migrations Supabase dédiées

### 4. **Documentation API**
- Page `/api-docs` - Documentation interactive
- 4 APIs documentées (TAR, Image Converter, Translation, Validation)
- Exemples de code pour intégrations WeWeb et N8N

### 5. **Administration**
- `/admin` - Panel admin réservé aux super_admins
- `/admin/access-management` - Gestion des accès utilisateurs
- `/admin/profile-validation` - Validation des nouveaux profils

### 6. **Bonus**
- `/tetris` - Mini-jeu Tetris avec classement

## 🗂️ Structure du Code

```
app/
├── page.tsx                    # Page d'accueil (redirect vers /dashboard)
├── layout.tsx                  # Layout global avec auth
├── globals.css                 # Styles Tailwind
│
├── login/                      # Authentification
├── onboarding/                 # Processus d'onboarding
├── setup-account/              # Configuration compte
├── blocked/                    # Page pour users bloqués
│
├── dashboard/                  # Dashboard principal
│   ├── page.tsx               # Vue dashboard
│   └── layout.tsx             # Layout dashboard (auth protégé)
│
├── admin/                      # Zone administration
│   ├── page.tsx               # Admin panel
│   ├── access-management/     # Gestion accès
│   └── profile-validation/    # Validation profils
│
├── transport-calculator/       # Calculateur transport
├── logistics-calculator/       # Calculateur logistique
├── customs-calculator/         # Calculateur douanes
│
├── api-docs/                   # Documentation API
│   └── page.tsx               # Page docs (3000+ lignes!)
│
├── api/                        # API Routes
│   ├── auth/                  # Routes auth (callback, logout, SSO)
│   ├── admin/                 # Routes admin (invite, toggle-role, etc.)
│   ├── calculate-transport/   # API calcul transport
│   ├── calculate-logistics/   # API calcul logistique
│   ├── calculate-customs/     # API calcul douanes
│   └── validate-item/         # API validation offres
│
├── image-converter-test/       # Test Image Converter
├── translation-test/           # Test Traduction
└── tetris/                     # Jeu Tetris

components/
├── ui/                         # Composants UI réutilisables
│   ├── AppCard.tsx
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   └── BackToDashboard.tsx
│
├── AuthButton.tsx              # Bouton auth avec user menu
├── AdminUserTable.tsx          # Table users pour admin
├── InviteUserModal.tsx         # Modal invitation
└── PackingVisualization.tsx    # Visualisation palettes 3D

lib/
├── supabase.ts                 # Client Supabase côté client
├── supabase-server.ts          # Client Supabase côté serveur
├── sso.ts                      # Logique SSO
└── utils.ts                    # Utilitaires (cn, etc.)

supabase/
├── config.toml                 # Config Supabase CLI
├── migrations/                 # 32+ migrations SQL
│   ├── 20251023154916_logistics_calculator_schema.sql
│   ├── 20251025000001_create_supplier_registry.sql
│   ├── 20251025000013_create_validate_item_function.sql
│   └── ... (toutes les migrations)
│
├── functions/                  # Edge Functions Deno
│   └── refresh-currency/       # Refresh taux de change
│
└── seed-data/                  # Données de seed
    ├── customs_fees.csv
    ├── logistics_providers.csv
    └── logistics_rates.csv
```

## 🔑 Tables Supabase Principales

### Authentification & Profils
- `user_profiles` - Profils utilisateurs avec RLS
- `user_applications_access` - Accès aux différentes apps

### Calculateurs
- `transport_providers` - Fournisseurs transport (DHL, Planzer, etc.)
- `logistics_providers` - Fournisseurs logistique
- `logistics_rates` - Grille tarifaire logistique
- `customs_providers` - Fournisseurs douanes
- `customs_fees` - Frais de douane

### API Validation
- `supplier_registry` - Registre des fournisseurs
- `supplier_api_keys` - Clés API (hashées SHA256)
- `odeal_business_rules` - Règles métier (marges, savings)
- `odeal_customs_duty_rates` - Taux de douane par catégorie
- `offer_metadata` - Métadonnées des offres
- `offer_item_calculated_costs` - Coûts calculés
- `offer_financial_projections` - Projections financières

### Autres
- `currency_rates` - Taux de change (rafraîchis quotidiennement)
- `tetris_scores` - Scores du jeu Tetris

## 🔧 Configuration

### Variables d'Environnement (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic (pour TAR calculator intégré)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### Fichiers de Configuration

- `next.config.js` - Config Next.js avec output standalone
- `tailwind.config.ts` - Config Tailwind CSS
- `tsconfig.json` - Config TypeScript (exclut supabase/functions)
- `middleware.ts` - Middleware auth pour protéger les routes

## 🚀 Commandes

```bash
# Installation
npm install

# Développement
npm run dev              # Port 3001

# Build
npm run build

# Start production
npm start

# Supabase local
supabase start
supabase db reset
supabase migration new <name>
supabase db push
```

## 📊 Migrations Supabase Importantes

### Calculateurs (23-24 Oct 2025)
- `20251023154916` - Schéma logistique
- `20251023170000` - Calculs palettes
- `20251024000000` - Orientation 3D pour palettes

### API Validation (25 Oct 2025)
- `20251025000001` - supplier_registry
- `20251025000002` - supplier_users
- `20251025000003` - odeal_business_rules
- `20251025000004` - odeal_customs_duty_rates
- `20251025000005` - extend_logistics_rates
- `20251025000006` - offer_metadata
- `20251025000007` - offer_item_calculated_costs
- `20251025000008` - offer_financial_projections
- `20251025000009` - offer_item_modifications_log
- `20251025000010` - validation_notifications
- `20251025000011` - basic_functions
- `20251025000012` - setup_rls_final
- `20251025000013` - validate_item_function (CRITICAL!)
- `20251025999999` - setup_production_test_data

## 🔐 Sécurité

### Row Level Security (RLS)

Toutes les tables ont RLS activé :
- Users ne voient que leurs propres données
- Super admins ont accès complet
- Policies spécifiques par rôle

### API Authentication

- **API Validation**: Header `X-API-Key` avec hash SHA256
- **Autres APIs**: Authentification Supabase Auth

## 🐛 Points d'Attention

### 1. Dockerfile
- **Ne PAS copier** `public/` (n'existe pas dans ce projet)
- Utiliser `output: 'standalone'` dans next.config.js
- Exclure `supabase/functions` du build TypeScript

### 2. Middleware
- Fichier `middleware.ts` protège toutes les routes sauf login
- Gère le SSO automatique si présent
- Redirect `/` vers `/dashboard`

### 3. API Validation
- Fonction PostgreSQL `validate_supplier_item_offer()`
- Calcule COGS = supplier_cost + transport + customs + logistics
- Marge = (price - COGS) / price * 100
- Deal status basé sur margin_percentage

### 4. Migrations
- **TOUJOURS** tester localement avec `supabase db reset` avant de push
- Les migrations sont appliquées en ordre alphabétique
- Ne jamais modifier une migration déjà déployée

## 📝 Pour Claude Code

### Workflow Recommandé

1. **Lire ce CLAUDE.md** pour comprendre l'architecture
2. **Vérifier les migrations** dans `supabase/migrations/`
3. **Tester localement** avec `npm run dev`
4. **Vérifier RLS** si vous modifiez les tables
5. **Déployer** avec `../../deployment/deploy-odl-tools.sh`

### Fichiers Critiques

- `app/api/validate-item/route.ts` - API validation (très utilisée)
- `supabase/migrations/20251025000013_create_validate_item_function.sql` - Fonction critique
- `middleware.ts` - Auth globale
- `app/api-docs/page.tsx` - Documentation (3000+ lignes, très longue!)

### Commandes Utiles

```bash
# Tester la fonction validate_item localement
supabase db reset
curl -X POST http://localhost:3001/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TEST_DEMO_123" \
  -d '{"supplier_id": 1, "item_name": "Test", "supplier_price_chf": 1000, "quantity": 10}'

# Voir les logs Supabase
supabase functions logs refresh-currency

# Push les migrations
supabase db push
```

## 🔗 Intégrations

- **WeWeb**: Formulaires utilisant `/api/validate-item`
- **N8N**: Workflows automatisés (à venir)
- **Traefik**: Reverse proxy avec SSL
- **Supabase**: Auth, Database, Edge Functions

## 📈 Performance

- **Output standalone**: Réduit la taille Docker
- **Cache Supabase**: Pour les taux de change et TAR
- **Edge Functions**: Refresh automatique des taux de change
- **RLS**: Isolation des données par utilisateur

## 🆘 Troubleshooting

### Build échoue avec erreur Supabase functions
→ Vérifier que `tsconfig.json` exclut `supabase/functions`

### Container échoue avec "public not found"
→ Retirer `COPY public/` du Dockerfile

### API validation retourne 401
→ Vérifier que la clé API est bien dans `supplier_api_keys` (hash SHA256)

### Migrations échouent
→ Vérifier l'ordre (alphabétique), tester avec `supabase db reset`

# 🔐 ODL-TOOLS - DOCUMENTATION MASTER COMPLÈTE
**Date**: 2025-10-24 22:55:49
**Version**: 1.0.0
**Statut**: PRODUCTION ACTIVE

> ⚠️ **DOCUMENT CRITIQUE**: Ce document contient TOUTES les informations nécessaires pour reconstruire l'application ODL-TOOLS à l'identique from scratch. Gardez-le en sécurité.

---

## 📋 TABLE DES MATIÈRES

1. [Credentials & Accès](#1-credentials--accès)
2. [Infrastructure Serveur](#2-infrastructure-serveur)
3. [Base de Données Supabase](#3-base-de-données-supabase)
4. [Application Principale](#4-application-principale-appodl-toolsch)
5. [TAR Calculator](#5-tar-calculator-tarodl-toolsch)
6. [Notes de Frais](#6-notes-de-frais-ndfodl-toolsch)
7. [Transport Calculator](#7-transport-calculator-nouveau)
8. [Customs Calculator](#8-customs-calculator-nouveau)
9. [Déploiement](#9-déploiement)
10. [Maintenance](#10-maintenance)

---

## 1. CREDENTIALS & ACCÈS

### 🔑 Serveur SSH
```bash
Host: 31.97.193.159
User: root
SSH Key: ~/.ssh/claude_temp_key
Command: ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
```

### 🗄️ Supabase (Production)
```bash
Project ID: xewnzetqvrovqjcvwkus
URL: https://xewnzetqvrovqjcvwkus.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Dashboard: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus
```

### 🤖 Anthropic API
```bash
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 🌐 Domaines en Production
```
app.odl-tools.ch        → Application principale (Next.js)
tar.odl-tools.ch        → TAR Calculator (Express)
ndf.odl-tools.ch        → Notes de Frais frontend (Nginx)
ndf-api.odl-tools.ch    → Notes de Frais API (Express)
```

### 👤 Compte Admin Supabase
```
Email: admin@admin.fr
Nom: Administrateur
Département: TOP MANAGEMENT
Poste: CEO
is_super_admin: true
```

---

## 2. INFRASTRUCTURE SERVEUR

### 📦 Conteneurs Docker Actifs (10)
```bash
odl-tools-app      → Next.js 15 (app.odl-tools.ch)
tar-calculator     → Express + Claude (tar.odl-tools.ch)
ndf                → Nginx statique (ndf.odl-tools.ch)
ndf-api            → Express + Vision (ndf-api.odl-tools.ch)
root_traefik_1     → Reverse proxy HTTPS
root_n8n_1         → Workflow automation
root_odl-tools_1   → Socat proxy
root_tar-web_1     → Nginx TAR
root_tar-api_1     → Socat TAR
tmp_test-http_1    → Socat test
```

### 🐳 Docker Compose (/root/docker-compose.odl.yml)
```yaml
version: '3.8'

services:
  odl-tools-app:
    build:
      context: /opt/odl-tools
      dockerfile: Dockerfile
      args:
          NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
          NEXT_PUBLIC_SITE_URL: https://app.odl-tools.ch
    container_name: odl-tools-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_SITE_URL=https://app.odl-tools.ch
    networks:
      - root_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.odl-tools.rule=Host(`app.odl-tools.ch`)"
      - "traefik.http.routers.odl-tools.entrypoints=websecure"
      - "traefik.http.routers.odl-tools.tls=true"
      - "traefik.http.routers.odl-tools.tls.certresolver=mytlschallenge"
      - "traefik.http.services.odl-tools.loadbalancer.server.port=3001"

  tar-calculator:
    build:
      context: /opt/tar-calculator
      dockerfile: Dockerfile
    container_name: tar-calculator
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=3000
    networks:
      - root_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tar.rule=Host(`tar.odl-tools.ch`)"
      - "traefik.http.routers.tar.entrypoints=websecure"
      - "traefik.http.routers.tar.tls=true"
      - "traefik.http.routers.tar.tls.certresolver=mytlschallenge"
      - "traefik.http.services.tar.loadbalancer.server.port=3000"

  ndf:
    build:
      context: /opt/note-de-frais
      dockerfile: Dockerfile
    container_name: ndf
    restart: unless-stopped
    networks:
      - root_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ndf.rule=Host(`ndf.odl-tools.ch`)"
      - "traefik.http.routers.ndf.entrypoints=websecure"
      - "traefik.http.routers.ndf.tls=true"
      - "traefik.http.routers.ndf.tls.certresolver=mytlschallenge"
      - "traefik.http.services.ndf.loadbalancer.server.port=80"

  ndf-api:
    build:
      context: /opt/note-de-frais
      dockerfile: Dockerfile.api
    container_name: ndf-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3002
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    networks:
      - root_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ndf-api.rule=Host(`ndf-api.odl-tools.ch`)"
      - "traefik.http.routers.ndf-api.entrypoints=websecure"
      - "traefik.http.routers.ndf-api.tls=true"
      - "traefik.http.routers.ndf-api.tls.certresolver=mytlschallenge"
      - "traefik.http.services.ndf-api.loadbalancer.server.port=3002"

networks:
  root_default:
    external: true
```

### 📁 Structure Serveur
```
/root/
  ├── docker-compose.odl.yml    # Config Docker Compose
  ├── .env.odl                  # Variables d'environnement
  └── docker-compose.yml        # Traefik + N8N (NE PAS TOUCHER)

/opt/
  ├── odl-tools/               # Application Next.js
  ├── tar-calculator/          # TAR Calculator
  └── note-de-frais/           # Notes de Frais
```

### 🔄 Commandes Déploiement
```bash
# Se connecter au serveur
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159

# Rebuild et redémarrer
cd /root
docker-compose -f docker-compose.odl.yml --env-file .env.odl build --no-cache odl-tools-app
docker stop odl-tools-app && docker rm odl-tools-app
docker-compose -f docker-compose.odl.yml --env-file .env.odl up -d odl-tools-app

# Logs
docker logs odl-tools-app --tail 50
```

---

## 3. BASE DE DONNÉES SUPABASE

### 📊 Schéma Complet (24 Tables)

#### Tables Core (17)
```sql
1. profiles                  -- Profils utilisateurs
2. applications             -- Demandes d'accès
3. factures                 -- Factures
4. departments              -- Départements
5. job_titles              -- Postes
6. api_usage_logs          -- Logs API
7. image_conversions       -- Conversions d'images
8. translations            -- Traductions
9. translation_requests    -- Demandes de traduction
10. game_scores            -- Scores Tetris
11. sso_configurations     -- Config SSO
12. user_sso_mapping       -- Mapping SSO
13. activity_logs          -- Logs activité
14. password_resets        -- Réinitialisation mot de passe
15. email_templates        -- Templates email
16. system_settings        -- Paramètres système
17. audit_logs             -- Audit trail
```

#### Tables Logistics (7)
```sql
1. customs_fees            -- Frais de douane
2. customs_providers       -- Fournisseurs douane
3. logistics_calculations  -- Calculs logistiques
4. logistics_providers     -- Fournisseurs logistiques
5. logistics_rates         -- Tarifs logistiques
6. pallet_formats          -- Formats de palettes
7. shipping_formats        -- Formats d'expédition
```

### 🔧 Fonctions SQL Principales (15+)

#### Logistics & Transport
```sql
1. calculate_transport_cost_with_optimization()
   - Calcul complet des coûts de transport
   - Optimisation palettes + cartons
   - Orientation 3D des produits
   - Retourne: costs, pallet_info, customer_optimization

2. calculate_pallet_requirements()
   - Calcul arrangement sur palettes
   - Test 3 orientations (L×W/H, L×H/W, W×H/L)
   - Compte la hauteur physique palette (15.2cm)
   - Retourne: products_per_layer, layers, orientation_used

3. calculate_customer_transport_optimization()
   - Optimisation pour le client final
   - Comparaison cartons vs palettes
   - Orientation 3D avec dimensions

4. calculate_logistics_cost()
   - Frais logistiques uniquement

5. calculate_customs_cost()
   - Frais de douane uniquement
```

### 📝 Migrations SQL (13 fichiers)

**Liste chronologique**:
```
1. 20251023154916_logistics_calculator_schema.sql
2. 20251023154917_logistics_seed_data.sql
3. 20251023160000_add_quantity_to_logistics.sql
4. 20251023161500_add_rls_logistics.sql
5. 20251023163000_split_transport_customs.sql
6. 20251023170000_add_pallet_calculations.sql
7. 20251023171000_fix_transport_with_pallets.sql
8. 20251023184000_remove_customer_optimization.sql
9. 20251023190000_create_customer_transport_optimization.sql
10. 20251023191000_update_planzer_weight_limit.sql
11. 20251024000000_add_orientation_to_pallet_calc.sql
12. 20251024000001_add_pallet_height.sql
13. 20251024000002_add_orientation_to_customer_optimization.sql
```

#### Migration Critique: Pallet Height (20251024000001)
```sql
-- Ajoute la hauteur physique de la palette
ALTER TABLE pallet_formats
ADD COLUMN IF NOT EXISTS pallet_height_cm NUMERIC DEFAULT 15.2;

-- Mise à jour Euro Palette
UPDATE pallet_formats
SET pallet_height_cm = 15.2
WHERE pallet_format_id = 'euro';

-- Dans calculate_pallet_requirements:
v_available_height := v_pallet_height - v_pallet_physical_height;
v_orientation_layers := FLOOR(v_available_height / p_product_height_cm);
```

### 🌱 Seed Data

#### Logistics Provider
```sql
INSERT INTO logistics_providers VALUES (
  'ohmex',
  'Ohmex Logistics',
  'Fournisseur principal de logistique',
  TRUE,
  10.0,  -- Marge 10%
  8.1    -- TVA 8.1%
);
```

#### Logistics Rates (13 tarifs)
```sql
-- Planzer Sans signature
('planzer', 'Planzer', 'Sans signature', '60x60x100 cm', 60, 60, 100, 30, 11.50)
('planzer', 'Planzer', 'Sans signature', '80x60x100 cm', 80, 60, 100, 30, 12.00)
('planzer', 'Planzer', 'Sans signature', '120x80x100 cm', 120, 80, 100, 30, 13.50)
-- ... etc

-- Planzer Avec signature
('planzer', 'Planzer', 'Avec signature', '60x60x100 cm', 60, 60, 100, 30, 12.50)
-- ... etc
```

#### Pallet Format
```sql
INSERT INTO pallet_formats VALUES (
  'euro',
  'Euro Palette',
  120, 80, 200,  -- L × W × H cm
  1000,          -- Max weight kg
  15.2,          -- Pallet physical height
  TRUE,
  NOW()
);
```

---

## 4. APPLICATION PRINCIPALE (app.odl-tools.ch)

### 🎯 Stack Technique
```json
{
  "framework": "Next.js 15.5.5",
  "language": "TypeScript 5.9.3",
  "ui": "React 19.2.0",
  "styling": "Tailwind CSS 3.4.1",
  "backend": "Supabase",
  "auth": "Supabase Auth + SSO Custom",
  "icons": "Lucide React"
}
```

### 📦 Dependencies Complètes
```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.75.0",
    "@types/node": "^24.7.2",
    "@types/react": "^19.2.2",
    "autoprefixer": "^10.4.21",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.446.0",
    "next": "^15.5.4",
    "postcss": "^8.5.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tailwind-merge": "^2.5.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.9.3"
  }
}
```

### 🏗️ Structure Projet
```
odl-tools/
├── app/
│   ├── layout.tsx                      # Layout principal
│   ├── page.tsx                        # Page d'accueil (redirect)
│   ├── globals.css                     # Styles globaux
│   ├── middleware.ts                   # SSO + Auth
│   │
│   ├── dashboard/page.tsx              # Dashboard principal
│   ├── login/page.tsx                  # Page login
│   ├── onboarding/                     # Onboarding utilisateurs
│   ├── admin/                          # Pages admin
│   │   ├── page.tsx                    # Console admin
│   │   ├── access-management/          # Gestion accès
│   │   └── profile-validation/         # Validation profils
│   │
│   ├── transport-calculator/           # 🆕 Calculateur transport
│   │   ├── page.tsx
│   │   └── admin/page.tsx
│   │
│   ├── customs-calculator/             # 🆕 Calculateur douane
│   │   ├── page.tsx
│   │   └── admin/page.tsx
│   │
│   ├── api/
│   │   ├── auth/                       # Auth endpoints
│   │   ├── admin/                      # Admin endpoints
│   │   ├── calculate-transport/        # 🆕 API Transport
│   │   ├── calculate-logistics/        # 🆕 API Logistics
│   │   └── calculate-customs/          # 🆕 API Customs
│   │
│   ├── tetris/                         # Jeu Tetris
│   ├── image-converter-test/           # Test conversion images
│   ├── translation-test/               # Test traduction
│   ├── api-docs/                       # Documentation API
│   └── setup-account/                  # Configuration compte
│
├── components/
│   ├── ui/
│   │   └── AppCard.tsx                 # Card pour dashboard
│   ├── PackingVisualization.tsx        # 🆕 Visualisation 3D
│   └── ...
│
├── lib/
│   ├── supabase-server.ts              # Client Supabase serveur
│   └── ...
│
├── supabase/
│   └── migrations/                     # 13 migrations SQL
│
├── Dockerfile                          # Multi-stage build
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.local                          # Dev env vars
```

### 🔐 Middleware SSO (middleware.ts)
```typescript
// Logique d'authentification complète
// - Vérifie session Supabase
// - Charge profil utilisateur
// - Vérifie statut (blocked, pending, approved)
// - Protège routes admin (super_admin uniquement)
// - Redirections automatiques
```

### 🎨 Dashboard (8 Outils)
```typescript
const apps = [
  {
    id: 'tar',
    title: 'TAR Calculator',
    url: 'https://tar.odl-tools.ch',
    gradient: 'from-blue-500 to-blue-700'
  },
  {
    id: 'transport',
    title: 'Calculateur Transport',
    url: '/transport-calculator',
    gradient: 'from-cyan-500 to-blue-700',
    badge: 'Nouveau'
  },
  {
    id: 'customs',
    title: 'Calculateur Douane',
    url: '/customs-calculator',
    gradient: 'from-purple-500 to-indigo-600',
    badge: 'Nouveau'
  },
  {
    id: 'ndf',
    title: 'Notes de Frais',
    url: 'https://ndf.odl-tools.ch',
    gradient: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'api-docs',
    title: 'API Documentation',
    url: '/api-docs',
    gradient: 'from-indigo-500 to-violet-700'
  },
  {
    id: 'image-converter',
    title: 'Image Converter Test',
    url: '/image-converter-test',
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    id: 'translation',
    title: 'Traduction Test',
    url: '/translation-test',
    gradient: 'from-orange-500 to-red-600'
  },
  {
    id: 'tetris',
    title: 'Tetris',
    url: '/tetris',
    gradient: 'from-pink-500 to-purple-600'
  }
]
```

---

## 5. TAR CALCULATOR (tar.odl-tools.ch)

### 🧮 Fonctionnalité
Calcul automatique des taxes de recyclage suisses pour les appareils électroniques.

### 🏗️ Stack
- **Backend**: Express.js + Claude API (Anthropic)
- **Frontend**: HTML/CSS/JS statique
- **Base de données**: Supabase

### 📍 Emplacement Serveur
```
/opt/tar-calculator/
```

### ⚙️ Logique
1. User entre type de produit + EAN + description
2. API utilise Claude pour identifier catégorie TAR
3. Retourne organisme (SWICO/SENS) + montant + catégorie

---

## 6. NOTES DE FRAIS (ndf.odl-tools.ch)

### 💼 Fonctionnalité
Gestion et validation des notes de frais avec OCR Claude Vision.

### 🏗️ Architecture
```
Frontend (ndf.odl-tools.ch)
  ├── Nginx statique
  └── Interface upload + validation

API (ndf-api.odl-tools.ch)
  ├── Express.js
  ├── Claude Vision API
  └── Extraction automatique données facture
```

### 📍 Emplacements Serveur
```
/opt/note-de-frais/
  ├── Dockerfile         # Frontend Nginx
  └── Dockerfile.api     # Backend Express
```

---

## 7. TRANSPORT CALCULATOR (Nouveau)

### 🚚 Fonctionnalité Complète
- Calcul coûts transport (Planzer)
- Optimisation palettes Euro (120×80×200cm)
- Visualisation 3D produits dans palettes
- Orientation automatique 3D (L×W/H, L×H/W, W×H/L)
- Calcul hauteur disponible (200cm - 15.2cm palette)

### 📊 API Endpoint
```typescript
POST /api/calculate-transport

Body: {
  length_cm: number,
  width_cm: number,
  height_cm: number,
  weight_kg: number,
  quantity: number,
  carrier?: string,        // 'planzer' ou null (auto)
  mode?: string,          // 'Sans signature' ou null (auto)
  provider_id?: string,   // 'ohmex' (default)
  pallet_format_id?: string  // 'euro' (default)
}

Response: {
  success: boolean,
  costs: {
    transport: {
      base: number,
      margin: number,
      tva: number,
      subtotal: number,
      per_unit: number,
      carrier: string,
      mode: string
    },
    total_per_unit: number,
    delivery_options: Array<{...}>
  },
  pallet_info: {
    pallet_format: {...},
    calculation: {
      products_per_layer: number,
      layers_per_pallet: number,
      products_per_pallet_final: number,
      pallets_needed: number,
      efficiency_percent: number,
      orientation_used: 1|2|3,
      product_base_length: number,
      product_base_width: number,
      product_stack_height: number
    }
  },
  customer_optimization: {...}
}
```

### 🎨 Composant PackingVisualization.tsx
```typescript
// Visualisation 3D des produits dans palette
// - Vue de dessus (1 couche)
// - Vue latérale (empilement)
// - Calcul automatique dimensions affichage
// - Swap dimensions selon orientation choisie
// - Scroll horizontal si palette trop large
// - Affichage espace vide

Props:
  containerLength: number
  containerWidth: number
  containerHeight: number
  productLength: number
  productWidth: number
  productHeight: number
  productsPerLayer: number
  layersPerContainer: number
  containerType: string
  productBaseLength?: number      // De SQL
  productBaseWidth?: number       // De SQL
  productStackHeight?: number     // De SQL
  orientationUsed?: 1|2|3        // De SQL
  availableHeight?: number        // 184.8cm pour Euro
  palletHeight?: number           // 15.2cm pour Euro
```

### 🔧 Logique Orientation
```typescript
// Option 1: L×W base, H stacked
perRow = floor(120 / productLength)
perCol = floor(80 / productWidth)
layers = floor(184.8 / productHeight)

// Option 2: L×H base, W stacked
perRow = floor(120 / productLength)
perCol = floor(80 / productHeight)
layers = floor(184.8 / productWidth)

// Option 3: W×H base, L stacked
perRow = floor(120 / productWidth)
perCol = floor(80 / productHeight)
layers = floor(184.8 / productLength)

// Choisir la meilleure capacité
best = max(option1.total, option2.total, option3.total)
```

---

## 8. CUSTOMS CALCULATOR (Nouveau)

### 🌍 Fonctionnalité
Calcul des frais de douane pour importations.

### 📊 API Endpoint
```typescript
POST /api/calculate-customs

Body: {
  value_chf: number,
  weight_kg: number,
  provider_id?: string
}

Response: {
  success: boolean,
  costs: {
    admin_fee: number,
    vat: number,
    total: number
  }
}
```

---

## 9. DÉPLOIEMENT

### 🔨 Build Local → Production

#### Étape 1: Transfer Files
```bash
# Fichiers modifiés
scp -i ~/.ssh/claude_temp_key \
  app/transport-calculator/page.tsx \
  root@31.97.193.159:/opt/odl-tools/app/transport-calculator/

scp -i ~/.ssh/claude_temp_key \
  components/PackingVisualization.tsx \
  root@31.97.193.159:/opt/odl-tools/components/
```

#### Étape 2: Build Docker
```bash
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159

cd /root
docker-compose -f docker-compose.odl.yml --env-file .env.odl build --no-cache odl-tools-app
```

#### Étape 3: Recreate Container
```bash
docker stop odl-tools-app
docker rm odl-tools-app
docker-compose -f docker-compose.odl.yml --env-file .env.odl up -d odl-tools-app
```

#### Étape 4: Verify
```bash
docker logs odl-tools-app --tail 50
curl -I https://app.odl-tools.ch/transport-calculator
```

### 📝 Dockerfile (Multi-Stage)
```dockerfile
FROM node:20-alpine AS base

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001

CMD ["node", "server.js"]
```

### 🗄️ Migrations Supabase
```bash
# Appliquer migration
supabase db push --db-url "postgresql://postgres.xewnzetqvrovqjcvwkus:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Ordre d'application (IMPORTANT):
1. 20251023154916_logistics_calculator_schema.sql
2. 20251023154917_logistics_seed_data.sql
3. ... (dans l'ordre chronologique)
13. 20251024000002_add_orientation_to_customer_optimization.sql
```

---

## 10. MAINTENANCE

### 🔍 Logs
```bash
# Application logs
docker logs odl-tools-app --tail 100 --follow

# Traefik logs
docker logs root_traefik_1 --tail 50

# Tous les conteneurs
docker ps -a
```

### 🔄 Restart Services
```bash
# Restart app
docker restart odl-tools-app

# Restart all ODL services
cd /root
docker-compose -f docker-compose.odl.yml restart
```

### 💾 Backup
```bash
# Backup application
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
tar czf odl-tools-backup-$(date +%Y%m%d).tar.gz /opt/odl-tools

# Backup database (via Supabase Dashboard)
# https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus/settings/general
```

### 🚨 Troubleshooting

#### App ne démarre pas
```bash
# Vérifier logs
docker logs odl-tools-app

# Vérifier variables env
docker exec odl-tools-app env | grep SUPABASE

# Rebuild complet
docker-compose -f docker-compose.odl.yml --env-file .env.odl build --no-cache odl-tools-app
```

#### 404 sur nouvelle route
```bash
# Vérifier que fichiers sont sur serveur
ls /opt/odl-tools/app/transport-calculator/

# Vérifier dans conteneur
docker exec odl-tools-app ls .next/server/app/transport-calculator/

# Si absent: rebuild nécessaire
```

#### Cache Next.js
```bash
# Sur serveur, supprimer cache
docker exec odl-tools-app rm -rf .next/cache

# Rebuild
docker restart odl-tools-app
```

---

## 📚 FICHIERS DE RÉFÉRENCE

### Configuration Files
- `package.json` - Dependencies exactes
- `next.config.js` - Config Next.js
- `tailwind.config.ts` - Config Tailwind
- `middleware.ts` - Auth & SSO logic
- `Dockerfile` - Multi-stage build
- `docker-compose.odl.yml` - Orchestration

### Documentation Existante
- `ARCHITECTURE-SSO.md` - Architecture SSO
- `DEPLOYMENT-GUIDE.md` - Guide déploiement
- `DESIGN-SYSTEM.md` - Design system
- `PROJECT-STRUCTURE.md` - Structure projet
- `SERVER-ANALYSIS.md` - Analyse serveur

---

## ✅ CHECKLIST RECONSTRUCTION

Pour reconstruire ODL-TOOLS from scratch:

### 1. Serveur & Infrastructure
- [ ] Provisionner serveur Ubuntu
- [ ] Installer Docker + Docker Compose
- [ ] Configurer Traefik reverse proxy
- [ ] Configurer domaines DNS (app.odl-tools.ch, etc.)
- [ ] Générer certificats SSL (Let's Encrypt)

### 2. Supabase
- [ ] Créer projet Supabase
- [ ] Appliquer 13 migrations dans l'ordre
- [ ] Insérer seed data (providers, rates, pallet formats)
- [ ] Créer compte admin (admin@admin.fr)
- [ ] Copier ANON_KEY + SERVICE_ROLE_KEY

### 3. Application Next.js
- [ ] Cloner structure projet
- [ ] `npm install` dependencies
- [ ] Créer .env.local avec credentials
- [ ] Développer/copier toutes les pages
- [ ] Développer/copier tous les composants
- [ ] Tester en local (PORT=3003)

### 4. APIs
- [ ] Implémenter /api/calculate-transport
- [ ] Implémenter /api/calculate-logistics
- [ ] Implémenter /api/calculate-customs
- [ ] Tester endpoints

### 5. Déploiement
- [ ] Créer Dockerfile
- [ ] Créer docker-compose.odl.yml
- [ ] Créer .env.odl sur serveur
- [ ] Upload code vers /opt/odl-tools
- [ ] Build image Docker
- [ ] Lancer conteneur
- [ ] Vérifier HTTPS fonctionne

### 6. Services Additionnels
- [ ] Déployer TAR Calculator
- [ ] Déployer Notes de Frais
- [ ] Configurer N8N si nécessaire

---

## 🔒 SÉCURITÉ

### Secrets à NE JAMAIS COMMIT
- ❌ SUPABASE_SERVICE_ROLE_KEY
- ❌ ANTHROPIC_API_KEY
- ❌ SSH Private Key
- ❌ .env files

### Best Practices
- ✅ Variables d'environnement via Docker
- ✅ HTTPS partout (Traefik)
- ✅ RLS activé sur Supabase
- ✅ Middleware auth sur toutes routes protégées
- ✅ Validation input API

---

## 📞 SUPPORT

### En cas de problème

1. **Vérifier logs**: `docker logs odl-tools-app`
2. **Vérifier documentation**: Lire les .md existants
3. **Vérifier Supabase**: Dashboard Supabase pour DB
4. **Rebuild**: Souvent résout les problèmes de cache

### Contact
- **Serveur**: root@31.97.193.159
- **Supabase**: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus

---

**FIN DU DOCUMENT MASTER**

*Ce document contient TOUTES les informations nécessaires pour reconstruire ODL-TOOLS à l'identique.*

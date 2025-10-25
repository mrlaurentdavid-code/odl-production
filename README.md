# O!Deal Tools - Production Repository

Repository complet contenant TOUTES les applications O!Deal Tools en production sur le serveur Hostinger VPS (31.97.193.159).

## 🏗️ Architecture Globale

Ce monorepo contient l'ensemble de l'infrastructure O!Deal Tools, comprenant 4 applications principales et leur configuration de déploiement.

### Serveur de Production
- **Hébergeur**: Hostinger VPS
- **IP**: 31.97.193.159
- **Hostname**: srv907289.hstgr.cloud
- **OS**: Ubuntu 24.04.3 LTS
- **Reverse Proxy**: Traefik avec SSL automatique (Let's Encrypt)

## 📁 Structure du Repository

```
odl-production/
├── applications/          # Toutes les applications ODL
│   ├── odl-tools/        # Dashboard principal + API Validation
│   ├── api-validation/   # API Validation O!Deal (copie dédiée)
│   ├── tar-calculator/   # Calculateur TAR (Express + Anthropic)
│   └── note-de-frais/    # Notes de frais (HTML + Claude Vision API)
├── deployment/           # Configuration Docker & déploiement
│   ├── docker-compose.odl.yml
│   ├── deploy-odl-tools.sh
│   ├── deploy-api-validation.sh
│   ├── deploy-tar.sh
│   └── README.md
└── README.md            # Ce fichier
```

## 🚀 Applications Déployées

### 1. ODL Tools Dashboard (Next.js 15)
**URL**: https://app.odl-tools.ch
**Port**: 3001
**Technologies**: Next.js 15.5.5, Supabase, TypeScript

**Fonctionnalités**:
- Dashboard central avec SSO
- Calculateur de transport avec optimisation palettes
- Calculateur de logistique
- Calculateur de douanes
- API de validation O!Deal
- Documentation API intégrée
- Système de gestion d'accès (RLS Supabase)
- Mini-jeu Tetris

### 2. API Validation O!Deal
**URL**: https://api.odl-tools.ch
**Port**: 3003
**Technologies**: Next.js 15 API Routes, Supabase PostgreSQL

**Fonctionnalités**:
- Validation automatique des offres fournisseurs
- Calcul COGS, marges, savings
- Classification des deals (top/good/almost/bad)
- Authentification par API Key (SHA256)
- Rate limiting et quotas
- Intégration WeWeb + N8N

**Endpoint**: `POST /api/validate-item`

### 3. TAR Calculator
**URL**: https://tar.odl-tools.ch
**Port**: 3000
**Technologies**: Express.js, Anthropic Claude AI, Supabase Cache

**Fonctionnalités**:
- Calcul automatique des taxes de recyclage (TAR)
- Deux endpoints:
  - `/api/calculate-tar-v2` - Recherche libre avec IA
  - `/api/calculate-tar-odeal` - Formulaire structuré
- Cache Supabase pour performances optimales
- Extraction automatique des spécifications produits

### 4. Notes de Frais (NDF)
**URL Web**: https://ndf.odl-tools.ch
**URL API**: https://ndf-api.odl-tools.ch
**Port Web**: 80 (Nginx statique)
**Port API**: 3002

**Fonctionnalités**:
- Interface HTML statique pour saisie notes de frais
- API Claude Vision pour extraction de données depuis photos
- Intégration Supabase pour stockage

## 🔐 Base de Données Supabase

**Projet**: xewnzetqvrovqjcvwkus
**URL**: https://xewnzetqvrovqjcvwkus.supabase.co

### Schémas et Migrations
Toutes les migrations sont versionnées et disponibles dans:
- `applications/odl-tools/supabase/migrations/`
- `applications/api-validation/supabase/migrations/`

**16 migrations** créées pour l'API Validation (voir détails dans les fichiers)

### Tables Principales
- `user_profiles` - Profils utilisateurs avec RLS
- `transport_providers` - Fournisseurs de transport
- `customs_providers` - Fournisseurs douaniers
- `logistics_providers` - Fournisseurs logistiques
- `supplier_registry` - Registre fournisseurs O!Deal
- `supplier_api_keys` - Clés API (hashed SHA256)
- `offer_metadata` - Métadonnées des offres
- `offer_item_calculated_costs` - Coûts calculés
- `odeal_business_rules` - Règles métier

## 🐳 Déploiement Docker

### Architecture Docker Compose
Tous les services sont orchestrés via `docker-compose.odl.yml` avec Traefik comme reverse proxy.

### Réseau
Tous les containers sont sur le réseau externe `root_default` partagé avec Traefik.

### SSL/TLS
Traefik génère automatiquement les certificats SSL via Let's Encrypt pour tous les domaines `*.odl-tools.ch`.

## 📝 Scripts de Déploiement

Tous les scripts sont dans `deployment/`:

```bash
# Déployer le dashboard ODL Tools
./deploy-odl-tools.sh

# Déployer l'API Validation
./deploy-api-validation.sh

# Déployer le calculateur TAR
./deploy-tar.sh

# Déployer les notes de frais
./deploy-ndf.sh
```

Chaque script effectue:
1. Synchronisation des fichiers via rsync (exclusion node_modules, .next, .git)
2. Rebuild de l'image Docker sur le serveur
3. Recréation du container avec `--force-recreate`
4. Vérification du statut

## 🔑 Variables d'Environnement

Les variables sont stockées dans `/root/.env.odl` sur le serveur:

```bash
# Supabase
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**⚠️ IMPORTANT**: Ne jamais committer les vraies clés API dans Git !

## 🚀 Déploiement Initial

### Prérequis
- Accès SSH au serveur (clé: `~/.ssh/claude_temp_key`)
- Docker et Docker Compose installés sur le serveur
- Traefik configuré et en cours d'exécution

### Déploiement Complet

```bash
# 1. Cloner ce repository
git clone https://github.com/votre-username/odl-production.git
cd odl-production

# 2. Configurer les variables d'environnement sur le serveur
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
nano /root/.env.odl
# Ajouter les clés API

# 3. Déployer chaque application
cd deployment
./deploy-odl-tools.sh
./deploy-api-validation.sh
./deploy-tar.sh
./deploy-ndf.sh

# 4. Vérifier le statut
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml ps
```

## 📊 Monitoring

### Vérifier les Logs

```bash
# Logs d'une application spécifique
docker-compose -f /root/docker-compose.odl.yml logs -f odl-tools-app

# Logs de toutes les applications
docker-compose -f /root/docker-compose.odl.yml logs -f
```

### Vérifier le Statut des Containers

```bash
docker-compose -f /root/docker-compose.odl.yml ps
```

### Redémarrer un Service

```bash
docker-compose -f /root/docker-compose.odl.yml restart odl-tools-app
```

## 🧪 Tests

### Tester les APIs

```bash
# API Validation (GET documentation)
curl https://api.odl-tools.ch/api/validate-item

# API Validation (POST validation)
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TEST_DEMO_123" \
  -d '{
    "supplier_id": 1,
    "item_name": "Laptop Dell XPS 15",
    "supplier_price_chf": 1200.00,
    "quantity": 10
  }'

# TAR Calculator
curl -X POST https://tar.odl-tools.ch/api/calculate-tar-odeal \
  -H "Content-Type: application/json" \
  -d '{
    "ean": "5099206071131",
    "description": "Clavier Logitech K270"
  }'
```

## 📚 Documentation

### Documentation Technique
- Chaque application a son propre README dans `applications/[app]/`
- Documentation API disponible sur https://app.odl-tools.ch/api-docs

### Guides de Déploiement
- `deployment/README.md` - Guide détaillé du déploiement
- Chaque script de déploiement contient des commentaires explicatifs

## 🔧 Développement Local

### ODL Tools Dashboard

```bash
cd applications/odl-tools
npm install
cp .env.local.example .env.local
# Éditer .env.local avec vos clés
npm run dev
# http://localhost:3001
```

### TAR Calculator

```bash
cd applications/tar-calculator
npm install
# Configurer .env avec ANTHROPIC_API_KEY et SUPABASE_*
node server.js
# http://localhost:3000
```

### API Validation

```bash
cd applications/api-validation
npm install
cp .env.local.example .env.local
npm run dev
# http://localhost:3003
```

## 🤝 Contribution

1. Créer une branche feature
2. Développer et tester localement
3. Commit avec message descriptif
4. Push et créer une Pull Request
5. Après review, déployer sur le serveur

## 📞 Support

Pour toute question ou problème:
- Vérifier les logs des containers
- Consulter la documentation dans `applications/[app]/`
- Vérifier le statut Supabase: https://status.supabase.com

## 🏷️ Versions

- **Next.js**: 15.5.5
- **Node.js**: 20 Alpine
- **Supabase**: Latest
- **Anthropic Claude**: claude-3-5-sonnet-20241022
- **Docker Compose**: 1.29.2

## 📅 Historique

- **2025-10-25**: Ajout API Validation O!Deal avec 16 migrations
- **2025-10-24**: Ajout calculateurs logistique/transport/douanes
- **2025-10-23**: Mise en place TAR Calculator avec cache Supabase
- **2025-10-21**: Déploiement Notes de Frais
- **2025-10-13**: Déploiement initial ODL Tools Dashboard

## 📄 Licence

Propriétaire - O!Deal - Tous droits réservés

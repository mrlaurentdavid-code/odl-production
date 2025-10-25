# CLAUDE.md - ODL Production Repository

## 📌 Vue d'ensemble

Ce repository contient **l'intégralité de l'infrastructure O!Deal Tools** en production sur le serveur Hostinger VPS.

**Serveur**: 31.97.193.159 (srv907289.hstgr.cloud)
**OS**: Ubuntu 24.04.3 LTS
**Reverse Proxy**: Traefik avec SSL automatique

## 🏗️ Architecture

Ce monorepo utilise une architecture multi-applications avec orchestration Docker :

```
odl-production/
├── applications/     # 4 applications Next.js/Express déployées
├── deployment/       # Configuration Docker Compose + scripts de déploiement
└── scripts/          # Scripts utilitaires (vide pour l'instant)
```

## 🚀 Applications Déployées

| Application | URL | Port | Technologie |
|------------|-----|------|------------|
| ODL Tools Dashboard | https://app.odl-tools.ch | 3001 | Next.js 15 |
| API Validation | https://api.odl-tools.ch | 3003 | Next.js 15 API Routes |
| TAR Calculator | https://tar.odl-tools.ch | 3000 | Express + Anthropic |
| Notes de Frais | https://ndf.odl-tools.ch | 80/3002 | HTML + Express API |

## 🗄️ Base de Données

**Supabase PostgreSQL**
- Projet: xewnzetqvrovqjcvwkus
- URL: https://xewnzetqvrovqjcvwkus.supabase.co
- Migrations versionnées dans `applications/*/supabase/migrations/`

## 🐳 Déploiement Docker

Toutes les applications sont orchestrées via Docker Compose :
- Fichier principal: `deployment/docker-compose.odl.yml`
- Variables d'environnement: `/root/.env.odl` sur le serveur
- Réseau partagé: `root_default` (avec Traefik)

### Scripts de déploiement disponibles :
```bash
./deployment/deploy-odl-tools.sh         # Dashboard principal
./deployment/deploy-api-validation.sh    # API Validation
./deployment/deploy-tar-calculator.sh    # TAR Calculator
./deployment/deploy-note-de-frais.sh     # Notes de frais
./deployment/deploy-all.sh               # Tout déployer
```

## 🔑 Secrets & Variables

**⚠️ IMPORTANT**: Les vraies clés API ne sont **JAMAIS** committées dans Git.

Fichiers avec placeholders (à renseigner sur le serveur):
- `deployment/.env.odl.example` - Template des variables d'environnement
- Les vraies clés sont dans `/root/.env.odl` sur le serveur uniquement

## 📚 Structure des Dossiers

Chaque sous-dossier contient son propre `CLAUDE.md` avec des informations détaillées :

- **.claude/** - Workflow et continuité des sessions Claude Code
  - `WORKFLOW.md` - Règles du workflow "GIT AND CLAUDE"
  - `QUICK_START.md` - À lire en premier à chaque session
  - `SESSION_HISTORY.md` - Historique chronologique des sessions

- **applications/** - Applications complètes avec leur code source
  - `odl-tools/` - Dashboard principal avec SSO et calculateurs
  - `api-validation/` - API de validation des offres fournisseurs
  - `tar-calculator/` - Calculateur de taxes de recyclage
  - `note-de-frais/` - Application de notes de frais

- **deployment/** - Configuration d'infrastructure
  - Docker Compose files
  - Scripts de déploiement
  - Documentation de déploiement

## 🚦 Quick Start

### 1. Cloner le repository
```bash
git clone https://github.com/mrlaurentdavid-code/odl-production.git
cd odl-production
```

### 2. Développement local
Chaque application a son propre README avec instructions :
```bash
cd applications/odl-tools
npm install
cp .env.local.example .env.local
# Éditer .env.local avec vos clés
npm run dev
```

### 3. Déploiement en production
```bash
cd deployment
# Éditer le script si nécessaire
./deploy-odl-tools.sh
```

## 🔧 Maintenance

### Vérifier les logs
```bash
ssh root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml logs -f [service-name]
```

### Redémarrer un service
```bash
ssh root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml restart [service-name]
```

### Voir le statut
```bash
ssh root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml ps
```

## 📝 Documentation

- **README.md** - Documentation générale du projet
- **CLAUDE.md** (ce fichier) - Guide pour Claude Code et reprise de projet
- Chaque dossier a son propre CLAUDE.md avec détails spécifiques

## 🔗 Liens Utiles

- GitHub: https://github.com/mrlaurentdavid-code/odl-production
- Supabase Dashboard: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus
- Documentation API: https://app.odl-tools.ch/api-docs

## 📅 Historique

- **2025-10-25**: Création du repository complet
- **2025-10-25**: Ajout API Validation O!Deal (16 migrations)
- **2025-10-24**: Ajout calculateurs logistique/transport/douanes
- **2025-10-23**: Mise en place TAR Calculator
- **2025-10-21**: Déploiement Notes de Frais
- **2025-10-13**: Déploiement initial ODL Tools Dashboard

## 🤝 Pour Claude Code

Ce fichier et ceux dans les sous-dossiers sont spécifiquement créés pour faciliter la reprise de projet par Claude Code ou d'autres développeurs.

**Principe**: Chaque `CLAUDE.md` documente :
- Le but du dossier
- La structure des fichiers
- Les points d'attention
- Les commandes utiles
- Les dépendances importantes

**Workflow recommandé pour Claude Code**:
1. **Démarrer une session**: Lire `.claude/QUICK_START.md` en premier
2. Lire ce CLAUDE.md pour comprendre l'architecture globale
3. Lire le CLAUDE.md du dossier spécifique où vous travaillez
4. Consulter le README.md pour les détails techniques
5. Vérifier les migrations Supabase avant toute modification de schéma
6. **Terminer une session**: Utiliser la commande "GIT AND CLAUDE"

### 💾 Commande "GIT AND CLAUDE"

Quand l'utilisateur dit **"GIT AND CLAUDE"**, exécuter le workflow complet :
- Mettre à jour tous les CLAUDE.md modifiés avec section "Recent Changes"
- Mettre à jour SESSION_HISTORY.md et QUICK_START.md
- Commit et push vers GitHub
- Générer un résumé de session

**Voir `.claude/WORKFLOW.md` pour les détails complets du workflow.**

## 📅 Recent Changes

- 2025-10-25 17:00: Création du système de workflow "GIT AND CLAUDE" (.claude/ folder)
- 2025-10-25 16:30: Ajout du guide d'intégration WeWeb complet (WEWEB_INTEGRATION_GUIDE.md)
- 2025-10-25 15:30: Création de 8 fichiers CLAUDE.md pour documentation complète
- 2025-10-25 14:30: Création du repository GitHub avec tout le code de production
- 2025-10-25 14:00: Ajout de la documentation API Validation au dashboard

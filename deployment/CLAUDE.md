# CLAUDE.md - Deployment

## 📌 Qu'est-ce que ce dossier ?

Ce dossier contient **toute la configuration d'infrastructure** pour déployer les applications O!Deal Tools sur le serveur Hostinger VPS.

**Serveur**: 31.97.193.159 (srv907289.hstgr.cloud)
**OS**: Ubuntu 24.04.3 LTS
**Orchestration**: Docker Compose
**Reverse Proxy**: Traefik (externe, géré séparément)

## 🗂️ Contenu du Dossier

```
deployment/
├── docker-compose.odl.yml      # Config Docker Compose principale
├── docker-compose.yml          # Ancien fichier (backup)
├── .env.odl.example           # Template variables d'environnement
│
├── deploy-all.sh              # Déployer TOUTES les apps
├── deploy-odl-tools.sh        # Déployer ODL Tools Dashboard
├── deploy-api-validation.sh   # Déployer API Validation
├── deploy-tar-calculator.sh   # Déployer TAR Calculator
├── deploy-note-de-frais.sh    # Déployer Notes de Frais
│
└── README.md                  # Documentation de déploiement
```

## 🐳 Docker Compose

### Fichier Principal: docker-compose.odl.yml

Ce fichier définit **tous les services** O!Deal Tools:

```yaml
version: '3.8'

services:
  odl-tools-app:        # Dashboard Next.js (app.odl-tools.ch:3001)
  api-validation:       # API Validation (api.odl-tools.ch:3003)
  tar-calculator:       # TAR Calculator (tar.odl-tools.ch:3000)
  ndf:                  # Notes de Frais Web (ndf.odl-tools.ch:80)
  ndf-api:              # Notes de Frais API (ndf-api.odl-tools.ch:3002)

networks:
  root_default:
    external: true      # Réseau partagé avec Traefik
```

### Structure d'un Service

```yaml
odl-tools-app:
  build:
    context: /opt/odl-tools          # Chemin sur le serveur
    dockerfile: Dockerfile
    args:
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
  container_name: odl-tools-app
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
  networks:
    - root_default
  labels:
    # Traefik labels pour routing
    - "traefik.enable=true"
    - "traefik.http.routers.odl-tools.rule=Host(`app.odl-tools.ch`)"
    - "traefik.http.routers.odl-tools.entrypoints=websecure"
    - "traefik.http.routers.odl-tools.tls=true"
    - "traefik.http.routers.odl-tools.tls.certresolver=mytlschallenge"
    - "traefik.http.services.odl-tools.loadbalancer.server.port=3001"
```

## 🔑 Variables d'Environnement

### Fichier: /root/.env.odl (sur le serveur)

**⚠️ IMPORTANT**: Ce fichier contient les **vraies clés API** et n'est **JAMAIS** commité dans Git.

```bash
# Supabase
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Node
NODE_ENV=production
```

### Template: .env.odl.example

Ce fichier dans le repo contient la **structure** sans les vraies valeurs.

## 📜 Scripts de Déploiement

### deploy-all.sh

Déploie **toutes** les applications en une seule commande.

```bash
#!/bin/bash
./deploy-odl-tools.sh
./deploy-api-validation.sh
./deploy-tar-calculator.sh
./deploy-note-de-frais.sh
```

### deploy-odl-tools.sh (exemple)

**Processus**:
1. Rsync les fichiers locaux vers `/opt/odl-tools` sur le serveur
2. Rebuild l'image Docker
3. Recréer le container avec `--force-recreate`

```bash
#!/bin/bash
set -e

SERVER="root@31.97.193.159"
SSH_KEY="$HOME/.ssh/claude_temp_key"
LOCAL_PATH="/Users/laurentdavid/Desktop/odl-projects/odl-tools"
REMOTE_PATH="/opt/odl-tools"

# Step 1: Sync files
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

# Step 2: Rebuild and restart
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml build odl-tools-app
docker-compose -f docker-compose.odl.yml up -d --force-recreate odl-tools-app
EOF

echo "✅ ODL Tools deployed!"
```

### Exclusions Rsync Importantes

```bash
--exclude 'node_modules'    # Dépendances (rebuiltées sur serveur)
--exclude '.next'           # Build cache Next.js
--exclude '.git'            # Historique Git
--exclude '.env.local'      # Variables locales
--exclude '.vercel'         # Config Vercel
```

## 🌐 Traefik Routing

### Comment ça marche ?

Traefik lit les **labels Docker** pour créer automatiquement les routes:

```yaml
labels:
  - "traefik.enable=true"                                          # Activer Traefik
  - "traefik.http.routers.odl-tools.rule=Host(`app.odl-tools.ch`)" # Domaine
  - "traefik.http.routers.odl-tools.entrypoints=websecure"        # HTTPS
  - "traefik.http.routers.odl-tools.tls.certresolver=mytlschallenge" # SSL auto
  - "traefik.http.services.odl-tools.loadbalancer.server.port=3001" # Port container
```

### Certificats SSL

- **Let's Encrypt** automatique
- **Certificats renouvelés** automatiquement par Traefik
- Pas de configuration manuelle nécessaire

### Domaines Configurés

| Domaine | Service | Port | Container |
|---------|---------|------|-----------|
| app.odl-tools.ch | Dashboard | 3001 | odl-tools-app |
| api.odl-tools.ch | API Validation | 3003 | api-validation |
| tar.odl-tools.ch | TAR Calculator | 3000 | tar-calculator |
| ndf.odl-tools.ch | Notes de Frais | 80 | ndf |
| ndf-api.odl-tools.ch | NDF API | 3002 | ndf-api |

## 🚀 Workflow de Déploiement

### Déploiement Standard

```bash
# 1. Se placer dans le dossier deployment
cd /Users/laurentdavid/Desktop/odl-projects/odl-production/deployment

# 2. Exécuter le script de déploiement
./deploy-odl-tools.sh

# 3. Vérifier le déploiement
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 \
  "docker-compose -f /root/docker-compose.odl.yml ps"

# 4. Voir les logs
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159 \
  "docker-compose -f /root/docker-compose.odl.yml logs -f odl-tools-app"
```

### Déploiement d'Urgence (sans build)

```bash
# Redémarrer juste le container (pas de rebuild)
ssh root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml restart odl-tools-app
```

### Déploiement avec Rollback

```bash
# 1. Backup de l'ancien code
ssh root@31.97.193.159
cd /opt
tar czf odl-tools-backup-$(date +%Y%m%d_%H%M%S).tar.gz odl-tools/

# 2. Déployer la nouvelle version
./deploy-odl-tools.sh

# 3. Si problème, restore le backup
ssh root@31.97.193.159
cd /opt
tar xzf odl-tools-backup-20251025_190000.tar.gz
docker-compose -f /root/docker-compose.odl.yml restart odl-tools-app
```

## 🔧 Maintenance

### Voir tous les Containers

```bash
ssh root@31.97.193.159
docker-compose -f /root/docker-compose.odl.yml ps
```

### Redémarrer un Service

```bash
docker-compose -f /root/docker-compose.odl.yml restart odl-tools-app
```

### Voir les Logs

```bash
# Logs d'un service
docker-compose -f /root/docker-compose.odl.yml logs -f odl-tools-app

# Logs de tous les services
docker-compose -f /root/docker-compose.odl.yml logs -f

# 100 dernières lignes
docker-compose -f /root/docker-compose.odl.yml logs --tail=100 odl-tools-app
```

### Rebuild Sans Cache

```bash
docker-compose -f /root/docker-compose.odl.yml build --no-cache odl-tools-app
docker-compose -f /root/docker-compose.odl.yml up -d --force-recreate odl-tools-app
```

### Nettoyer les Images Non Utilisées

```bash
ssh root@31.97.193.159
docker system prune -a
```

## 📝 Pour Claude Code

### Points d'Attention

1. **Ne jamais committer** les vraies clés API
2. **Tester localement** avant de déployer
3. **Vérifier les logs** après chaque déploiement
4. **Créer un backup** avant modifications importantes
5. **Synchroniser** `.env.odl.example` si structure change

### Fichiers Critiques

- `docker-compose.odl.yml` - Configuration principale (NE PAS casser!)
- Scripts `deploy-*.sh` - Automatisation déploiement
- `.env.odl.example` - Template (mettre à jour si ajout de variables)

### Modifications du docker-compose.yml

**Avant de modifier**:
1. Faire un backup du fichier
2. Tester localement si possible
3. Vérifier la syntaxe YAML

**Après modification**:
1. Commit dans Git
2. Rsync vers le serveur
3. Tester le nouveau service

### SSH Key

Clé SSH stockée dans: `~/.ssh/claude_temp_key`

**Utilisation**:
```bash
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
```

## 🆘 Troubleshooting

### Container ne démarre pas

```bash
# 1. Voir les logs
docker-compose -f /root/docker-compose.odl.yml logs odl-tools-app

# 2. Vérifier les variables d'env
docker-compose -f /root/docker-compose.odl.yml exec odl-tools-app env

# 3. Inspecter le container
docker inspect odl-tools-app
```

### Erreur de build Docker

```bash
# Rebuild sans cache
docker-compose -f /root/docker-compose.odl.yml build --no-cache odl-tools-app

# Vérifier le Dockerfile
cat /opt/odl-tools/Dockerfile
```

### Traefik ne route pas correctement

```bash
# Vérifier les labels
docker inspect odl-tools-app | grep traefik

# Vérifier les logs Traefik
docker logs traefik
```

### Certificat SSL expiré

```bash
# Forcer renouvellement Traefik
docker restart traefik

# Vérifier certificats
docker exec traefik cat /acme.json
```

## 📊 Monitoring

### Vérifier l'État des Services

```bash
# Statut
docker-compose -f /root/docker-compose.odl.yml ps

# CPU/Memory
docker stats

# Uptime
docker-compose -f /root/docker-compose.odl.yml ps | grep Up
```

### Vérifier les URLs

```bash
# Test automatique
curl -I https://app.odl-tools.ch
curl -I https://api.odl-tools.ch
curl -I https://tar.odl-tools.ch
curl -I https://ndf.odl-tools.ch
```

## 🔗 Liens Utiles

- **Serveur**: ssh root@31.97.193.159
- **Traefik Dashboard**: https://traefik.odl-tools.ch (si configuré)
- **GitHub**: https://github.com/mrlaurentdavid-code/odl-production
- **Supabase**: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus

# Déploiement de l'API d'analyse de factures

## Fichiers créés

1. `server.js` - Serveur Express avec analyse Claude Vision
2. `package.json` - Dépendances Node.js
3. `Dockerfile.api` - Image Docker pour l'API
4. `docker-compose-api.yml` - Configuration Docker Compose

## Étapes de déploiement

### 1. Copier les fichiers sur le serveur

```bash
scp server.js root@31.97.193.159:/opt/note-de-frais/
scp package.json root@31.97.193.159:/opt/note-de-frais/
scp Dockerfile.api root@31.97.193.159:/opt/note-de-frais/
scp app.js root@31.97.193.159:/opt/note-de-frais/
```

### 2. Ajouter le service dans docker-compose.odl.yml

Sur le serveur, éditer `/root/docker-compose.odl.yml` et ajouter le service `ndf-api` (voir `docker-compose-api.yml` pour la configuration complète).

### 3. Construire et démarrer l'API

```bash
ssh root@31.97.193.159
cd /root
set -a && source /root/.env.odl && set +a
docker-compose -f docker-compose.odl.yml build ndf-api
docker-compose -f docker-compose.odl.yml up -d ndf-api
docker-compose -f docker-compose.odl.yml restart ndf
```

### 4. Vérifier les logs

```bash
docker logs ndf-api --tail 50
```

### 5. Tester l'API

```bash
curl https://ndf-api.odl-tools.ch/health
```

## DNS

Ajouter un enregistrement A pour `ndf-api.odl-tools.ch` pointant vers `31.97.193.159`.

## Variables d'environnement requises

- `ANTHROPIC_API_KEY` - Déjà configurée
- `SUPABASE_URL` - Déjà configurée
- `SUPABASE_SERVICE_ROLE_KEY` - Déjà configurée

Tout est déjà dans `/root/.env.odl`.

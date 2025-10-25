# 🚀 Guide de déploiement ODL Tools - Production

**Date:** 14 octobre 2025
**Serveur:** 31.97.193.159 (srv907289)
**Architecture:** Docker + Traefik

---

## 📋 Prérequis

### ✅ Vérifications avant déploiement

1. **Applications fonctionnelles en local:**
   - ODL Tools Dashboard: http://localhost:3001 ✅
   - TAR Calculator: http://localhost:3000 ✅
   - Notes de Frais: http://localhost:8081 ✅
   - SSO cookie fonctionne entre les apps ✅

2. **Configuration DNS:**
   - `app.odl-tools.ch` → 31.97.193.159
   - `tar.odl-tools.ch` → 31.97.193.159
   - `ndf.odl-tools.ch` → 31.97.193.159

3. **Variables d'environnement:**
   - `SUPABASE_URL` et clés
   - `ANTHROPIC_API_KEY`
   - `NODE_ENV=production`

---

## 🔍 Phase 1: Découverte de l'infrastructure existante

### Étape 1.1: Se connecter au serveur

```bash
ssh root@31.97.193.159
```

### Étape 1.2: Localiser la configuration Docker principale

```bash
# Chercher tous les docker-compose.yml
find /root /home -name "docker-compose.yml" -type f 2>/dev/null

# Alternative: chercher dans les répertoires courants
ls -la /root/docker-compose* 2>/dev/null
ls -la ~/docker-compose* 2>/dev/null
```

**Objectif:** Trouver où sont définis `root_traefik_1` et `root_n8n_1`.

### Étape 1.3: Inspecter la configuration Traefik

```bash
# Voir la commande de démarrage et les volumes
docker inspect root_traefik_1 --format='{{json .Config.Cmd}}' | jq
docker inspect root_traefik_1 --format='{{json .Mounts}}' | jq

# Voir les labels Traefik sur les conteneurs existants
docker inspect root_ndf-web_1 --format='{{json .Config.Labels}}' | jq
docker inspect root_tar-web_1 --format='{{json .Config.Labels}}' | jq
```

**Objectif:** Comprendre comment Traefik route actuellement vers NDF et TAR.

### Étape 1.4: Vérifier la configuration réseau

```bash
# Voir les conteneurs sur root_default
docker network inspect root_default --format='{{json .Containers}}' | jq
```

**Objectif:** Confirmer que N8N, TAR et NDF partagent bien le réseau `root_default`.

---

## 📦 Phase 2: Préparation des Dockerfiles

### Étape 2.1: Créer le Dockerfile pour ODL Tools Dashboard

Sur votre machine locale, créer `/Users/laurentdavid/Desktop/odl-projects/odl-tools/Dockerfile`:

```dockerfile
# Dockerfile pour ODL Tools Dashboard (Next.js 15)
FROM node:20-alpine AS base

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Étape 2.2: Ajouter la config Next.js standalone

Modifier `/Users/laurentdavid/Desktop/odl-projects/odl-tools/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← IMPORTANT pour Docker
  // ... rest of config
}

module.exports = nextConfig
```

### Étape 2.3: Créer le Dockerfile pour TAR Calculator

Sur votre machine locale, créer `/Users/laurentdavid/Desktop/odl-projects/tar-calculator/Dockerfile`:

```dockerfile
# Dockerfile pour TAR Calculator (Express + Anthropic)
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Variables d'environnement (overridées par docker-compose)
ENV NODE_ENV=production
ENV PORT=3000

# Démarrer le serveur
CMD ["npm", "start"]
```

### Étape 2.4: Préparer Notes de Frais (statique)

Créer `/Users/laurentdavid/Desktop/odl-projects/note-de-frais/Dockerfile`:

```dockerfile
# Dockerfile pour Notes de Frais (statique + Nginx)
FROM nginx:alpine

# Copier les fichiers statiques
COPY . /usr/share/nginx/html

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Créer `/Users/laurentdavid/Desktop/odl-projects/note-de-frais/nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Servir les fichiers statiques
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache pour les assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

---

## 🐳 Phase 3: Créer le docker-compose pour ODL

### Étape 3.1: Créer un docker-compose séparé

**IMPORTANT:** Ne PAS modifier le docker-compose existant qui gère N8N!

Créer un nouveau fichier `docker-compose.odl.yml` dans `/root/` sur le serveur:

```yaml
version: '3.8'

services:
  # ODL Tools Dashboard (Next.js)
  odl-tools-app:
    build:
      context: /opt/odl-tools
      dockerfile: Dockerfile
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
      - "traefik.http.routers.odl-tools.tls.certresolver=letsencrypt"
      - "traefik.http.services.odl-tools.loadbalancer.server.port=3001"

  # TAR Calculator (Express + Anthropic)
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
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=3000
    networks:
      - root_default
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tar.rule=Host(`tar.odl-tools.ch`)"
      - "traefik.http.routers.tar.entrypoints=websecure"
      - "traefik.http.routers.tar.tls=true"
      - "traefik.http.routers.tar.tls.certresolver=letsencrypt"
      - "traefik.http.services.tar.loadbalancer.server.port=3000"

  # Notes de Frais (Nginx statique)
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
      - "traefik.http.routers.ndf.tls.certresolver=letsencrypt"
      - "traefik.http.services.ndf.loadbalancer.server.port=80"

networks:
  root_default:
    external: true  # ← Utilise le réseau existant, ne le crée PAS!
```

### Étape 3.2: Créer le fichier .env sur le serveur

Créer `/root/.env.odl`:

```bash
NODE_ENV=production

# Supabase
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 🚀 Phase 4: Déploiement progressif

### Étape 4.1: Transférer les fichiers sur le serveur

```bash
# Depuis votre machine locale
cd /Users/laurentdavid/Desktop/odl-projects

# Transférer ODL Tools
scp -r odl-tools/* root@31.97.193.159:/opt/odl-tools/

# Transférer TAR Calculator
scp -r tar-calculator/* root@31.97.193.159:/opt/tar-calculator/

# Transférer Notes de Frais
scp -r note-de-frais/* root@31.97.193.159:/opt/note-de-frais/
```

### Étape 4.2: Vérifier que Traefik est bien configuré

```bash
# Sur le serveur
docker inspect root_traefik_1 --format='{{json .Config.Labels}}' | jq

# Vérifier qu'il y a un certificat resolver Let's Encrypt
docker logs root_traefik_1 --tail 50 | grep -i "certificate\|acme\|letsencrypt"
```

**Si Traefik n'a pas de certificat resolver configuré**, il faudra l'ajouter.

### Étape 4.3: Build des images Docker

```bash
# Sur le serveur
cd /root

# Build avec le nouveau docker-compose
docker-compose -f docker-compose.odl.yml build --no-cache
```

**Temps estimé:** 5-10 minutes

### Étape 4.4: Démarrer les nouveaux conteneurs

```bash
# Démarrer sans détacher pour voir les logs
docker-compose -f docker-compose.odl.yml up

# Si tout fonctionne, CTRL+C puis démarrer en arrière-plan:
docker-compose -f docker-compose.odl.yml up -d
```

### Étape 4.5: Vérifier les conteneurs

```bash
# Lister tous les conteneurs
docker ps

# Vérifier les logs
docker logs odl-tools-app --tail 50
docker logs tar-calculator --tail 50
docker logs ndf --tail 50
```

### Étape 4.6: Vérifier que Traefik route correctement

```bash
# Tester depuis le serveur
curl -I http://localhost:3001  # ODL Tools
curl -I http://localhost:3000  # TAR Calculator
curl -I http://localhost:80    # Notes de Frais

# Tester les routes Traefik
curl -H "Host: app.odl-tools.ch" http://localhost
curl -H "Host: tar.odl-tools.ch" http://localhost
curl -H "Host: ndf.odl-tools.ch" http://localhost
```

---

## 🔒 Phase 5: Configuration SSL

### Étape 5.1: Vérifier que Let's Encrypt fonctionne

```bash
# Voir les certificats Traefik
docker exec root_traefik_1 ls -la /letsencrypt/acme.json 2>/dev/null
```

**Si le fichier existe:** Traefik gère déjà SSL automatiquement ✅

**Si le fichier n'existe pas:** Il faut configurer Let's Encrypt dans Traefik.

### Étape 5.2: Tester HTTPS

Depuis votre navigateur:

- https://app.odl-tools.ch
- https://tar.odl-tools.ch
- https://ndf.odl-tools.ch

**Attendu:** Certificat valide Let's Encrypt

---

## ✅ Phase 6: Tests fonctionnels

### Test 1: Authentification SSO

1. Aller sur https://app.odl-tools.ch/login
2. Se connecter avec un compte Supabase
3. Vérifier que le cookie `odl-sso-token` est créé avec domaine `.odl-tools.ch`
4. Aller sur https://tar.odl-tools.ch
5. Vérifier que l'utilisateur est déjà authentifié (pas de redirection vers login)
6. Aller sur https://ndf.odl-tools.ch
7. Vérifier que l'utilisateur est déjà authentifié

### Test 2: Déconnexion

1. Sur https://app.odl-tools.ch, cliquer sur "Déconnexion"
2. Vérifier que le cookie `odl-sso-token` est supprimé
3. Aller sur https://tar.odl-tools.ch
4. Vérifier la redirection vers https://app.odl-tools.ch/login

### Test 3: Fonctionnalités métier

- **ODL Tools:** Tester la création d'utilisateur, navigation
- **TAR Calculator:** Tester un calcul TAR avec Anthropic
- **Notes de Frais:** Tester la création d'une note de frais

---

## 🚨 Troubleshooting

### Problème: Les conteneurs ne démarrent pas

```bash
# Voir les logs détaillés
docker-compose -f docker-compose.odl.yml logs

# Vérifier la config réseau
docker network inspect root_default
```

### Problème: Traefik ne route pas vers les nouveaux conteneurs

```bash
# Vérifier que Traefik voit les labels
docker exec root_traefik_1 cat /etc/traefik/traefik.yml

# Redémarrer Traefik
docker restart root_traefik_1
```

### Problème: SSL ne fonctionne pas

```bash
# Vérifier les logs Let's Encrypt
docker logs root_traefik_1 | grep -i "certificate\|acme"

# Forcer le renouvellement (si nécessaire)
docker exec root_traefik_1 rm /letsencrypt/acme.json
docker restart root_traefik_1
```

### Problème: Cookie SSO non partagé

**Cause:** Domain mal configuré

**Solution:**
- Vérifier que le cookie a `domain: .odl-tools.ch` (avec le point!)
- Vérifier dans DevTools → Application → Cookies

---

## 🔄 Rollback en cas de problème

Si les nouveaux conteneurs causent des problèmes:

```bash
# Arrêter les nouveaux conteneurs
docker-compose -f docker-compose.odl.yml down

# Vérifier que N8N fonctionne toujours
docker ps | grep n8n
curl http://localhost:5678  # Devrait être bloqué (normal, N8N est isolé)
```

Les anciens conteneurs (`root_ndf-web_1`, `root_tar-web_1`) restent intacts.

---

## 📊 Monitoring post-déploiement

### Vérifier les ressources

```bash
# CPU et mémoire
docker stats --no-stream

# Logs en temps réel
docker-compose -f docker-compose.odl.yml logs -f
```

### Vérifier la santé de N8N (critique!)

```bash
# N8N doit toujours être accessible
docker ps | grep n8n

# Logs N8N (vérifier qu'il n'y a pas d'erreurs)
docker logs root_n8n_1 --tail 50
```

---

## 📝 Checklist finale

- [ ] DNS configuré (app.odl-tools.ch, tar.odl-tools.ch, ndf.odl-tools.ch)
- [ ] Dockerfiles créés et testés
- [ ] docker-compose.odl.yml créé
- [ ] Variables d'environnement configurées
- [ ] Images Docker buildées
- [ ] Conteneurs démarrés
- [ ] Traefik route correctement
- [ ] SSL fonctionne
- [ ] SSO fonctionne entre les 3 apps
- [ ] N8N fonctionne toujours (non impacté)
- [ ] Tests fonctionnels passent

---

## 🎯 Résultat attendu

Une fois le déploiement terminé:

- ✅ https://app.odl-tools.ch → ODL Tools Dashboard
- ✅ https://tar.odl-tools.ch → TAR Calculator
- ✅ https://ndf.odl-tools.ch → Notes de Frais
- ✅ SSO fonctionne (une seule connexion pour tout)
- ✅ SSL actif (Let's Encrypt)
- ✅ N8N fonctionne toujours normalement

---

**Créé le:** 14 octobre 2025
**Dernière mise à jour:** 14 octobre 2025

# 🏗️ Architecture ODL Tools - SSO & Déploiement

**Date de création:** 13 octobre 2025
**Version:** 1.0
**Auteur:** Claude (Anthropic)

---

## 📋 Vue d'ensemble

ODL Tools est un portail centralisé donnant accès à plusieurs applications internes via un système d'authentification unique (SSO).

### Applications actuelles

```
odl-tools.ch (domaine principal)
├── app.odl-tools.ch → ODL Tools Dashboard (Next.js 15)
├── tar.odl-tools.ch → TAR Calculator (Node.js + Express + Anthropic)
└── ndf.odl-tools.ch → Notes de Frais (HTML/CSS/JS vanilla)
```

---

## 🔐 Configuration Supabase (SSO Central)

### Projet Supabase centralisé
- **URL:** `https://xewnzetqvrovqjcvwkus.supabase.co`
- **Région:** AWS Europe West 1
- **Toutes les 3 apps** utilisent ce même projet ✅

### Clés d'API

```bash
# Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.

# Service Role (PRIVATE - server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.
```

---

## 🎯 Stack technique par application

### 1. ODL Tools Dashboard (`app.odl-tools.ch`)

**Technologies:**
- Next.js 15.5.4 (App Router)
- React 19.2.0
- TypeScript 5.9.3
- Tailwind CSS 3.4.1
- Supabase Auth (SSR)

**Authentification:**
- Supabase Auth avec cookies sécurisés
- Middleware pour protéger les routes
- Session management côté serveur

**Port local:** 3001

---

### 2. TAR Calculator (`tar.odl-tools.ch`)

**Technologies:**
- Node.js 18+
- Express 4.18.2
- Anthropic AI SDK 0.65.0
- Supabase JS 2.75.0

**APIs externes:**
- **Anthropic Claude:** `sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- ~~OpenAI~~ (remplacé par Anthropic)
- SerpAPI (DISABLED)

**Authentification actuelle:**
- Supabase déjà intégré ✅
- Tables: `tar_*` dans le projet Supabase

**Port local:** 3000

---

### 3. Notes de Frais (`ndf.odl-tools.ch`)

**Technologies:**
- HTML/CSS/JS vanilla
- Supabase JS (via CDN)
- Frankfurter API (conversion de devises)

**Authentification actuelle:**
- Supabase Auth déjà intégré ✅
- Tables: `invoices`, `profiles`, `expenses` dans Supabase

**Fonctionnalités:**
- Upload de fichiers (justificatifs)
- Conversion automatique des devises
- Gestion des notes de frais par utilisateur
- Interface admin pour validation

**Port local:** Fichiers statiques (http-server ou équivalent)

---

## 🔑 Stratégie SSO (Single Sign-On)

### Principe

Une fois authentifié sur **ODL Tools Dashboard**, l'utilisateur peut accéder à TAR Calculator et Notes de Frais **sans se reconnecter**.

### Implémentation

#### 1. Token JWT partagé via cookies

```javascript
// ODL Tools (Next.js) - Après login
const { data: { session } } = await supabase.auth.getSession()

// Set cookie sécurisé pour tous les sous-domaines
document.cookie = `sb-access-token=${session.access_token};
  domain=.odl-tools.ch;
  secure;
  httpOnly;
  samesite=lax;
  path=/`
```

#### 2. Vérification du token dans TAR & NDF

```javascript
// tar.odl-tools.ch & ndf.odl-tools.ch
const token = getCookie('sb-access-token')
const { data: { user } } = await supabase.auth.getUser(token)

if (!user) {
  // Rediriger vers app.odl-tools.ch/login
  window.location.href = 'https://app.odl-tools.ch/login'
}
```

#### 3. Middleware de vérification

Chaque app vérifie:
1. Présence du cookie `sb-access-token`
2. Validité du token via Supabase
3. Permissions de l'utilisateur (RLS)

---

## 🗄️ Base de données Supabase

### Tables existantes

#### Auth (`auth` schema)
- `users` - Utilisateurs Supabase
- `sessions` - Sessions actives

#### Public (`public` schema)

**Profiles:**
```sql
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  role TEXT, -- 'admin', 'user', 'finance'
  created_at TIMESTAMP
)
```

**TAR Calculator:**
- `tar_calculations` - Historique des calculs TAR
- `tar_products` - Produits catalogués
- `tar_rates` - Taux de recyclage par organisme (SWICO, SENS, Inobat)

**Notes de Frais:**
- `invoices` - Notes de frais
- `expenses` - Lignes de dépenses
- `invoice_files` - Justificatifs uploadés (Storage)

---

## 🐳 Déploiement Docker

### Architecture serveur actuel

```
Hostinger VPS (31.97.193.159)
├── N8N (isolé - NE PAS TOUCHER) ⚠️
├── ODL Tools Dashboard (port 8080 → Docker)
├── TAR Calculator (port 3000 → Docker)
└── Notes de Frais (port 8081 → Docker)
```

### Configuration Docker Compose (à créer)

```yaml
# docker-compose.yml (racine serveur)
version: '3.8'

services:
  odl-tools:
    build: ./odl-tools
    container_name: odl-tools-app
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
    networks:
      - odl-network

  tar-calculator:
    build: ./tar-calculator
    container_name: tar-calculator-api
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
    networks:
      - odl-network

  notes-de-frais:
    image: nginx:alpine
    container_name: notes-de-frais
    volumes:
      - ./note-de-frais:/usr/share/nginx/html:ro
    ports:
      - "8081:80"
    restart: unless-stopped
    networks:
      - odl-network

networks:
  odl-network:
    driver: bridge
```

---

## 🌐 Configuration DNS (odl-tools.ch)

### Records A/CNAME à configurer

```dns
# Root domain
odl-tools.ch                  A      31.97.193.159

# Sous-domaines
app.odl-tools.ch             CNAME   odl-tools.ch
tar.odl-tools.ch             CNAME   odl-tools.ch
ndf.odl-tools.ch             CNAME   odl-tools.ch
```

### Nginx Reverse Proxy (sur le serveur)

```nginx
# /etc/nginx/sites-available/odl-tools.ch

# ODL Tools Dashboard
server {
    listen 80;
    server_name app.odl-tools.ch;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# TAR Calculator
server {
    listen 80;
    server_name tar.odl-tools.ch;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}

# Notes de Frais
server {
    listen 80;
    server_name ndf.odl-tools.ch;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
    }
}
```

---

## 🔒 Sécurité

### HTTPS avec Let's Encrypt

```bash
# Sur le serveur
sudo certbot --nginx -d odl-tools.ch -d app.odl-tools.ch -d tar.odl-tools.ch -d ndf.odl-tools.ch
```

### Variables d'environnement (serveur)

```bash
# /opt/.env
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...
NEXT_PUBLIC_SITE_URL=https://odl-tools.ch
```

### Row Level Security (RLS)

Déjà configuré sur Supabase pour:
- `profiles` - Utilisateurs voient leur propre profil
- `invoices` - Utilisateurs voient leurs notes de frais
- `tar_calculations` - Historique personnel

---

## 📦 Plan de migration SSO

### Phase 1: Local (En cours)
1. ✅ ODL Tools Dashboard avec Supabase Auth
2. ✅ TAR Calculator connecté à Supabase
3. ✅ Notes de Frais connecté à Supabase
4. ⏳ Implémenter cookie SSO partagé
5. ⏳ Tester le SSO entre les 3 apps

### Phase 2: Dockerisation
1. Créer `Dockerfile` pour ODL Tools
2. Créer `Dockerfile` pour TAR Calculator
3. Créer config Nginx pour Notes de Frais
4. Tester `docker-compose.yml` en local

### Phase 3: Déploiement
1. Backup N8N (⚠️ IMPORTANT)
2. Upload des images Docker sur le serveur
3. Configuration Nginx reverse proxy
4. Configuration DNS des sous-domaines
5. SSL avec Let's Encrypt
6. Tests de bout en bout

---

## 🚀 Commandes de déploiement

### Build local
```bash
# ODL Tools
cd odl-tools && npm run build

# TAR Calculator
cd tar-calculator && npm install

# Notes de Frais
# Aucun build nécessaire (statique)
```

### Déploiement sur serveur
```bash
# Se connecter au serveur
ssh root@31.97.193.159

# Navigate to apps directory
cd /opt

# Pull latest code (via Git ou scp)
git pull origin main

# Rebuild Docker containers
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

---

## 📊 Monitoring

### Health checks

```bash
# ODL Tools
curl https://app.odl-tools.ch/api/health

# TAR Calculator
curl https://tar.odl-tools.ch/health

# Notes de Frais
curl https://ndf.odl-tools.ch/
```

### Logs Docker

```bash
# All containers
docker-compose logs -f

# Specific container
docker logs -f odl-tools-app
docker logs -f tar-calculator-api
docker logs -f notes-de-frais
```

---

## 🛠️ Maintenance

### Backup Supabase

Supabase gère automatiquement les backups, mais pour exporter:

```bash
# Via Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### Mise à jour des dépendances

```bash
# ODL Tools
cd odl-tools && npm update

# TAR Calculator
cd tar-calculator && npm update
```

---

## 📞 Support

- **Serveur:** 31.97.193.159 (Hostinger)
- **Supabase:** xewnzetqvrovqjcvwkus.supabase.co
- **Domaine:** odl-tools.ch
- **N8N:** ⚠️ Ne pas modifier (isolé)

---

## ⚠️ Notes importantes

1. **N8N est isolé** - Ne jamais modifier sa configuration Docker
2. **Clés API sensibles** - Toujours utiliser `.env` files, jamais commiter
3. **RLS activé** - Toujours tester les permissions Supabase
4. **HTTPS obligatoire** - Les cookies SSO nécessitent `secure` flag
5. **Cookies cross-domain** - Doivent utiliser `.odl-tools.ch` comme domain

---

**Dernière mise à jour:** 13 octobre 2025

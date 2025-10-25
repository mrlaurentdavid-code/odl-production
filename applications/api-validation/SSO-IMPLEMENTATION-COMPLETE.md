# ✅ SSO Implementation Complete

**Date**: 13 octobre 2025
**Version**: 1.0

---

## 🎯 Résumé

Le système de **Single Sign-On (SSO)** a été implémenté avec succès pour ODL Tools. Les 3 applications partagent maintenant l'authentification via un cookie sécurisé.

---

## 📦 Ce qui a été implémenté

### 1. ODL Tools Dashboard (`app.odl-tools.ch`)

#### Fichiers créés/modifiés:
- ✅ **`lib/sso.ts`** - Utilitaires SSO (création, récupération, suppression cookies)
- ✅ **`app/api/auth/set-sso/route.ts`** - API pour créer le cookie SSO après login
- ✅ **`app/api/auth/clear-sso/route.ts`** - API pour supprimer le cookie au logout
- ✅ **`app/login/page.tsx`** - Appel API `/api/auth/set-sso` après connexion réussie
- ✅ **`components/AuthButton.tsx`** - Appel API `/api/auth/clear-sso` avant déconnexion

#### Fonctionnement:
1. L'utilisateur se connecte sur `app.odl-tools.ch/login`
2. Après succès, un cookie `odl-sso-token` est créé avec l'`access_token` Supabase
3. Cookie partagé sur le domaine `.odl-tools.ch` (ou `localhost` en dev)
4. Durée de vie: 7 jours

---

### 2. TAR Calculator (`tar.odl-tools.ch`)

#### Fichiers créés/modifiés:
- ✅ **`middleware/sso-auth.js`** - Middleware Express pour vérifier le cookie SSO
- ✅ **`server.js`** - Intégration du middleware + CORS avec `credentials: true`
- ✅ **`package.json`** - Ajout de `cookie-parser`
- ✅ **`SSO-INTEGRATION.md`** - Documentation

#### Configuration CORS:
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.odl-tools.ch', 'https://tar.odl-tools.ch']
    : ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
```

#### Middleware disponibles:
- **`requireAuth`** - Bloque l'accès si pas authentifié (statut 401)
- **`optionalAuth`** - Enrichit `req.user` si cookie présent

---

### 3. Notes de Frais (`ndf.odl-tools.ch`)

#### Fichiers modifiés:
- ✅ **`app.js`** - Fonction `checkSession()` améliorée pour vérifier le cookie SSO

#### Fonctionnement:
1. Au chargement, `checkSession()` vérifie d'abord le cookie `odl-sso-token`
2. Si présent et valide, crée une session Supabase locale
3. Si absent, vérifie la session Supabase classique (fallback)
4. Si aucune session, redirige vers `app.odl-tools.ch/login`

---

## 🔑 Spécifications du cookie SSO

### Paramètres

| Paramètre | Valeur Dev | Valeur Prod |
|-----------|------------|-------------|
| **Nom** | `odl-sso-token` | `odl-sso-token` |
| **Domain** | `localhost` | `.odl-tools.ch` |
| **HttpOnly** | `true` | `true` |
| **Secure** | `false` | `true` |
| **SameSite** | `lax` | `lax` |
| **Path** | `/` | `/` |
| **Max-Age** | 7 jours | 7 jours |

### Contenu

Le cookie contient l'`access_token` JWT de Supabase, qui peut être vérifié avec:

```javascript
const { data: { user }, error } = await supabase.auth.getUser(ssoToken);
```

---

## 🧪 Tests en local

### Prérequis

Les 3 applications doivent tourner simultanément:

```bash
# Terminal 1 - ODL Tools
cd odl-tools
npm run dev
# → http://localhost:3001

# Terminal 2 - TAR Calculator
cd tar-calculator
npm start
# → http://localhost:3000

# Terminal 3 - Notes de Frais
cd note-de-frais
npx http-server -p 8081
# → http://localhost:8081
```

### Scénario de test

1. **Se connecter à ODL Tools**
   - Aller sur http://localhost:3001/login
   - Se connecter avec un compte Supabase
   - Vérifier que le cookie `odl-sso-token` est créé (DevTools → Application → Cookies)

2. **Accéder à TAR Calculator**
   - Ouvrir http://localhost:3000
   - L'app devrait reconnaître l'utilisateur via le cookie SSO
   - Vérifier les logs console: "✅ SSO valide: user@email.com"

3. **Accéder à Notes de Frais**
   - Ouvrir http://localhost:8081
   - L'app devrait reconnaître l'utilisateur via le cookie SSO
   - Pas besoin de se reconnecter

4. **Se déconnecter**
   - Sur ODL Tools, cliquer sur "Déconnexion"
   - Le cookie SSO est supprimé
   - Les 3 apps redirigent vers le login

---

## 🚨 Limitations en local

En développement sur `localhost`, les cookies ne peuvent **pas** être partagés entre différents ports.

### Solution: Utiliser un proxy local

Option 1: **Modifier `/etc/hosts`**

```bash
# /etc/hosts
127.0.0.1  app.odl-tools.local
127.0.0.1  tar.odl-tools.local
127.0.0.1  ndf.odl-tools.local
```

Puis configurer Nginx local pour router:
- `app.odl-tools.local` → `localhost:3001`
- `tar.odl-tools.local` → `localhost:3000`
- `ndf.odl-tools.local` → `localhost:8081`

Option 2: **Utiliser Caddy** (plus simple)

```caddyfile
app.odl-tools.local {
    reverse_proxy localhost:3001
}

tar.odl-tools.local {
    reverse_proxy localhost:3000
}

ndf.odl-tools.local {
    reverse_proxy localhost:8081
}
```

---

## 🌐 Déploiement en production

### 1. Configuration DNS

Sur votre registrar (ex: Infomaniak, Gandi), créer les enregistrements:

```dns
app.odl-tools.ch   A      31.97.193.159
tar.odl-tools.ch   A      31.97.193.159
ndf.odl-tools.ch   A      31.97.193.159
```

### 2. Nginx Reverse Proxy

Sur le serveur (`/etc/nginx/sites-available/odl-tools`):

```nginx
# ODL Tools Dashboard
server {
    listen 80;
    server_name app.odl-tools.ch;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# TAR Calculator
server {
    listen 80;
    server_name tar.odl-tools.ch;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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

### 3. SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d app.odl-tools.ch -d tar.odl-tools.ch -d ndf.odl-tools.ch
```

### 4. Variables d'environnement

Sur le serveur, créer `/opt/.env`:

```bash
NODE_ENV=production
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...
NEXT_PUBLIC_SITE_URL=https://odl-tools.ch
```

---

## 📊 Avantages du SSO

✅ **UX améliorée** - Une seule connexion pour toutes les apps
✅ **Sécurité renforcée** - Token JWT validé par Supabase
✅ **Session unifiée** - Déconnexion synchronisée
✅ **Maintenance simplifiée** - Un seul système d'auth à gérer
✅ **Scalabilité** - Facile d'ajouter de nouvelles apps

---

## 🔧 Troubleshooting

### Le cookie n'est pas partagé entre apps

**Cause**: Domain mal configuré
**Solution**: Vérifier que le cookie a `domain: .odl-tools.ch` (avec le point!)

### Erreur CORS lors de l'appel API

**Cause**: CORS ne permet pas les cookies
**Solution**: Ajouter `credentials: true` dans la config CORS Express

### L'utilisateur est redirigé en boucle

**Cause**: Le cookie SSO existe mais est invalide
**Solution**: Supprimer les cookies et se reconnecter

### TAR Calculator ne lit pas le cookie

**Cause**: `cookie-parser` pas installé
**Solution**: `npm install cookie-parser` dans tar-calculator

---

## 📞 Support

- **Architecture**: Voir `ARCHITECTURE-SSO.md`
- **Supabase**: xewnzetqvrovqjcvwkus.supabase.co
- **Serveur**: 31.97.193.159

---

**Dernière mise à jour**: 13 octobre 2025
**Implémenté par**: Claude (Anthropic)

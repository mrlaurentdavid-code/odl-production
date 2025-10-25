# 📚 ODL Tools - Structure du Projet

> Documentation complète de l'architecture, des fonctionnalités et de l'organisation du projet ODL Tools

**Dernière mise à jour:** 16 octobre 2025
**Version:** 1.0.0
**Stack:** Next.js 15.5.4 + React 19 + Supabase + TypeScript

---

## 📋 Table des Matières

1. [Vue d'ensemble](#-vue-densemble)
2. [Pages & Routes](#-pages--routes)
3. [Composants](#-composants)
4. [API Routes](#-api-routes)
5. [Configuration](#-configuration)
6. [Authentification & Sécurité](#-authentification--sécurité)
7. [Intégrations Externes](#-intégrations-externes)
8. [Déploiement](#-déploiement)

---

## 🎯 Vue d'ensemble

**ODL Tools** est un portail d'outils internes centralisé pour ODeal Group. Il fournit:
- 🔐 Authentification et autorisation robuste (Supabase Auth)
- 👥 Gestion des utilisateurs avec validation de profils
- 🎨 Design system Apple-inspired moderne
- 🔗 SSO pour les applications internes (TAR Calculator, Notes de Frais, etc.)
- 🧪 Interfaces de test pour les APIs (Image Converter, Translation)

---

## 📄 Pages & Routes

### Routes Publiques

| Route | Description | Fichier |
|-------|-------------|---------|
| `/` | Page d'accueil avec hero section | `app/page.tsx` |
| `/login` | Connexion email/password + inscription | `app/login/page.tsx` |

### Routes Protégées (Utilisateur Authentifié)

| Route | Description | Accès | Fichier |
|-------|-------------|-------|---------|
| `/dashboard` | Tableau de bord principal avec cartes d'apps | Tous | `app/dashboard/page.tsx` |
| `/onboarding` | Formulaire de complétion de profil | Nouveaux utilisateurs | `app/onboarding/page.tsx` |
| `/onboarding/pending` | Attente de validation du profil | Profil en attente | `app/onboarding/pending/page.tsx` |
| `/onboarding/rejected` | Re-soumission après rejet | Profil rejeté | `app/onboarding/rejected/page.tsx` |
| `/blocked` | Page pour utilisateurs désactivés | Utilisateurs bloqués | `app/blocked/page.tsx` |
| `/setup-account` | Configuration du compte (via invitation) | Token valide requis | `app/setup-account/page.tsx` |

### Routes de Test & Documentation

| Route | Description | Fichier |
|-------|-------------|---------|
| `/api-docs` | Documentation complète des APIs (TAR, Image Converter, Translation) | `app/api-docs/page.tsx` |
| `/image-converter-test` | Interface de test live pour conversion d'images WebP | `app/image-converter-test/page.tsx` |
| `/translation-test` | Interface de test live pour traduction multilingue | `app/translation-test/page.tsx` |

### Routes Admin (Super Admin uniquement)

| Route | Description | Fichier |
|-------|-------------|---------|
| `/admin` | Console de gestion des utilisateurs | `app/admin/page.tsx` |
| `/admin/profile-validation` | Validation/rejet des profils en attente | `app/admin/profile-validation/page.tsx` |
| `/admin/access-management` | Gestion des permissions et accès aux apps | `app/admin/access-management/page.tsx` |

---

## 🧩 Composants

### Composants Principaux

| Composant | Description | Utilisation |
|-----------|-------------|-------------|
| `AdminUserTable.tsx` | Table avancée de gestion des utilisateurs avec modal de rôles | `/admin` |
| `AuthButton.tsx` | Bouton de déconnexion | Layout global |
| `InviteUserModal.tsx` | Modal de génération de liens d'invitation | `/admin` |

### Composants UI (`components/ui/`)

| Composant | Description | Variantes |
|-----------|-------------|-----------|
| `AppCard.tsx` | Carte d'application avec gradient, stats, badges | - |
| `BackToDashboard.tsx` | Navigation retour au dashboard | - |
| `Badge.tsx` | Badge avec variantes de couleur | default, primary, success, warning, danger |
| `Button.tsx` | Bouton complet avec états | primary, secondary, outline, ghost, danger + loading |
| `Card.tsx` | Carte de base avec sous-composants | Header, Title, Description, Content, Footer |

### ❌ Composants Obsolètes à Supprimer

- `components/DashboardCard.tsx` - Remplacé par `AppCard.tsx`

---

## 🔌 API Routes

### Authentification

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/auth/set-sso` | POST | Crée le cookie SSO pour authentification cross-app |
| `/api/auth/clear-sso` | POST | Supprime le cookie SSO |
| `/api/auth/logout` | POST | Déconnexion complète + nettoyage cookies |
| `/api/auth/callback` | GET | Callback OAuth Supabase |

### Administration

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/admin/invite` | POST | Génère un token d'invitation (7 jours) |
| `/api/admin/toggle-role` | POST | Change le rôle utilisateur (super_admin, employee_type) |
| `/api/admin/toggle-active` | POST | Active/désactive un compte utilisateur |

---

## ⚙️ Configuration

### Fichiers de Configuration

| Fichier | Description |
|---------|-------------|
| `package.json` | Dépendances: Next.js 15.5.4, React 19, Supabase SSR, Tailwind |
| `next.config.js` | Configuration Next.js: strict mode, standalone output |
| `tsconfig.json` | TypeScript ES2020, strict mode, alias `@/*` |
| `tailwind.config.ts` | Design system complet (couleurs, animations, fonts) |
| `postcss.config.js` | Tailwind CSS + Autoprefixer |
| `Dockerfile` | Build multi-stage pour déploiement Docker |

### Variables d'Environnement Requises

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_SITE_URL=http://localhost:3001  # ou https://app.odl-tools.ch
```

---

## 🔐 Authentification & Sécurité

### Middleware (`middleware.ts`)

Protection complète des routes:
1. ✅ Vérifie l'authentification Supabase
2. ✅ Valide le statut du profil (pending_validation, rejected, active)
3. ✅ Force le rôle `super_admin` pour `/admin`
4. ✅ Redirige selon l'état utilisateur:
   - Non authentifié → `/login`
   - Profil incomplet → `/onboarding`
   - Profil en attente → `/onboarding/pending`
   - Profil rejeté → `/onboarding/rejected`
   - Utilisateur bloqué → `/blocked`

### Fonctions RPC Spéciales

Pour éviter les problèmes de RLS circulaire:
- `get_profile_bypass_rls(user_id)` - Récupère un profil en bypassant RLS
- `get_all_profiles_admin()` - Récupère tous les profils (admin uniquement)

### SSO Cross-Application

Cookie `.odl-tools.ch` partagé entre:
- `app.odl-tools.ch` (ODL Tools)
- `tar.odl-tools.ch` (TAR Calculator)
- `ndf.odl-tools.ch` (Notes de Frais)

---

## 🔗 Intégrations Externes

| Application | Dev | Production | Description |
|-------------|-----|------------|-------------|
| **TAR Calculator** | http://localhost:3004 | https://tar.odl-tools.ch | Calcul des tarifs TAR |
| **Notes de Frais** | http://localhost:8080 | https://ndf.odl-tools.ch | Gestion des notes de frais |
| **Image Converter API** | http://localhost:3005 | https://img.odl-tools.ch | Conversion WebP avec transformations |
| **Translation API** | http://localhost:3006 | - | Traduction multilingue (Claude 3.7 Sonnet) |
| **Supabase** | - | - | Auth, Database, Storage |

---

## 🚀 Déploiement

### Build & Run (Docker)

```bash
# Build l'image Docker
docker build -t odl-tools .

# Run le conteneur
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_SUPABASE_URL=xxx \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx \
  -e NEXT_PUBLIC_SITE_URL=https://app.odl-tools.ch \
  odl-tools
```

### Build Local

```bash
npm install
npm run build
npm start
```

**Port:** 3001

---

## 🎨 Design System

### Couleurs

| Couleur | Usage | Classes Tailwind |
|---------|-------|------------------|
| **Primary** (Bleu) | Actions principales, liens | `bg-primary-500`, `text-primary-600` |
| **Secondary** (Cyan) | Actions secondaires | `bg-secondary-500`, `text-secondary-600` |
| **Success** (Vert) | Confirmations, validations | `bg-success-500`, `text-success-600` |
| **Warning** (Jaune) | Alertes, en attente | `bg-warning-500`, `text-warning-600` |
| **Danger** (Rouge) | Erreurs, suppressions | `bg-danger-500`, `text-danger-600` |
| **Neutral** (Gris) | Textes, bordures, fonds | `bg-neutral-50` → `bg-neutral-900` |

### Typographie

- **Police principale:** Inter (Google Fonts)
- **Police monospace:** JetBrains Mono
- **Tailles:** text-xs → text-5xl

### Animations

| Animation | Keyframes | Classe |
|-----------|-----------|--------|
| `fade-in` | opacity 0 → 1 | `animate-fade-in` |
| `slide-up` | translateY(20px) → 0 | `animate-slide-up` |
| `slide-down` | translateY(-20px) → 0 | `animate-slide-down` |
| `scale-in` | scale(0.95) → 1 | `animate-scale-in` |

---

## 📊 Architecture Technique

### Stack Technique

- **Framework:** Next.js 15.5.4 (App Router, React Server Components)
- **React:** 19.2.0
- **TypeScript:** 5.9.3
- **Authentification:** Supabase Auth (mode SSR)
- **Base de données:** Supabase PostgreSQL + RLS
- **Styling:** Tailwind CSS 3.4.1
- **Icons:** Lucide React 0.446.0
- **Utilities:** clsx, tailwind-merge, class-variance-authority

### Flow de Données

```
User → Middleware → Server Components → Supabase (RLS) → Database
                ↓
          Client Components → API Routes → Supabase → Database
```

---

## 📝 Fonctionnalités Clés

### ✅ Implémenté

- [x] Authentification email/password (Supabase)
- [x] Système d'invitation avec tokens (7 jours)
- [x] Workflow de validation de profils (pending → approved/rejected)
- [x] Gestion des rôles (super_admin, employee_type)
- [x] Activation/désactivation des comptes
- [x] SSO cross-application (.odl-tools.ch)
- [x] Dashboard avec cartes d'applications
- [x] Interface de test Image Converter (WebP, zoom, pan)
- [x] Interface de test Translation (12+ langues, auto-detect)
- [x] Documentation API interactive (Weweb, N8N, Supabase)
- [x] Design system complet Apple-inspired
- [x] Docker deployment ready

### ❌ Manquant / À Améliorer

- [ ] Tests automatisés (unit, integration, E2E)
- [ ] Error boundaries React
- [ ] Système de logging structuré
- [ ] Analytics/monitoring (telemetry)
- [ ] Rate limiting sur les APIs admin
- [ ] Validation d'inputs avec Zod/Yup
- [ ] Storybook pour les composants
- [ ] Documentation API interne (Swagger/OpenAPI)

---

## 🗑️ Fichiers à Supprimer

### Composants Obsolètes
- ❌ `components/DashboardCard.tsx` (remplacé par AppCard.tsx)

### Documentation Obsolète
- ❌ `supabase-setup.sql` (schéma incomplet et obsolète)
- ❌ `README-STRUCTURE.md` (ne reflète plus la structure actuelle)
- ❌ `FILES-CREATED.txt` (liste statique de l'initialisation)

### Artefacts de Build (déjà dans .gitignore)
- `.next/` (build artifacts)
- `node_modules/` (dépendances)

---

## 🔍 Maintenance

### Commandes Utiles

```bash
# Développement
npm run dev          # Dev server (port 3001)
npm run build        # Production build
npm start            # Production server

# Qualité de code
npm run lint         # ESLint
npm run format       # Prettier (si configuré)

# Docker
docker build -t odl-tools .
docker run -p 3001:3001 odl-tools
```

### Checklist Avant Déploiement

- [ ] Variables d'environnement configurées
- [ ] Build Docker réussie
- [ ] Tests manuels des flows critiques:
  - [ ] Login/Logout
  - [ ] Onboarding complet
  - [ ] Validation de profil (admin)
  - [ ] Invitation d'utilisateur
  - [ ] SSO cross-app
- [ ] Vérification RLS policies Supabase
- [ ] Logs serveur sans erreurs

---

## 📞 Support & Contact

**Projet:** ODL Tools - Portail d'Outils Internes
**Organisation:** ODeal Group (ODL)
**Documentation:** Ce fichier + `/docs` (si existant)

---

_Document généré le 16 octobre 2025 - ODL Tools v1.0.0_

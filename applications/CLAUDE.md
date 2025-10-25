# CLAUDE.md - Applications

## 📌 Ce que contient ce dossier

Ce dossier contient **toutes les applications O!Deal Tools** déployées en production.

Chaque sous-dossier est une application complète et autonome avec son propre :
- Code source
- Configuration Docker
- Migrations Supabase (si applicable)
- Documentation

## 🗂️ Structure

```
applications/
├── odl-tools/          # Dashboard principal Next.js 15
├── api-validation/     # API Validation Next.js dédiée
├── tar-calculator/     # TAR Calculator Express
└── note-de-frais/      # Notes de frais HTML/Express
```

## 📦 Applications

### 1. odl-tools/
**Dashboard principal O!Deal Tools**
- **URL**: https://app.odl-tools.ch
- **Port**: 3001
- **Tech**: Next.js 15.5.5, Supabase, TypeScript
- **Rôle**: Interface centrale avec SSO, calculateurs intégrés, API validation
- **Voir**: `odl-tools/CLAUDE.md` pour détails

### 2. api-validation/
**API de Validation des Offres Fournisseurs**
- **URL**: https://api.odl-tools.ch
- **Port**: 3003
- **Tech**: Next.js 15 API Routes, PostgreSQL
- **Rôle**: Valider les offres, calculer COGS/marges/savings
- **Voir**: `api-validation/CLAUDE.md` pour détails

### 3. tar-calculator/
**Calculateur de Taxes de Recyclage**
- **URL**: https://tar.odl-tools.ch
- **Port**: 3000
- **Tech**: Express.js, Anthropic Claude AI, Supabase Cache
- **Rôle**: Calculer automatiquement la TAR pour les produits électroniques
- **Voir**: `tar-calculator/CLAUDE.md` pour détails

### 4. note-de-frais/
**Application Notes de Frais**
- **URL Web**: https://ndf.odl-tools.ch
- **URL API**: https://ndf-api.odl-tools.ch
- **Ports**: 80 (Web) + 3002 (API)
- **Tech**: HTML statique + Express API + Claude Vision
- **Rôle**: Gestion des notes de frais avec extraction de données
- **Voir**: `note-de-frais/CLAUDE.md` pour détails

## 🔗 Points Communs

Toutes les applications partagent :
- **Base de données**: Supabase PostgreSQL (xewnzetqvrovqjcvwkus)
- **Déploiement**: Docker avec Traefik reverse proxy
- **SSL**: Certificats automatiques Let's Encrypt
- **Réseau**: `root_default` (partagé)

## 🚀 Développement

Chaque application peut être développée indépendamment :

```bash
cd applications/[app-name]
npm install
npm run dev
```

## 📝 Pour Claude Code

- Chaque application a son propre `CLAUDE.md` détaillé
- Les migrations Supabase sont dans `*/supabase/migrations/`
- Les Dockerfile sont à la racine de chaque app
- Les configurations d'env sont dans `.env.local` (non commité)

## ⚠️ Important

- **api-validation** est une copie de **odl-tools** dédiée à l'API uniquement
- Les deux partagent le même schéma Supabase mais tournent indépendamment
- **tar-calculator** a sa propre logique de cache Supabase

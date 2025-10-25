# Quick Start Guide - ODeal Tools

## Étape 1: Configuration Supabase

### 1.1 Créer le schéma de base de données
1. Ouvrir Supabase Dashboard
2. Aller dans SQL Editor
3. Copier/coller le contenu de `supabase-setup.sql`
4. Exécuter le script

### 1.2 Configurer Google OAuth
1. Aller dans Authentication > Providers
2. Activer Google
3. Entrer Client ID et Secret depuis Google Cloud Console
4. Ajouter Redirect URL: `https://[VOTRE-DOMAINE]/api/auth/callback`

### 1.3 Récupérer les clés API
1. Aller dans Settings > API
2. Copier:
   - `Project URL` (déjà dans .env.local)
   - `anon public` key
   - `service_role` key (à garder secret!)

## Étape 2: Configuration Environnement

Éditer `/opt/odl-tools/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://aenlsduyhwatjkpakvcv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...VOTRE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...VOTRE_SERVICE_KEY
```

## Étape 3: Démarrer l'application

```bash
cd /opt/odl-tools

# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

## Étape 4: Créer le premier admin

1. Se connecter via Google OAuth sur `/login`
2. Dans Supabase SQL Editor, exécuter:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'votre-email@example.com';
   ```
3. Rafraîchir la page - vous avez maintenant accès à `/admin`

## Étape 5: Vérifier que tout fonctionne

- [ ] Page d'accueil accessible sur `http://localhost:3000`
- [ ] Connexion Google OAuth fonctionne
- [ ] Redirection vers `/dashboard` après login
- [ ] Les cartes TAR et NDF s'affichent
- [ ] Page `/admin` accessible avec compte admin
- [ ] Déconnexion fonctionne

## URLs Importantes

- **Développement**: http://localhost:3000
- **TAR Calculator**: https://tar-api.odeal.ch
- **Note de Frais**: https://ndf.odeal.ch (à venir)
- **Supabase Dashboard**: https://supabase.com/dashboard

## Structure des Permissions

### Utilisateur (user)
- Accès à `/dashboard`
- Peut voir les outils disponibles
- Peut ouvrir TAR Calculator et Note de Frais

### Administrateur (admin)
- Tous les droits utilisateur
- Accès à `/admin`
- Peut voir tous les utilisateurs
- Peut modifier les rôles (à implémenter)
- Peut inviter de nouveaux utilisateurs (à implémenter)

## Dépannage

### Erreur "Invalid API Key"
- Vérifier que les clés dans `.env.local` sont correctes
- Redémarrer l'application après modification

### Redirection OAuth échoue
- Vérifier que l'URL de callback est correcte dans Supabase
- Format: `https://[DOMAINE]/api/auth/callback`

### "Access Denied" sur /admin
- Vérifier que votre role est 'admin' dans la table profiles
- Exécuter: `SELECT * FROM profiles WHERE email = 'votre@email.com';`

### Middleware bloque toutes les routes
- Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont définis
- Les variables doivent commencer par `NEXT_PUBLIC_` pour être accessibles côté client

## Prochaines Fonctionnalités à Implémenter

1. **API pour inviter des utilisateurs**
   - Endpoint: `/api/admin/invite`
   - Utiliser Supabase Admin API

2. **API pour modifier les rôles**
   - Endpoint: `/api/admin/users/[id]/role`
   - Vérifier que l'utilisateur est admin

3. **Page Note de Frais**
   - Activer la carte quand l'outil est prêt
   - Changer `available: false` à `available: true`

4. **Notifications**
   - Toast pour succès/erreurs
   - Utiliser react-hot-toast ou similaire

5. **Logs d'activité**
   - Table `activity_logs` dans Supabase
   - Tracker connexions, changements de rôle, etc.

## Support

Documentation complète dans `README-STRUCTURE.md`

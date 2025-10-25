# SSO Integration - TAR Calculator

## Configuration

L'authentification SSO est désormais intégrée via le middleware `sso-auth.js`.

### Middleware disponibles

1. **`requireAuth`** - Bloque l'accès si pas authentifié
2. **`optionalAuth`** - Enrichit la requête avec l'utilisateur si disponible

### Utilisation

```javascript
const { requireAuth, optionalAuth } = require('./middleware/sso-auth');

// Route protégée (nécessite authentification)
app.post('/api/calculate-tar', requireAuth, async (req, res) => {
  // req.user contient les données utilisateur
  console.log('Calculé par:', req.user.email);
});

// Route optionnelle (track l'utilisateur si connecté)
app.get('/api/stats', optionalAuth, async (req, res) => {
  // req.user peut être undefined
  if (req.user) {
    console.log('Stats pour:', req.user.email);
  }
});
```

### Cookie SSO

- **Nom**: `odl-sso-token`
- **Domain**: `localhost` (dev) / `.odl-tools.ch` (prod)
- **HttpOnly**: true
- **Secure**: true en production
- **SameSite**: lax

### CORS

CORS configuré pour accepter les cookies depuis:
- **Dev**: `http://localhost:3001`, `http://localhost:3000`
- **Prod**: `https://app.odl-tools.ch`, `https://tar.odl-tools.ch`

### Redirection en cas d'échec

Si non authentifié, le middleware retourne:
```json
{
  "error": "Non authentifié",
  "redirectTo": "http://localhost:3001/login"
}
```

Le frontend peut intercepter ce statut 401 et rediriger l'utilisateur.

---

**Date**: 13 octobre 2025

# CLAUDE.md - TAR Calculator

## 📌 Qu'est-ce que cette application ?

**TAR Calculator** calcule automatiquement les taxes de recyclage (TAR) pour les produits électroniques en Suisse.

- **URL Production**: https://tar.odl-tools.ch
- **URL Locale**: http://localhost:3000
- **Technologie**: Express.js + Anthropic Claude AI
- **Base de données**: Supabase (cache uniquement)
- **Port**: 3000

## 🎯 Fonction Principale

Calculer la TAR (Taxe Anticipée de Recyclage) pour:
- **SWICO** - Électronique et informatique
- **SENS** - Gros électroménager
- **INOBAT** - Piles et batteries

## 🔑 Endpoints

### 1. POST /api/calculate-tar-v2
**Recherche libre avec IA**

Utilise Claude AI pour:
- Identifier le produit depuis une description
- Extraire les spécifications (poids, dimensions, écran)
- Déterminer la catégorie TAR
- Calculer le montant

**Input**:
```json
{
  "ean": "5099206071131",
  "description": "Clavier sans fil Logitech K270",
  "type_produit": "clavier",
  "marque": "Logitech",
  "poids": 0.5
}
```

**Output**:
```json
{
  "success": true,
  "ean": "5099206071131",
  "description": "Clavier sans fil Logitech K270",
  "tariff": "0.30",
  "category": "small_it",
  "organisme": "SWICO",
  "source": "anthropic_cache",
  "cached": true
}
```

### 2. POST /api/calculate-tar-odeal
**Formulaire structuré O!Deal**

Utilise les sous-catégories du formulaire O!Deal.
**Plus rapide** - Pas d'IA, calcul déterministe.

**Input**:
```json
{
  "ean": "5099206071131",
  "description": "Clavier Logitech",
  "subcategory": "keyboard_mouse",
  "poids": 0.5
}
```

## 🗂️ Structure du Code

```
tar-calculator/
├── server.js                       # Serveur Express principal (800+ lignes)
├── tar-engine-proactive.js         # Logique de calcul TAR
├── supabase-cache.js              # Cache Supabase
├── subcategory-tar-mapping.js     # Mapping sous-catégories → TAR
│
├── public/
│   └── index.html                 # Interface web
│
├── middleware/
│   └── sso-auth.js                # SSO middleware (à venir)
│
├── Data JSON/
│   ├── swico-complet-2026.json    # Barème SWICO 2026
│   ├── sens-complet-2026.json     # Barème SENS 2026
│   └── inobat-complet-2026.json   # Barème INOBAT 2026
│
└── Backups/
    ├── server.js.backup-before-anthropic
    ├── server.js.backup-before-v2
    └── ... (multiples backups)
```

## 🧠 Logique de Calcul

### Étape 1: Identification du Produit

**Via Anthropic Claude AI**:
- Modèle: claude-3-5-sonnet-20241022
- Extraction: poids, dimensions, taille écran, type
- Détermination de la catégorie

**Catégories SWICO**:
- `small_it` - Petits appareils IT (< 5kg) → 0.30 CHF
- `large_it` - Grands appareils IT (≥ 5kg) → 1.00 CHF
- `screen_small` - Écrans < 100cm → Variable
- `screen_large` - Écrans ≥ 100cm → Variable

### Étape 2: Calcul du Montant

**Barème 2026** (fichiers JSON complets):
- Identification de la sous-catégorie exacte
- Application du tarif correspondant
- Prise en compte du poids si applicable

### Étape 3: Cache

**Cache Supabase** (`tar_cache` table):
- Stockage par EAN + description
- TTL: pas de limite (cache permanent)
- Invalidation manuelle si nécessaire

## 🔧 Configuration

### Variables d'Environnement

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase
SUPABASE_URL=https://xewnzetqvrovqjcvwkus.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Port
PORT=3000
NODE_ENV=production
```

## 🗄️ Table Supabase

### tar_cache

```sql
CREATE TABLE tar_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ean TEXT,
  description TEXT NOT NULL,
  tariff DECIMAL(10,2) NOT NULL,
  category TEXT,
  organisme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_tar_cache_ean ON tar_cache(ean);
CREATE INDEX idx_tar_cache_description ON tar_cache(description);
```

## 🚀 Déploiement

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Script de Déploiement

```bash
../../deployment/deploy-tar-calculator.sh
```

## 🧪 Tests

### Test Endpoint V2 (IA)

```bash
curl -X POST http://localhost:3000/api/calculate-tar-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "ean": "5099206071131",
    "description": "Clavier sans fil Logitech K270",
    "poids": 0.5
  }'
```

### Test Endpoint O!Deal (Déterministe)

```bash
curl -X POST http://localhost:3000/api/calculate-tar-odeal \
  -H "Content-Type: application/json" \
  -d '{
    "ean": "5099206071131",
    "description": "Clavier Logitech",
    "subcategory": "keyboard_mouse"
  }'
```

## 📊 Mapping Sous-Catégories

Fichier: `subcategory-tar-mapping.js`

**Exemples**:
```javascript
{
  'keyboard_mouse': { tariff: 0.30, category: 'small_it', organisme: 'SWICO' },
  'laptop': { tariff: 1.00, category: 'large_it', organisme: 'SWICO' },
  'smartphone': { tariff: 0.30, category: 'small_it', organisme: 'SWICO' },
  'tv_40_49': { tariff: 7.00, category: 'screen_medium', organisme: 'SWICO' },
  'washing_machine': { tariff: 20.00, category: 'large_appliance', organisme: 'SENS' }
}
```

## 📝 Pour Claude Code

### Points d'Attention

1. **Anthropic API**: Coût par requête, utiliser le cache autant que possible
2. **Barèmes JSON**: Fichiers volumineux (50-100kb chacun), ne pas les modifier sans raison
3. **Cache**: Permanent, nettoyer manuellement si besoin
4. **Backups**: Nombreux backups du serveur (historique des évolutions)

### Fichiers Critiques

- `server.js` - Serveur principal (800+ lignes, bien commenté)
- `tar-engine-proactive.js` - Logique métier de calcul
- `subcategory-tar-mapping.js` - Mapping déterministe
- `swico-complet-2026.json` - Barème officiel SWICO

### Évolution du Code

**Historique** (voir backups):
1. Version initiale avec SerpAPI (retiré)
2. Ajout Google Fallback (retiré)
3. Intégration Anthropic Claude
4. Ajout cache Supabase
5. Création endpoint v2
6. Ajout endpoint O!Deal déterministe
7. Optimisations multiples (voir backups)

### Performance

- **Endpoint v2**: ~2-3s (appel Anthropic)
- **Endpoint O!Deal**: ~100ms (déterministe)
- **Cache hit**: ~50ms

## 🔗 Intégrations

### O!Deal Tools Dashboard
Utilisé dans la page `/api-docs` pour documenter l'API TAR

### Formulaire O!Deal
Endpoint O!Deal utilisé pour calcul TAR dans les formulaires produits

## 🆘 Troubleshooting

### Anthropic API retourne erreur
→ Vérifier `ANTHROPIC_API_KEY` est valide
→ Vérifier quota API non dépassé

### Cache ne fonctionne pas
→ Vérifier connexion Supabase
→ Vérifier table `tar_cache` existe

### Tarif semble incorrect
→ Comparer avec fichiers JSON officiels (swico/sens/inobat)
→ Vérifier la catégorie détectée

### Performance lente
→ Vérifier le cache est utilisé (check logs)
→ Optimiser les requêtes Anthropic (prompt size)

## 📚 Ressources

- Barème SWICO: https://www.swico.ch
- Barème SENS: https://www.erecycling.ch
- Barème INOBAT: https://www.inobat.ch
- Anthropic Docs: https://docs.anthropic.com

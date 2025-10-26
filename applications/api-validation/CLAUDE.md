# CLAUDE.md - API Validation O!Deal

## 📌 Qu'est-ce que cette application ?

**API Validation** est une **copie dédiée** de odl-tools servant uniquement l'endpoint `/api/validate-item`.

- **URL Production**: https://api.odl-tools.ch
- **URL Locale**: http://localhost:3003
- **Technologie**: Next.js 15.5.5 API Routes
- **Base de données**: Supabase PostgreSQL (partagée avec odl-tools)
- **Port**: 3003

## 🎯 Pourquoi une Application Séparée ?

Cette application est une **copie identique** d'odl-tools mais:
1. **Déployée séparément** pour isolation
2. **Port différent** (3003 vs 3001)
3. **URL dédiée** (api.odl-tools.ch)
4. **Optimisée** pour l'endpoint validation uniquement

Avantages:
- Scalabilité indépendante
- Pas d'impact sur le dashboard si l'API a du trafic
- Monitoring séparé
- Déploiement indépendant

## 🔑 Fonction Principale

### POST /api/validate-item

**Endpoint**: https://api.odl-tools.ch/api/validate-item

**But**: Valider automatiquement une offre fournisseur

**Authentication**: Header `X-API-Key`

**📘 Documentation Complète**: Voir `API_SPECIFICATION.md` pour tous les détails

**Input (Complet)** :
```json
{
  "offer_id": "1f218950-3789-4176-a883-958c593a84af",
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
  "item_id": "888413779764",
  "ean": "0888413779764",
  "product_name": "Apple iPhone 15 Pro 256GB",
  "category_name": "Electronics",
  "subcategory_name": "Smartphones",
  "msrp": 1299.00,
  "street_price": 1199.00,
  "promo_price": 999.00,
  "purchase_price_ht": 750.00,
  "purchase_currency": "EUR",
  "quantity": 10,
  "package_weight_kg": 0.8,
  "pesa_fee_ht": 2.50,
  "warranty_cost_ht": 0
}
```

**Input (Minimal)** :
```json
{
  "offer_id": "1f218950-3789-4176-a883-958c593a84af",
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
  "item_id": "888413779764",
  "msrp": 300.00,
  "street_price": 250.00,
  "promo_price": 200.00,
  "purchase_price_ht": 120.00
}
```

**Output** :
```json
{
  "success": true,
  "is_valid": true,
  "deal_status": "good",
  "cost_id": "d3e6a22b-efad-4f0c-864a-96a5bcc0e9ac",
  "validation_issues": [],
  "item_details": {
    "item_id": "888413779764",
    "ean": "0888413779764",
    "product_name": "Apple iPhone 15 Pro 256GB"
  },
  "pricing": {
    "msrp": 1299.00,
    "street_price": 1199.00,
    "promo_price": 999.00,
    "purchase_price_original": 750.00,
    "purchase_currency": "EUR",
    "currency_rate": 0.95
  },
  "applied_rule": {
    "rule_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "rule_name": "Electronics - Smartphones Rules",
    "scope": "subcategory",
    "category": "Electronics",
    "subcategory": "Smartphones"
  }
}
```

**⚠️ Données Sensibles Retirées** (depuis 2025-10-26):
- ❌ `costs_breakdown` (logistics_ht, customs_duty_ht, etc.)
- ❌ `deal_thresholds` (seuils min/max marges O!Deal)

### Champs Requis

| Champ | Type | Description |
|-------|------|-------------|
| `offer_id` | UUID | Identifiant unique de l'offre |
| `supplier_id` | UUID | Identifiant du fournisseur |
| `item_id` | TEXT | Code produit (EAN/SKU/référence) |
| `msrp` | NUMERIC | Prix de vente conseillé en CHF TTC |
| `street_price` | NUMERIC | Prix marché actuel en CHF TTC |
| `promo_price` | NUMERIC | Prix promo proposé en CHF TTC |
| `purchase_price_ht` | NUMERIC | Prix d'achat HT (devise d'origine) |

### Champs Optionnels Importants

| Champ | Type | Défaut | Description |
|-------|------|--------|-------------|
| `category_name` | TEXT | `null` | **Important pour calcul douanes et règles métier** |
| `subcategory_name` | TEXT | `null` | **Important pour règles métier hiérarchiques** |
| `purchase_currency` | TEXT | `"CHF"` | Devise du prix d'achat (EUR, USD, CHF...) |
| `quantity` | INT | `1` | Quantité proposée |
| `product_name` | TEXT | `null` | Nom du produit |
| `ean` | TEXT | `item_id` | Code EAN si différent de item_id |
| `package_weight_kg` | NUMERIC | `0.5` | Poids du colis |
| `pesa_fee_ht` | NUMERIC | `0` | Frais PESA HT |
| `warranty_cost_ht` | NUMERIC | `0` | Coût garantie HT |

**⚠️ Note**: Pour bénéficier de règles métier spécifiques et calculs de douanes corrects, il est **fortement recommandé** de fournir `category_name` et `subcategory_name`.

## 🗂️ Structure

Cette application est **IDENTIQUE** à odl-tools (voir `../odl-tools/CLAUDE.md`).

Seules différences:
- **Port**: 3003 au lieu de 3001
- **URL**: api.odl-tools.ch au lieu de app.odl-tools.ch
- **Dockerfile**: `Dockerfile.api` au lieu de `Dockerfile`

## 📊 Données Supabase

### Tables Utilisées

- `supplier_registry` - Fournisseurs enregistrés
- `supplier_api_keys` - Clés API (hash SHA256)
- `odeal_business_rules` - Règles métier (marges min/max)
- `odeal_customs_duty_rates` - Taux de douane par catégorie
- `logistics_rates` - Grille tarifaire logistique
- `transport_providers` - Fournisseurs transport

### Fonction PostgreSQL Critique

**validate_supplier_item_offer()**

```sql
-- Fichier: supabase/migrations/20251025000013_create_validate_item_function.sql

CREATE OR REPLACE FUNCTION validate_supplier_item_offer(
  p_supplier_id UUID,
  p_item_name TEXT,
  p_supplier_price_chf DECIMAL,
  p_quantity INTEGER,
  p_category TEXT DEFAULT NULL
) RETURNS JSON
```

Cette fonction:
1. Calcule le COGS total (supplier + transport + customs + logistics)
2. Calcule la marge: `(price - COGS) / price * 100`
3. Détermine le deal_status: top/good/almost_good/bad
4. Retourne le JSON complet avec breakdown

## 🔐 Authentification

### Système de Clés API

Les clés API sont stockées hashées (SHA256) dans `supplier_api_keys`.

**Processus**:
1. Fournisseur reçoit une clé en clair (ex: `WEWEB_TEST_2025`)
2. Backend hash la clé avec SHA256
3. Hash stocké en base
4. À chaque requête, header `X-API-Key` est hashé et comparé

**Exemple de création de clé**:
```sql
-- Clé en clair: WEWEB_TEST_2025
-- Hash SHA256: c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7

INSERT INTO supplier_api_keys (
  supplier_id,
  api_key_hash,
  key_name
) VALUES (
  '334773ca-22ab-43bb-834f-eb50aa1d01f8',
  'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7',
  'WeWeb Test Key'
);
```

## 🚀 Déploiement

### Dockerfile

**Fichier**: `Dockerfile.api`

Points importants:
- Output standalone
- Port 3003
- **Ne PAS copier** public/ (n'existe pas)

### Script de Déploiement

```bash
../../deployment/deploy-api-validation.sh
```

Ce script:
1. Rsync les fichiers vers `/opt/api-validation` sur le serveur
2. Rebuild l'image Docker
3. Restart le container `api-validation`

## 🧪 Tests

### Test Local

```bash
# 1. Démarrer l'app
npm run dev

# 2. Tester l'endpoint
curl -X POST http://localhost:3003/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: WEWEB_TEST_2025" \
  -d '{
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_name": "Laptop Dell XPS 15",
    "supplier_price_chf": 800.00,
    "quantity": 10,
    "category": "Computers"
  }'
```

### Test Production

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: WEWEB_TEST_2025" \
  -d '{
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_name": "iPhone 15 Pro",
    "supplier_price_chf": 1000.00,
    "quantity": 5,
    "category": "Electronics"
  }'
```

## 📝 Pour Claude Code

### Relation avec odl-tools

- **Code identique** à odl-tools
- **Base de données partagée**
- **Migrations synchronisées** (même dossier supabase/)

⚠️ **IMPORTANT**: Si vous modifiez le code de validation:
1. Modifier dans `odl-tools/`
2. Copier vers `api-validation/`
3. OU modifier directement et synchroniser après

### Fichiers Critiques

- `app/api/validate-item/route.ts` - Endpoint principal
- `supabase/migrations/20251025000013_create_validate_item_function.sql` - Fonction SQL
- `Dockerfile.api` - Config Docker spécifique

### Points d'Attention

1. **Port 3003** - Ne pas confondre avec 3001 (odl-tools)
2. **Dockerfile.api** - Utiliser celui-ci, pas Dockerfile
3. **Migrations** - Partagées avec odl-tools
4. **Cache** - Pas de cache actif (contrairement à TAR calculator)

## 🔗 Intégrations

### WeWeb
Formulaire de validation d'offres connecté à cet endpoint

### N8N
Workflows automatisés (à venir) utilisant cette API

## 📈 Données de Test

Voir fichier: `supabase/migrations/setup_weweb_test_data.sql`

Ce fichier contient:
- Fournisseur test: AdminTest (334773ca-22ab-43bb-834f-eb50aa1d01f8)
- Clé API test: WEWEB_TEST_2025
- Règles métier
- Taux de douane
- 4 exemples de tests (top/good/almost/bad deals)

## 🆘 Troubleshooting

### API retourne 401
→ Vérifier que la clé API existe dans `supplier_api_keys` (hash correct)

### API retourne 404 supplier
→ Vérifier que `supplier_id` existe dans `supplier_registry`

### COGS semble incorrect
→ Vérifier les taux dans `logistics_rates` et `odeal_customs_duty_rates`

### Deal status incorrect
→ Vérifier les seuils dans `odeal_business_rules`

# TEST API /api/validate-item

**Date**: 25 octobre 2025
**Endpoint**: `POST http://localhost:3000/api/validate-item`

---

## PRÉREQUIS

1. ✅ Phase 1B complétée (migrations + fonction SQL)
2. ✅ Next.js dev server lancé : `npm run dev`
3. ✅ Supabase local Docker en cours : port 54331
4. ✅ API Key test créée : `odl_sup_test_abc123xyz456`

---

## DÉMARRER LE SERVEUR NEXT.JS

```bash
cd /Users/laurentdavid/Desktop/odl-projects/odl-tools
npm run dev
```

**Attendu** : Server running on `http://localhost:3000`

---

## TEST 1: GET (Documentation API)

```bash
curl -X GET http://localhost:3000/api/validate-item
```

**Résultat attendu** :
```json
{
  "status": "ok",
  "endpoint": "/api/validate-item",
  "version": "1.0.0",
  "description": "O!Deal Supplier Offer Validation API",
  ...
}
```

---

## TEST 2: POST Sans API Key (Erreur 401)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174000",
    "item_id": "123e4567-e89b-12d3-a456-426614174001",
    "msrp": 199,
    "street_price": 122,
    "promo_price": 119,
    "purchase_price_ht": 90
  }'
```

**Résultat attendu** :
```json
{
  "success": false,
  "error": "Missing API key. Provide it in X-API-Key or Authorization header.",
  "code": "MISSING_API_KEY"
}
```
**Status**: 401

---

## TEST 3: POST Avec API Key Invalide (Erreur 401)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_key_12345" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174000",
    "item_id": "123e4567-e89b-12d3-a456-426614174001",
    "msrp": 199,
    "street_price": 122,
    "promo_price": 119,
    "purchase_price_ht": 90
  }'
```

**Résultat attendu** :
```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```
**Status**: 401

---

## TEST 4: POST Champs Manquants (Erreur 400)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_test_abc123xyz456" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174000",
    "msrp": 199
  }'
```

**Résultat attendu** :
```json
{
  "success": false,
  "error": "Missing required fields: item_id, street_price, promo_price, purchase_price_ht",
  "code": "MISSING_FIELDS"
}
```
**Status**: 400

---

## TEST 5: POST GOOD DEAL (EUR → CHF)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_test_abc123xyz456" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174000",
    "item_id": "123e4567-e89b-12d3-a456-426614174001",
    "product_name": "Samsung Galaxy Buds3 Pro",
    "msrp": 199,
    "street_price": 122,
    "promo_price": 119,
    "purchase_price_ht": 90,
    "purchase_currency": "EUR",
    "package_weight_kg": 0.5,
    "quantity": 1
  }' | jq
```

**Résultat attendu** :
```json
{
  "success": true,
  "cost_id": "uuid...",
  "item_id": "123e4567-e89b-12d3-a456-426614174001",
  "offer_id": "123e4567-e89b-12d3-a456-426614174000",
  "deal_status": "bad",
  "is_valid": false,
  "validation_issues": [...],
  "costs": {
    "purchase_price_ht": 90.00,
    "purchase_price_chf_ht": 84.90,
    "currency_rate": 0.9248,
    "currency_safety_coef": 1.02,
    "logistics_inbound_ht": 7.50,
    "logistics_inbound_carrier": "DHL",
    "logistics_outbound_ht": 8.40,
    "logistics_outbound_carrier": "Swiss Post",
    "payment_fee_ht": 3.75,
    "cogs_total_ht": 104.55
  },
  "margins": {
    "marge_brute_chf": 14.45,
    "marge_brute_percent": 12.14,
    "target_margin": 30,
    "minimum_margin": 20
  },
  "savings": {
    "eco_vs_msrp_chf": 80.00,
    "eco_vs_msrp_percent": 40.20,
    "eco_vs_street_chf": 3.00,
    "eco_vs_street_percent": 2.46
  }
}
```

**Status**: 200

---

## TEST 6: POST TOP DEAL (CHF)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_test_abc123xyz456" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174010",
    "item_id": "123e4567-e89b-12d3-a456-426614174011",
    "product_name": "Test Product TOP",
    "msrp": 199,
    "street_price": 122,
    "promo_price": 99,
    "purchase_price_ht": 40,
    "purchase_currency": "CHF",
    "package_weight_kg": 0.3,
    "quantity": 1
  }' | jq
```

**Résultat attendu** :
```json
{
  "success": true,
  "deal_status": "top",
  "is_valid": true,
  "validation_issues": [],
  "margins": {
    "marge_brute_percent": 40.33
  },
  "savings": {
    "eco_vs_msrp_percent": 50.25
  }
}
```

**Status**: 200

---

## TEST 7: POST BAD DEAL (Marge négative)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_test_abc123xyz456" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174020",
    "item_id": "123e4567-e89b-12d3-a456-426614174021",
    "product_name": "Test Product BAD",
    "msrp": 199,
    "street_price": 122,
    "promo_price": 119,
    "purchase_price_ht": 110,
    "purchase_currency": "EUR",
    "package_weight_kg": 0.5,
    "quantity": 1
  }' | jq
```

**Résultat attendu** :
```json
{
  "success": true,
  "deal_status": "bad",
  "is_valid": false,
  "validation_issues": [
    {
      "type": "margin_too_low",
      "message": "Marge brute trop faible: -3.71% (min: 20%)"
    },
    {
      "type": "savings_too_low_street",
      "message": "..."
    }
  ],
  "margins": {
    "marge_brute_percent": -3.71
  }
}
```

**Status**: 200

---

## TEST 8: OPTIONS Preflight (CORS)

```bash
curl -X OPTIONS http://localhost:3000/api/validate-item \
  -H "Origin: https://app.weweb.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-API-Key, Content-Type" \
  -v
```

**Résultat attendu** :
- Status: 204
- Headers:
  - `Access-Control-Allow-Origin: https://app.weweb.io`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key`
  - `Access-Control-Max-Age: 86400`

---

## TEST 9: Currency Non Supportée (Erreur)

```bash
curl -X POST http://localhost:3000/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_test_abc123xyz456" \
  -d '{
    "offer_id": "123e4567-e89b-12d3-a456-426614174030",
    "item_id": "123e4567-e89b-12d3-a456-426614174031",
    "msrp": 199,
    "street_price": 122,
    "promo_price": 119,
    "purchase_price_ht": 10000,
    "purchase_currency": "JPY",
    "package_weight_kg": 0.5
  }' | jq
```

**Résultat attendu** :
```json
{
  "success": false,
  "error": "Currency rate not available for JPY"
}
```

**Status**: 400

---

## VÉRIFIER EN BASE DE DONNÉES

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres -c "
SELECT
  cost_id,
  product_name,
  deal_status,
  ROUND(marge_brute_percent, 2) AS margin_pct,
  is_valid,
  calculated_at
FROM offer_item_calculated_costs
ORDER BY calculated_at DESC
LIMIT 10;"
```

**Attendu** : Toutes les validations API enregistrées

---

## VÉRIFIER QUOTA SUPPLIER

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres -c "
SELECT
  company_name,
  daily_validations_count,
  max_daily_validations,
  api_key_last_used_at
FROM supplier_registry
WHERE api_key_prefix = 'odl_sup_test';"
```

**Attendu** : Compteur incrémenté pour chaque validation réussie

---

## RÉSUMÉ TESTS API

| Test | Scénario | Status Attendu | Code Attendu |
|------|----------|----------------|--------------|
| 1 | GET documentation | 200 | OK |
| 2 | POST sans API key | 401 | MISSING_API_KEY |
| 3 | POST API key invalide | 401 | INVALID_API_KEY |
| 4 | POST champs manquants | 400 | MISSING_FIELDS |
| 5 | POST GOOD deal (EUR) | 200 | BAD (marge 12%) |
| 6 | POST TOP deal (CHF) | 200 | TOP (marge 40%) |
| 7 | POST BAD deal | 200 | BAD (marge -3%) |
| 8 | OPTIONS preflight | 204 | CORS headers OK |
| 9 | POST currency error | 400 | Error handled |

---

## PROCHAINE ÉTAPE

Si tous les tests passent : **Phase 3 - Production Deployment**
- Push migrations vers Supabase Cloud
- Déployer Next.js sur Vercel/production
- Générer vraies API keys pour suppliers
- Intégrer avec WeWeb

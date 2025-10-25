# TEST PHASE 1B - validate_and_calculate_item()

**Date**: 25 octobre 2025
**Objectif**: Tester la fonction principale de validation O!Deal

---

## PRÉREQUIS

Phase 1A doit être complétée :
- ✅ Migrations appliquées
- ✅ Supplier test créé
- ✅ Taux de change insérés
- ✅ Business rules configurées

---

## TEST 1: Validation Item GOOD (EUR)

### Scénario
- Product: Samsung Galaxy Buds3 Pro
- Purchase: 90 EUR HT
- MSRP: 199 CHF
- Street: 122 CHF
- Promo: 119 CHF
- Weight: 0.5 kg

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
-- Get supplier_id from Phase 1A
WITH supplier AS (
  SELECT supplier_id FROM supplier_registry WHERE api_key_prefix = 'odl_sup_test' LIMIT 1
),
test_data AS (
  SELECT jsonb_build_object(
    'offer_id', gen_random_uuid(),
    'item_id', gen_random_uuid(),
    'ean', '7640129881234',
    'product_name', 'Samsung Galaxy Buds3 Pro',
    'msrp', 199,
    'street_price', 122,
    'promo_price', 119,
    'purchase_price_ht', 90,
    'purchase_currency', 'EUR',
    'package_weight_kg', 0.5,
    'quantity', 1
  ) AS item_data
)
SELECT validate_and_calculate_item(
  (SELECT supplier_id FROM supplier),
  gen_random_uuid(),  -- user_id (we don't have users yet)
  (SELECT item_data FROM test_data)
) AS result;
EOF
```

### Résultat attendu

```json
{
  "success": true,
  "deal_status": "good",
  "is_valid": true,
  "costs": {
    "purchase_price_ht": 90.00,
    "purchase_price_chf_ht": 84.90,  // 90 × 0.9248 × 1.02
    "currency_rate": 0.9248,
    "currency_safety_coef": 1.02,
    "logistics_inbound_ht": 5.50,    // DHL 0-1kg inbound
    "logistics_outbound_ht": 6.90,   // Swiss Post 0-1kg outbound
    "payment_fee_ht": ~3.50,         // Stripe 2.9% + 0.30
    "cogs_total_ht": ~100.80
  },
  "margins": {
    "marge_brute_chf": ~18.20,
    "marge_brute_percent": ~15.3%,   // Below target (30%) but above min (20%)
    "target_margin": 30,
    "minimum_margin": 20
  },
  "savings": {
    "eco_vs_msrp_chf": 80,
    "eco_vs_msrp_percent": 40.2%,   // Above min (30%) ✓
    "eco_vs_street_chf": 3,
    "eco_vs_street_percent": 2.5%   // Below min (15%)
  }
}
```

**Deal Status**: `good` car marge > 20% ET économie MSRP > 30%

---

## TEST 2: Validation Item TOP (CHF)

### Scénario
- Purchase: 50 CHF HT (no conversion)
- MSRP: 199 CHF
- Street: 122 CHF
- Promo: 89 CHF
- Weight: 0.3 kg

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
WITH supplier AS (
  SELECT supplier_id FROM supplier_registry WHERE api_key_prefix = 'odl_sup_test' LIMIT 1
),
test_data AS (
  SELECT jsonb_build_object(
    'offer_id', gen_random_uuid(),
    'item_id', gen_random_uuid(),
    'product_name', 'Test Product TOP',
    'msrp', 199,
    'street_price', 122,
    'promo_price', 89,
    'purchase_price_ht', 50,
    'purchase_currency', 'CHF',
    'package_weight_kg', 0.3,
    'quantity', 1
  ) AS item_data
)
SELECT
  result->>'deal_status' AS status,
  result->>'is_valid' AS valid,
  result->'margins'->>'marge_brute_percent' AS margin,
  result->'savings'->>'eco_vs_msrp_percent' AS savings_msrp
FROM (
  SELECT validate_and_calculate_item(
    (SELECT supplier_id FROM supplier),
    gen_random_uuid(),
    (SELECT item_data FROM test_data)
  ) AS result
) t;
EOF
```

### Résultat attendu

```
status | valid | margin | savings_msrp
-------+-------+--------+-------------
top    | t     | ~35%   | ~55%
```

**Deal Status**: `top` car marge > 30% (target) ET économie > 30%

---

## TEST 3: Validation Item BAD (Marge trop faible)

### Scénario
- Purchase: 110 EUR HT
- MSRP: 199 CHF
- Street: 122 CHF
- Promo: 119 CHF
- Weight: 0.5 kg

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
WITH supplier AS (
  SELECT supplier_id FROM supplier_registry WHERE api_key_prefix = 'odl_sup_test' LIMIT 1
),
test_data AS (
  SELECT jsonb_build_object(
    'offer_id', gen_random_uuid(),
    'item_id', gen_random_uuid(),
    'product_name', 'Test Product BAD (high purchase price)',
    'msrp', 199,
    'street_price', 122,
    'promo_price', 119,
    'purchase_price_ht', 110,  -- Too high!
    'purchase_currency', 'EUR',
    'package_weight_kg', 0.5,
    'quantity', 1
  ) AS item_data
)
SELECT
  result->>'deal_status' AS status,
  result->>'is_valid' AS valid,
  result->'validation_issues' AS issues,
  result->'margins'->>'marge_brute_percent' AS margin
FROM (
  SELECT validate_and_calculate_item(
    (SELECT supplier_id FROM supplier),
    gen_random_uuid(),
    (SELECT item_data FROM test_data)
  ) AS result
) t;
EOF
```

### Résultat attendu

```
status | valid | margin | issues
-------+-------+--------+---------------------------------------
bad    | f     | ~5%    | [{"type": "margin_too_low", ...}]
```

**Deal Status**: `bad` car marge < 20% (minimum)

---

## TEST 4: Vérifier l'enregistrement en BDD

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
-- Run validation
WITH supplier AS (
  SELECT supplier_id FROM supplier_registry WHERE api_key_prefix = 'odl_sup_test' LIMIT 1
),
test_data AS (
  SELECT jsonb_build_object(
    'offer_id', gen_random_uuid(),
    'item_id', gen_random_uuid(),
    'product_name', 'Test Persistence',
    'msrp', 199,
    'street_price', 122,
    'promo_price', 99,
    'purchase_price_ht', 60,
    'purchase_currency', 'CHF',
    'package_weight_kg', 0.4,
    'quantity', 1
  ) AS item_data
),
validation AS (
  SELECT validate_and_calculate_item(
    (SELECT supplier_id FROM supplier),
    gen_random_uuid(),
    (SELECT item_data FROM test_data)
  ) AS result
)
-- Check if saved to database
SELECT
  cost_id,
  deal_status,
  marge_brute_percent,
  cogs_total_ht,
  eco_vs_msrp_percent,
  calculated_at
FROM offer_item_calculated_costs
ORDER BY calculated_at DESC
LIMIT 5;
EOF
```

### Résultat attendu

5 lignes correspondant aux 4 tests précédents, avec:
- `cost_id` (UUID)
- `deal_status` (top/good/bad)
- `marge_brute_percent` (calculé automatiquement via GENERATED)
- `cogs_total_ht` (calculé automatiquement)

---

## TEST 5: Vérifier Log Modifications

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
SELECT
  modification_type,
  new_values->>'deal_status' AS status,
  new_values->>'margin_percent' AS margin,
  modified_at
FROM offer_item_modifications_log
ORDER BY modified_at DESC
LIMIT 5;
EOF
```

### Résultat attendu

5 lignes avec `modification_type = 'validate_item'`

---

## TEST 6: Vérifier Notifications (si bad deal)

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
SELECT
  notification_type,
  severity,
  message_key,
  message_params,
  created_at
FROM validation_notifications
WHERE notification_type = 'deal_rejected'
ORDER BY created_at DESC;
EOF
```

### Résultat attendu

1 ligne pour le TEST 3 (deal BAD) avec severity = 'error'

---

## TEST 7: Vérifier Compteur Validations

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
SELECT
  company_name,
  daily_validations_count,
  max_daily_validations,
  last_validation_reset
FROM supplier_registry
WHERE api_key_prefix = 'odl_sup_test';
EOF
```

### Résultat attendu

```
company_name    | daily_validations_count | max_daily_validations
----------------+-------------------------+----------------------
Test Company SA | 4-5                     | 1000
```

---

## TEST 8: Tester Erreurs (Currency manquante)

### Commande

```bash
docker exec supabase_db_odl-tools psql -U postgres -d postgres << 'EOF'
WITH supplier AS (
  SELECT supplier_id FROM supplier_registry WHERE api_key_prefix = 'odl_sup_test' LIMIT 1
),
test_data AS (
  SELECT jsonb_build_object(
    'offer_id', gen_random_uuid(),
    'item_id', gen_random_uuid(),
    'product_name', 'Test Error - JPY',
    'msrp', 199,
    'street_price', 122,
    'promo_price', 99,
    'purchase_price_ht', 10000,
    'purchase_currency', 'JPY',  -- Not supported!
    'package_weight_kg', 0.4
  ) AS item_data
)
SELECT validate_and_calculate_item(
  (SELECT supplier_id FROM supplier),
  gen_random_uuid(),
  (SELECT item_data FROM test_data)
) AS result;
EOF
```

### Résultat attendu

```json
{
  "success": false,
  "error": "Currency rate not available for JPY"
}
```

---

## RÉSUMÉ PHASE 1B

Si tous les tests passent :

- ✅ Fonction `validate_and_calculate_item()` complète
- ✅ Calcul COGS avec tous les coûts
- ✅ Conversion devise avec coefficient sécurité
- ✅ Calcul marges et économies client
- ✅ Détermination deal_status (top/good/almost/bad)
- ✅ Enregistrement en BDD (CONFIDENTIAL)
- ✅ Log modifications (anti-gaming)
- ✅ Notifications si deal rejeté
- ✅ Incrémentation compteur validations
- ✅ Gestion erreurs propre

---

## PROCHAINE ÉTAPE : PHASE 2

Créer API Routes Next.js :
- `POST /api/validate-item` → appelle `validate_and_calculate_item()`
- Authentication via API Key
- Rate limiting
- CORS headers

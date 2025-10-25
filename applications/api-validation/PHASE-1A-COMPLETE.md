# ✅ PHASE 1A TERMINÉE - MIGRATIONS & FONCTIONS BASIQUES

**Date**: 25 octobre 2025
**Status**: ✅ Prêt pour tests locaux

---

## 📦 CE QUI A ÉTÉ CRÉÉ

### **12 Migrations SQL**

| # | Fichier | Description |
|---|---------|-------------|
| 00 | `20251025000000_setup_currency_refresh_cron.sql` | ✅ Currency refresh (EUR/USD/GBP→CHF) |
| 01 | `20251025000001_create_supplier_registry.sql` | ✅ Registry + API Key auth |
| 02 | `20251025000002_create_supplier_users.sql` | ✅ Users audit trail |
| 03 | `20251025000003_create_odeal_business_rules.sql` | ✅ Editable thresholds + coef sécurité |
| 04 | `20251025000004_create_odeal_customs_duty_rates.sql` | ✅ Fallback customs rates |
| 05 | `20251025000005_extend_logistics_rates.sql` | ✅ Weight-based logistics |
| 06 | `20251025000006_create_offer_metadata.sql` | ✅ Offer index |
| 07 | `20251025000007_create_offer_item_calculated_costs.sql` | ✅ CONFIDENTIAL results |
| 08 | `20251025000008_create_offer_financial_projections.sql` | ✅ BEP + risk scores |
| 09 | `20251025000009_create_offer_item_modifications_log.sql` | ✅ Anti-gaming log |
| 10 | `20251025000010_create_validation_notifications.sql` | ✅ Multilingual messages |
| 11 | `20251025000011_create_basic_functions.sql` | ✅ Helper functions |
| 12 | `20251025000012_setup_rls_final.sql` | ✅ RLS verification |

### **10 Fonctions SQL**

| Fonction | Rôle |
|----------|------|
| `verify_supplier_api_key(p_api_key)` | Authentification API Key |
| `reset_daily_supplier_quotas()` | Reset quotas (cron) |
| `get_active_business_rules()` | Récupère règles actives |
| `get_customs_rates_for_subcategory(p_subcategory_id)` | Lookup customs rates |
| `get_logistics_cost_for_weight(p_direction, p_weight_kg)` | Calcul logistics |
| `lookup_product_by_ean(p_ean)` | Auto-fill depuis catalog |
| `convert_to_chf(p_amount, p_currency, p_apply_safety_coef)` | Conversion devise |
| `calculate_payment_fees(p_amount_chf)` | Frais Stripe |
| `log_item_modification(...)` | Log modifications |
| `detect_gaming_attempt(p_user_id, p_item_id)` | Détection gaming |

---

## 🧪 TESTS LOCAUX (PHASE 1A)

### **1. Démarrer Supabase Docker**

```bash
cd ~/Desktop/odl-projects/odl-tools
supabase start
```

**Résultat attendu:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
```

---

### **2. Appliquer les Migrations**

```bash
supabase db reset
```

**Résultat attendu:**
```
Applying migration 20251025000000_setup_currency_refresh_cron.sql...
Applying migration 20251025000001_create_supplier_registry.sql...
...
Applying migration 20251025000012_setup_rls_final.sql...

✓ All validation tables are secured with RLS
✓ Phase 1A - Migrations Complete
```

---

### **3. Vérifier les Tables**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%supplier%'
    OR table_name LIKE '%odeal%'
    OR table_name LIKE '%offer%'
    OR table_name LIKE '%validation%')
ORDER BY table_name;
EOF
```

**Attendu (9 tables):**
```
odeal_business_rules
odeal_customs_duty_rates
offer_financial_projections
offer_item_calculated_costs
offer_item_modifications_log
offer_metadata
supplier_registry
supplier_users
validation_notifications
```

---

### **4. Insérer Supplier Test**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
WITH key_data AS (
  SELECT
    gen_random_uuid() AS supplier_id,
    'odl_sup_test_abc123xyz456' AS api_key,
    'Test Company SA' AS company_name
)
INSERT INTO supplier_registry (
  supplier_id,
  company_name,
  api_key_hash,
  api_key_prefix,
  validation_status,
  is_active
)
SELECT
  supplier_id,
  company_name,
  encode(digest(api_key, 'sha256'), 'hex') AS api_key_hash,
  'odl_sup_test' AS api_key_prefix,
  'approved',
  true
FROM key_data
RETURNING
  supplier_id,
  company_name,
  api_key_prefix,
  validation_status;
EOF
```

**⚠️ COPIER LE `supplier_id` RETOURNÉ !**

---

### **5. Tester API Key**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
SELECT
  supplier_id,
  is_valid,
  error_message,
  company_name
FROM verify_supplier_api_key('odl_sup_test_abc123xyz456');
EOF
```

**Attendu:**
```
 supplier_id                          | is_valid | error_message | company_name
--------------------------------------+----------+---------------+--------------
 <uuid>                               | t        | <null>        | Test Company SA
```

---

### **6. Vérifier Business Rules**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
SELECT
  deal_min_eco_vs_msrp_percent,
  target_gross_margin_percent,
  currency_safety_coefficient
FROM get_active_business_rules();
EOF
```

**Attendu:**
```
 deal_min_eco | target_margin | currency_coef
--------------+---------------+--------------
 30           | 30            | 1.02
```

---

### **7. Insérer Taux de Change Test**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
INSERT INTO currency_change (date, base, quote, rate, fetched_at)
VALUES
  (CURRENT_DATE, 'EUR', 'CHF', 0.9248, NOW()),
  (CURRENT_DATE, 'USD', 'CHF', 0.7964, NOW()),
  (CURRENT_DATE, 'GBP', 'CHF', 1.0598, NOW());

SELECT base, quote, rate, fetched_at FROM currency_change ORDER BY base;
EOF
```

---

### **8. Tester Conversion Devise**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
-- 90 EUR → CHF avec coef sécurité (1.02)
SELECT convert_to_chf(90, 'EUR', true) AS price_chf;
EOF
```

**Attendu:**
```
 price_chf
-----------
 84.90  -- (90 × 0.9248 × 1.02)
```

---

### **9. Tester Lookup EAN**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
-- Insérer produit test
INSERT INTO products_catalog (
  ean, product_name, msrp_chf, street_price_chf,
  package_weight_kg, tar_rate_ht
)
VALUES (
  '7640129881234',
  'Samsung Galaxy Buds3 Pro',
  199, 122, 0.05, 2.50
)
ON CONFLICT DO NOTHING;

-- Test lookup
SELECT lookup_product_by_ean('7640129881234');
EOF
```

**Attendu:**
```json
{
  "found": true,
  "data": {
    "ean": "7640129881234",
    "product_name": "Samsung Galaxy Buds3 Pro",
    ...
  }
}
```

---

### **10. Tester Logistics**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
-- Lookup cost for 0.5 kg outbound
SELECT
  carrier,
  base_cost,
  handling_fee,
  total_cost
FROM get_logistics_cost_for_weight('outbound', 0.5);
EOF
```

**Attendu:**
```
 carrier     | base_cost | handling_fee | total_cost
-------------+-----------+--------------+------------
 Swiss Post  | 6.90      | 1.50         | 8.40
```

---

## ✅ CHECKLIST PHASE 1A

Avant de passer à Phase 1B :

- [ ] Supabase Docker démarré sans erreur
- [ ] 12 migrations appliquées (db reset OK)
- [ ] 9 tables créées
- [ ] Supplier test créé avec API key
- [ ] API key vérifiée = valid
- [ ] Business rules avec coef 1.02
- [ ] Taux de change insérés (EUR/USD/GBP)
- [ ] Conversion 90 EUR = ~84.90 CHF
- [ ] Lookup EAN fonctionne (ou table vide OK)
- [ ] Logistics cost pour 0.5kg = 8.40 CHF

---

## ⏭️ PROCHAINE ÉTAPE : PHASE 1B

Une fois tous ces tests OK, on passe à **Phase 1B** :

**Je créerai :**
- ✅ Migration 13 : `validate_and_calculate_item()` fonction complète
- ✅ Migration 14 : `validate_and_calculate_variant()` fonction variantes

**Tu testeras :**
- Validation item simple
- Validation item avec variantes
- Calculs COGS complets
- Deal status (top/good/almost/bad)

---

## 🆘 EN CAS DE PROBLÈME

### **Erreur : Table already exists**
```bash
supabase db reset  # Force reset
```

### **Erreur : Function does not exist**
Vérifier que migration 11 est bien appliquée :
```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
\df lookup_product_by_ean
EOF
```

### **Logs Supabase**
```bash
supabase status
docker logs supabase_db_supabase-local_1 --tail 50
```

---

**🎉 Félicitations ! Phase 1A terminée. Confirme que tous les tests passent et on enchaîne sur Phase 1B !**

# 🧪 TESTS LOCAUX MODULE VALIDATION

**Environnement**: Docker Supabase Local

---

## 🚀 DÉMARRER ENVIRONNEMENT LOCAL

```bash
cd ~/Desktop/odl-projects/odl-tools

# Démarrer Supabase Docker
supabase start

# Résultat attendu :
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
```

---

## 📥 APPLIQUER MIGRATIONS

```bash
# Reset complet + migrations
supabase db reset

# OU appliquer nouvelles migrations uniquement
supabase db push

# Vérifier status
supabase status
```

---

## 🔍 TESTS SQL DIRECTS

### **Test 1 : Vérifier tables créées**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
-- Lister toutes les tables validation
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%supplier%' OR table_name LIKE '%odeal%'
ORDER BY table_name;
EOF
```

**Attendu** :
```
supplier_registry
supplier_users
odeal_business_rules
odeal_customs_duty_rates
offer_item_calculated_costs
offer_financial_projections
offer_item_modifications_log
validation_notifications
```

---

### **Test 2 : Insérer supplier de test**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
-- Générer API Key test
WITH key_data AS (
  SELECT
    gen_random_uuid() AS supplier_id,
    'odl_sup_test_abc123xyz456' AS api_key,
    'Test Company' AS company_name
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
RETURNING supplier_id, company_name, api_key_prefix;
EOF
```

**Note** : Copier le `supplier_id` retourné pour tests suivants

---

### **Test 3 : Vérifier API Key**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
SELECT *
FROM verify_supplier_api_key('odl_sup_test_abc123xyz456');
EOF
```

**Attendu** :
```
supplier_id | is_valid | error_message | company_name
------------+----------+---------------+--------------
<uuid>      | t        | <null>        | Test Company
```

---

### **Test 4 : Business Rules actives**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
SELECT
  deal_min_eco_vs_msrp_percent,
  target_gross_margin_percent,
  currency_safety_coefficient
FROM get_active_business_rules();
EOF
```

**Attendu** :
```
deal_min_eco | target_margin | currency_coef
-------------+---------------+--------------
30           | 30            | 1.02
```

---

### **Test 5 : Taux de change**

```bash
psql -h localhost -p 54322 -U postgres -d postgres << 'EOF'
-- Insérer taux test
INSERT INTO currency_change (date, base, quote, rate, fetched_at)
VALUES
  (CURRENT_DATE, 'EUR', 'CHF', 0.9248, NOW()),
  (CURRENT_DATE, 'USD', 'CHF', 0.7964, NOW()),
  (CURRENT_DATE, 'GBP', 'CHF', 1.0598, NOW());

-- Vérifier
SELECT base, quote, rate FROM currency_change ORDER BY base;
EOF
```

---

### **Test 6 : Lookup EAN (si products_catalog existe)**

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
ON CONFLICT (ean) DO NOTHING;

-- Test lookup
SELECT lookup_product_by_ean('7640129881234');
EOF
```

---

## 🌐 TESTS API NEXT.JS LOCAL

### **Démarrer Next.js local**

```bash
# Terminal 1 : Supabase déjà running
# Terminal 2 : Next.js
cd ~/Desktop/odl-projects/odl-tools

# Configurer .env.local pour pointer vers Docker
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_supabase_start>
SUPABASE_SERVICE_ROLE_KEY=<service_key_from_supabase_start>
NEXT_PUBLIC_SITE_URL=http://localhost:3001
EOF

# Démarrer
npm run dev
```

### **Test API validate-item**

```bash
# Récupérer supplier_id du Test 2
export SUPPLIER_ID="<uuid-from-test-2>"

curl -X POST http://localhost:3001/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-Supplier-API-Key: odl_sup_test_abc123xyz456" \
  -d '{
    "offer_id": "00000000-0000-0000-0000-000000000001",
    "user_id": "00000000-0000-0000-0000-000000000002",
    "supplier_id": "'$SUPPLIER_ID'",
    "item_data": {
      "ean": "7640129881234",
      "name": "Samsung Galaxy Buds3 Pro",
      "subcategory_id": "s20",
      "msrp": 199,
      "street_price": 122,
      "promo_price": 100,
      "purchase_price_ht": 90,
      "purchase_currency": "EUR",
      "quantity": 200,
      "weight_kg": 0.05,
      "length_cm": 18.1,
      "width_cm": 33.2,
      "height_cm": 19.8,
      "have_battery": true,
      "battery_type": "lithium_ion_rechargeable"
    }
  }' | python3 -m json.tool
```

**Attendu** :
```json
{
  "success": true,
  "deal_status": "top",
  "is_valid": true,
  "eco_client_vs_MSRP_percent": 49.7,
  "eco_client_vs_StreetPrice_percent": 18.0,
  "validation_message_key": "deal_excellent"
}
```

---

## 🛠️ DEBUGGING

### **Voir logs SQL**

```bash
# Logs Supabase
supabase logs --db

# Logs API
docker logs supabase_rest_supabase-local_1 --tail 50
```

### **Accès Studio**

```
URL: http://localhost:54323
Login: Pas de login requis en local
```

### **Reset complet**

```bash
supabase stop
supabase start
supabase db reset
```

---

## ✅ CHECKLIST VALIDATION

Avant de push en production :

- [ ] Toutes migrations appliquées sans erreur
- [ ] Supplier test créé avec API key
- [ ] API Key vérifiée OK
- [ ] Business rules chargées
- [ ] Taux de change insérés
- [ ] Lookup EAN fonctionne (si applicable)
- [ ] API validate-item retourne success
- [ ] Calculs cohérents (marges, économies)

---

## 🚀 PUSH PRODUCTION

Une fois tous tests OK en local :

```bash
# Push migrations vers Cloud
supabase db push --db-url "postgresql://postgres.xewnzetqvrovqjcvwkus:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Build production
npm run build

# Deploy container
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
cd /root
docker-compose -f docker-compose.odl.yml build --no-cache odl-tools-app
docker-compose -f docker-compose.odl.yml up -d odl-tools-app
```

---

**Prochaine étape** : Une fois tests locaux OK, documenter intégration WeWeb

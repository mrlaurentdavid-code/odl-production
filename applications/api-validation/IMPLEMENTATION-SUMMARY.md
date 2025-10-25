# 📋 MODULE VALIDATION O!DEAL - RÉSUMÉ IMPLÉMENTATION

**Date**: 25 octobre 2025
**Status**: ✅ Architecture validée - En cours d'implémentation

---

## 🎯 ARCHITECTURE FINALE VALIDÉE

```
WeWeb Frontend (Supabase WeWeb BDD)
    ↓
    API Request + X-Supplier-API-Key
    ↓
Next.js ODL-TOOLS (/api/validate-item)
    ↓
    Vérifie API Key (SQL function)
    ↓
    Service Role Key (côté serveur)
    ↓
Supabase ODL-TOOLS
    ↓
validate_and_calculate_item()
    ↓
Retour: deal_status, économies, validation
```

---

## ✅ FICHIERS CRÉÉS

### **1. Edge Function Currency (Complet)**
- ✅ `supabase/functions/refresh-currency/index.ts`
- ✅ `supabase/functions/refresh-currency/README.md`
- ✅ `supabase/migrations/20251025000000_setup_currency_refresh_cron.sql`

**Features**:
- Taux EUR/USD/GBP → CHF
- Refresh quotidien à 2h AM via pg_cron
- Source: Frankfurter API (gratuit, taux BCE)

### **2. Migrations SQL (En cours)**
- ✅ `20251025000001_create_supplier_registry.sql`
- ✅ `20251025000002_create_supplier_users.sql`
- ✅ `20251025000003_create_odeal_business_rules.sql`
- ⏳ `20251025000004_create_odeal_customs_duty_rates.sql`
- ⏳ `20251025000005_extend_logistics_rates.sql`
- ⏳ `20251025000006_create_offer_metadata.sql`
- ⏳ `20251025000007_create_offer_item_calculated_costs.sql`
- ⏳ `20251025000008_create_offer_financial_projections.sql`
- ⏳ `20251025000009_create_offer_item_modifications_log.sql`
- ⏳ `20251025000010_create_validation_notifications.sql`
- ⏳ `20251025000011_create_validation_functions.sql`
- ⏳ `20251025000012_setup_rls_policies.sql`

### **3. API Routes Next.js (À créer)**
- ⏳ `app/api/validate-item/route.ts`
- ⏳ `app/api/validate-variant/route.ts`
- ⏳ `app/api/calculate-projection/route.ts`

### **4. N8N Workflows (À documenter)**
- ⏳ Workflow: Generate Supplier API Key
- ⏳ Workflow: Sync Supplier + Users to ODL-TOOLS

---

## 📊 TABLES CRÉÉES

### **Tables Auth & Registry**
| Table | Rôle | Status |
|-------|------|--------|
| `supplier_registry` | Auth API Key + rate limiting | ✅ Créée |
| `supplier_users` | Granular audit trail | ✅ Créée |

### **Tables Business Rules**
| Table | Rôle | Status |
|-------|------|--------|
| `odeal_business_rules` | Seuils validation éditables | ✅ Créée |
| `odeal_customs_duty_rates` | Fallback taux douane | ⏳ À créer |

### **Tables Résultats (CONFIDENTIELLES)**
| Table | Rôle | Status |
|-------|------|--------|
| `offer_metadata` | Index offres | ⏳ À créer |
| `offer_item_calculated_costs` | Résultats détaillés | ⏳ À créer |
| `offer_financial_projections` | BEP + risk scores | ⏳ À créer |
| `offer_item_modifications_log` | Anti-gaming audit | ⏳ À créer |

### **Tables Support**
| Table | Rôle | Status |
|-------|------|--------|
| `validation_notifications` | Messages multilingues | ⏳ À créer |
| `logistics_rates` (extended) | Paliers poids | ⏳ À étendre |

---

## 🔧 FONCTIONS SQL À CRÉER

### **Authentification**
- ✅ `verify_supplier_api_key(p_api_key)`
- ✅ `reset_daily_supplier_quotas()`

### **Validation Core**
- ⏳ `lookup_product_by_ean(p_ean)`
- ⏳ `validate_and_calculate_item(p_offer_id, p_user_id, p_supplier_id, p_item_data)`
- ⏳ `validate_and_calculate_variant(p_offer_id, p_master_item_id, p_user_id, p_supplier_id, p_variant_data)`

### **Projections Financières**
- ⏳ `calculate_offer_projection(p_offer_id)`
- ⏳ `get_offer_projection(p_offer_id)`

### **Anti-Gaming**
- ⏳ `track_item_modification(p_offer_id, p_item_id, p_user_id, p_modification_type, p_old_values, p_new_values)`

---

## 📋 CONFIGURATION BUSINESS RULES (Éditable)

| Paramètre | Valeur Défaut | Description |
|-----------|---------------|-------------|
| `deal_min_eco_vs_msrp_percent` | 30% | Économie min vs MSRP |
| `deal_min_eco_vs_street_price_percent` | 15% | Économie min vs Street Price |
| `target_gross_margin_percent` | 30% | Marge brute cible |
| `minimum_gross_margin_percent` | 20% | Marge brute minimale |
| `maximum_gross_margin_percent` | 50% | Marge brute maximale |
| **`currency_safety_coefficient`** | **1.02** | **Coefficient sécurité devise (2%)** |
| `payment_processing_fee_percent` | 2.9% | Frais Stripe (%) |
| `payment_processing_fee_fixed_chf` | 0.30 CHF | Frais Stripe (fixe) |
| `max_price_modifications_per_item` | 3 | Max modifs prix/item |
| `price_modification_time_window_minutes` | 15 min | Fenêtre temps modifs |

---

## 🔐 SÉCURITÉ

### **API Key System**
- Générée par N8N lors validation supplier
- Stockée hashée (SHA256) dans `supplier_registry`
- Format: `odl_sup_` + 32 chars hex
- Jamais exposée côté client (backend WeWeb uniquement)

### **Double Vérification**
1. ✅ API Key valide (verify_supplier_api_key)
2. ✅ supplier_id dans body = supplier_id de l'API key
3. ✅ user_id existe dans supplier_users
4. ✅ user_id appartient à supplier_id
5. ✅ Permissions user (can_validate_items)
6. ✅ Quotas journaliers non dépassés

### **RLS (Row Level Security)**
- ✅ Toutes tables sensibles: `DENY ALL`
- ✅ Accès uniquement via fonctions `SECURITY DEFINER`
- ✅ Fournisseurs ne voient JAMAIS les coûts/marges

---

## 🚀 FLOW VALIDATION

### **1. Admin valide supplier (WeWeb)**
```
1. Admin approuve supplier
2. WeWeb trigger N8N webhook
3. N8N génère API Key
4. N8N sync ODL-TOOLS (supplier_registry + supplier_users)
5. N8N retourne API Key à WeWeb
6. WeWeb stocke API Key (variable backend)
```

### **2. Fournisseur crée item (WeWeb)**
```javascript
// WeWeb Frontend
const result = await fetch('https://app.odl-tools.ch/api/validate-item', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Supplier-API-Key': SUPPLIER_API_KEY  // Variable backend
  },
  body: JSON.stringify({
    offer_id: offer.id,
    user_id: currentUser.id,
    supplier_id: currentSupplier.id,
    item_data: { ... }
  })
})
```

### **3. Validation (ODL-TOOLS)**
```
1. API Gateway vérifie API Key
2. Vérifie supplier_id match
3. Appelle validate_and_calculate_item()
4. Calcul COGS (Purchase + Logistics + Customs + TAR + PESA + Fees)
5. Calcul marges (Promo Price - COGS)
6. Calcul économies (MSRP/Street - Promo)
7. Validation vs business rules
8. Stockage résultats (CONFIDENTIEL)
9. Retour public: deal_status, éco%, message
```

### **4. Retour WeWeb**
```json
{
  "success": true,
  "deal_status": "top",
  "is_valid": true,
  "eco_client_vs_MSRP_percent": 35.2,
  "eco_client_vs_StreetPrice_percent": 22.1,
  "validation_message_key": "deal_excellent"
}
```

---

## 📐 FORMULES DE CALCUL

### **1. Conversion Devise (avec coefficient sécurité)**
```
purchase_price_chf = purchase_price_ht × currency_rate × currency_safety_coefficient

Exemple:
90 EUR × 0.9248 (taux) × 1.02 (coef) = 84.90 CHF
```

### **2. COGS Total**
```
COGS = Purchase Price CHF
     + Logistics Inbound
     + Logistics Outbound
     + Customs Duty
     + TAR
     + PESA
     + Warranty Cost
     + Payment Processing Fees
```

### **3. Marge Brute**
```
Marge Brute % = ((Promo Price - COGS) / Promo Price) × 100
```

### **4. Économie Client**
```
Éco vs MSRP % = ((MSRP - Promo Price) / MSRP) × 100
Éco vs Street % = ((Street Price - Promo Price) / Street Price) × 100
```

### **5. Deal Status**
```
IF marge >= target (30%) AND éco >= deal_min + 5% (35%)
  → deal_status = "top"

ELSIF marge >= minimum (20%) AND éco >= deal_min (30%)
  → deal_status = "good"

ELSIF marge >= minimum - 5% (15%)
  → deal_status = "almost"

ELSE
  → deal_status = "bad"
```

---

## 🧪 TESTS À CRÉER

### **Test 1: Lookup EAN**
```sql
SELECT lookup_product_by_ean('7640129881234');
-- Attendu: {found: true, data: {...}}
```

### **Test 2: Validation Item Simple**
```sql
SELECT validate_and_calculate_item(
  p_offer_id := 'test-offer-uuid',
  p_user_id := 'test-user-uuid',
  p_supplier_id := 'test-supplier-uuid',
  p_item_data := '{"msrp": 199, "promo_price": 100, ...}'::jsonb
);
-- Attendu: {success: true, deal_status: "top", ...}
```

### **Test 3: API Key Invalid**
```bash
curl -X POST https://app.odl-tools.ch/api/validate-item \
  -H "X-Supplier-API-Key: invalid_key" \
  -d '{"offer_id": "..."}'

# Attendu: 401 Unauthorized
```

### **Test 4: User Mismatch**
```sql
-- User A essaie de valider pour Supplier B
-- Attendu: error_code = "USER_SUPPLIER_MISMATCH"
```

---

## 📦 DÉPLOIEMENT

### **Étape 1: Migrations SQL**
```bash
cd ~/Desktop/odl-projects/odl-tools
supabase db push
```

### **Étape 2: Edge Function Currency**
```bash
supabase functions deploy refresh-currency
```

### **Étape 3: Build Next.js**
```bash
npm run build
docker-compose -f docker-compose.odl.yml build --no-cache odl-tools-app
```

### **Étape 4: Deploy Container**
```bash
ssh -i ~/.ssh/claude_temp_key root@31.97.193.159
cd /root
docker-compose -f docker-compose.odl.yml up -d odl-tools-app
```

### **Étape 5: Sync Premier Supplier (N8N)**
```bash
# Trigger N8N pour sync supplier de test
curl -X POST https://n8n.odl-tools.ch/webhook/supplier-approved \
  -H "Content-Type: application/json" \
  -d '{"supplier_id": "test-supplier-uuid"}'
```

---

## ⏭️ PROCHAINES ÉTAPES

1. ⏳ Finir migrations SQL (4-12)
2. ⏳ Créer fonction `validate_and_calculate_item()` complète
3. ⏳ Créer API Route Next.js
4. ⏳ Créer N8N workflow génération API Key
5. ⏳ Tests end-to-end
6. ⏳ Documentation WeWeb integration

---

**Status**: 🟡 40% Complete - Architecture validée, migrations core créées

# Mapping WeWeb → API O!Deal Validation

## 🎯 Architecture

**WeWeb Database** → HTTP POST → **API O!Deal** (`https://api.odl-tools.ch/api/validate-item`)

Les deux bases de données sont **séparées**. WeWeb envoie les données brutes, l'API calcule et retourne les résultats.

---

## 📋 Mapping des Champs

### Champs Obligatoires

| WeWeb DB | Champ API | Source Table | Notes |
|----------|-----------|--------------|-------|
| `offer_id` | `offer_id` | `offer_items` | ✅ Identique |
| `item_id` | `item_id` | `offer_items` | ✅ Identique |
| `name` | `product_name` | `offer_items` | ⚠️ **MAPPING** |
| `msrp` | `msrp` | `offer_items` | ✅ Identique |
| `street_price` | `street_price` | `offer_items` | ✅ Identique |
| `promo_price` | `promo_price` | `offer_items` | ✅ Identique |
| `supplier_cost` | `purchase_price_ht` | `offer_items` | ⚠️ **MAPPING** |
| `subcategory_id` | `subcategory_id` | `offer_items` | ✅ Identique |

### Champs Optionnels mais Importants

| WeWeb DB | Champ API | Source Table | Notes |
|----------|-----------|--------------|-------|
| `ean` | `ean` | `offer_items` | ✅ Identique |
| `weight_kg` | `package_weight_kg` | `offer_items` | ⚠️ **MAPPING** |
| `length_cm` | `length_cm` | `offer_items` | ✅ Identique |
| `width_cm` | `width_cm` | `offer_items` | ✅ Identique |
| `height_cm` | `height_cm` | `offer_items` | ✅ Identique |
| `contains_battery` | `has_battery` | `offer_items` | ⚠️ **MAPPING** |
| `battery_type` | `battery_type` | `offer_items` | ✅ Identique |
| `tar_fee` | `tar_ht` | `offer_items` | ⚠️ **MAPPING** |
| `reserved_stock` | `quantity` | `offer_items` | ⚠️ **MAPPING** |
| `shipping_origin` | `shipping_origin` | **`offers`** | ⚠️ **JOIN REQUIS** |

### Champs Auto-Détectés par l'API

| Champ API | Source | Logique |
|-----------|--------|---------|
| `contain_electronic` | Auto | Si `subcategory_id` in ['s20','s21','s22','s23','s24','s25','s26','s27','s42','s63'] |
| `category_id` | Auto | Déduit depuis `subcategory_id` via lookup |
| `purchase_currency` | Défaut | `"EUR"` si non fourni |

---

## 📤 Exemple de Payload WeWeb → API

### Requête SQL WeWeb

```sql
SELECT
  -- Depuis offer_items
  oi.offer_id,
  oi.item_id,
  oi.name,  -- À envoyer comme "product_name"
  oi.ean,
  oi.subcategory_id,
  oi.msrp,
  oi.street_price,
  oi.promo_price,
  oi.supplier_cost,  -- À envoyer comme "purchase_price_ht"
  oi.weight_kg,  -- À envoyer comme "package_weight_kg"
  oi.length_cm,
  oi.width_cm,
  oi.height_cm,
  oi.contains_battery,  -- À envoyer comme "has_battery"
  oi.battery_type,
  oi.tar_fee,  -- À envoyer comme "tar_ht"
  oi.reserved_stock,  -- À envoyer comme "quantity"

  -- Depuis offers (JOIN REQUIS)
  o.shipping_origin,
  o.supplier_id

FROM offer_items oi
JOIN offers o ON oi.offer_id = o.offer_id
WHERE oi.item_id = $item_id
```

### Payload JSON à Envoyer

```json
{
  "offer_id": "46b5d72d-6583-4916-a922-a0dd94345d60",
  "item_id": "8806095651675",
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",

  "product_name": "Ecouteurs sans fil Samsung Galaxy Buds3 Pro",
  "ean": "8806095651675",
  "subcategory_id": "s22",

  "msrp": 210,
  "street_price": 190,
  "promo_price": 150,
  "purchase_price_ht": 100,
  "purchase_currency": "EUR",

  "package_weight_kg": 0.3,
  "length_cm": 15,
  "width_cm": 5,
  "height_cm": 15,

  "shipping_origin": "HR",

  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable",

  "tar_ht": 0.46,

  "quantity": 1000
}
```

**OU** avec les noms WeWeb (l'API accepte les deux) :

```json
{
  "offer_id": "46b5d72d-6583-4916-a922-a0dd94345d60",
  "item_id": "8806095651675",
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",

  "name": "Ecouteurs sans fil Samsung Galaxy Buds3 Pro",
  "ean": "8806095651675",
  "subcategory_id": "s22",

  "msrp": 210,
  "street_price": 190,
  "promo_price": 150,
  "supplier_cost": 100,
  "purchase_currency": "EUR",

  "weight_kg": 0.3,
  "length_cm": 15,
  "width_cm": 5,
  "height_cm": 15,

  "shipping_origin": "HR",

  "contains_battery": true,
  "battery_type": "lithium_ion_rechargeable",

  "tar_fee": 0.46,

  "reserved_stock": 1000
}
```

**Les deux formats fonctionnent !** ✅

---

## 📥 Réponse API → WeWeb

### Structure de la Réponse

```json
{
  "success": true,
  "is_valid": false,
  "deal_status": "bad",
  "cost_id": "43e8a20a-7b66-4e59-b6c4-df8dbf64e16e",
  "generated_item_id": "06b7f1b8-c25c-40c2-8008-747ce5c2ddbb",

  "item_details": {
    "item_id": "8806095651675",
    "ean": "8806095651675",
    "product_name": "Samsung Galaxy Buds3 Pro",
    "category_id": "c3",
    "category_name": "electronics_and_hightech",
    "subcategory_id": "s22",
    "subcategory_name": "image_sound"
  },

  "pricing": {
    "msrp": 210,
    "street_price": 190,
    "promo_price": 150,
    "purchase_price_original": 100,
    "purchase_currency": "EUR",
    "currency_rate": 0.9248
  },

  "costs": {
    "purchase_price_chf_ht": 102.0,
    "pesa_fee_total": 6200.0,
    "pesa_fee_per_unit": 6.2,
    "tar_ht": 0.46,
    "logistics_total_ht": 12.5,
    "cogs_ht": 123.71
  },

  "margins": {
    "marge_brute_ht": 15.05,
    "marge_brute_percent": 10.85
  },

  "applied_rule": {
    "rule_id": "dc0fe63e-b04e-40e7-9337-c8bda1292d02",
    "rule_name": "Global Default Rules",
    "scope": "global"
  },

  "validation_issues": [
    "Import from HR - PESA fees applied: CHF 6200.00 total (CHF 6.20 per unit)",
    "Margin 10.85% is below minimum threshold (20.00%)"
  ]
}
```

### Mapping Réponse API → Table WeWeb `offer_item_calculated_costs`

```sql
INSERT INTO offer_item_calculated_costs (
  item_id,  -- item_id de la requête

  -- Coûts
  tar_fee_ht,  -- response.costs.tar_ht
  logistics_inbound_ht,  -- response.costs.logistics_total_ht (à splitter si besoin)
  logistics_outbound_ht,  -- idem
  customs_cost_ht,  -- 0 dans notre cas
  purchase_price_ht,  -- response.costs.purchase_price_chf_ht
  cogs_total_ht,  -- response.costs.cogs_ht

  -- Pricing
  promo_price_ht,  -- response.pricing.promo_price / 1.081
  msrp_ttc,  -- response.pricing.msrp
  street_price_ttc,  -- response.pricing.street_price

  -- Marges
  marge_brute_ht,  -- response.margins.marge_brute_ht
  marge_brute_percent,  -- response.margins.marge_brute_percent

  -- Éco-scores
  eco_vs_msrp_percent,  -- Calculer depuis pricing
  eco_vs_street_percent,  -- Calculer depuis pricing

  -- Status
  deal_status,  -- response.deal_status ('top'|'good'|'almost'|'bad')

  -- Validations
  eco_client_validated,  -- true si deal_status in ('top','good')
  margin_odeal_validated,  -- true si is_valid = true

  -- Metadata
  calculated_at,  -- NOW()
  calculated_by  -- user_id de la session
)
VALUES (...)
```

---

## 🔧 Configuration WeWeb

### Endpoint API

```
POST https://api.odl-tools.ch/api/validate-item
```

### Headers Requis

```
Content-Type: application/json
X-API-Key: odl_sup_ohmex_demo_2025
```

### Codes de Retour

| Code | Signification | Action WeWeb |
|------|---------------|--------------|
| 200 | Validation réussie | Stocker résultats dans `offer_item_calculated_costs` |
| 400 | Données invalides | Afficher erreur à l'utilisateur |
| 401 | API Key invalide | Vérifier configuration |
| 500 | Erreur serveur | Réessayer ou contacter support |

---

## ⚠️ Points d'Attention

### 1. **JOIN Requis pour `shipping_origin`**

```sql
-- ❌ INCORRECT
SELECT * FROM offer_items WHERE item_id = $id
-- shipping_origin n'existe pas dans offer_items

-- ✅ CORRECT
SELECT oi.*, o.shipping_origin
FROM offer_items oi
JOIN offers o ON oi.offer_id = o.offer_id
WHERE oi.item_id = $id
```

### 2. **Subcategory DOIT Être Correcte**

- Écouteurs/Casques → `s22` (Image & Son)
- Smartphones → `s20` (Téléphonie)
- Ordinateurs → `s21` (Informatique)

**Voir** : `SUBCATEGORY_CONFIRMATION_DB.md` pour la liste complète

### 3. **Champs Batterie**

Si `contains_battery = true`, alors `battery_type` est **OBLIGATOIRE** :
- `"lithium_ion_rechargeable"` (le plus courant)
- `"alkaline_disposable"`
- `"nimh_rechargeable"`
- `"lithium_polymer"`

### 4. **Currency**

Si `purchase_currency` n'est pas fourni, l'API assume `"EUR"`.

Pour d'autres devises :
- `"CHF"` (Franc Suisse)
- `"USD"` (Dollar US)
- `"GBP"` (Livre Sterling)

---

## 🧪 Test Complet

### 1. Test avec Noms WeWeb

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_ohmex_demo_2025" \
  -d '{
    "offer_id": "test-001",
    "item_id": "test-item-001",
    "name": "Test Product",
    "subcategory_id": "s22",
    "msrp": 200,
    "street_price": 180,
    "promo_price": 150,
    "supplier_cost": 100,
    "weight_kg": 0.5,
    "contains_battery": true,
    "battery_type": "lithium_ion_rechargeable",
    "shipping_origin": "HR",
    "reserved_stock": 10
  }'
```

### 2. Test avec Noms API

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_ohmex_demo_2025" \
  -d '{
    "offer_id": "test-001",
    "item_id": "test-item-001",
    "product_name": "Test Product",
    "subcategory_id": "s22",
    "msrp": 200,
    "street_price": 180,
    "promo_price": 150,
    "purchase_price_ht": 100,
    "package_weight_kg": 0.5,
    "has_battery": true,
    "battery_type": "lithium_ion_rechargeable",
    "shipping_origin": "HR",
    "quantity": 10
  }'
```

**Les deux formats retournent le même résultat !** ✅

---

## 📚 Documents de Référence

- **Subcategories** : `SUBCATEGORY_CONFIRMATION_DB.md`
- **TAR Mapping** : `SUBCATEGORY_TAR_MAPPING.md`
- **Corrections Urgentes** : `WEWEB_CORRECTIONS_URGENTES.md`
- **Guide Complet** : `WEWEB_SUBCATEGORY_GUIDE.md`

---

## 📅 Dernière Mise à Jour

**Date** : 2025-10-27
**Version** : 2.0
**Statut** : ✅ Mapping bidirectionnel confirmé et testé

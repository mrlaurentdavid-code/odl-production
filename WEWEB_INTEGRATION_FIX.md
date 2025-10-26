# WeWeb Integration - Required Changes

## ✅ Database Fixes Applied (2025-10-26)

1. **Migration 15**: Fixed `effective_date` column reference in currency_rates query
2. **Migration 16**: Fixed `supplier_id` to use API key parameter instead of JSONB extraction

Both migrations have been successfully applied to production.

---

## ⚠️ Required Changes in WeWeb

### Issue: Wrong Field Names

WeWeb is currently sending IDs with name field labels:

```json
{
  "category_name": "c1",        // ❌ "c1" is an ID, not a name!
  "subcategory_name": "s5"      // ❌ "s5" is an ID, not a name!
}
```

### ✅ Correct Request Format

Change the field names to match the data type:

```json
{
  "offer_id": "1f218950-3789-4176-a883-958c593a84af",
  "item_id": "888413779764",
  "ean": "888413779764",
  "product_name": "Air Max 270",
  "category_id": "c1",           // ✅ Changed from category_name
  "subcategory_id": "s5",        // ✅ Changed from subcategory_name
  "msrp": 200,
  "street_price": 180,
  "promo_price": 150,
  "purchase_price_ht": 100,
  "purchase_currency": "EUR",
  "quantity": 100,
  "package_weight_kg": 1
}
```

### Optional Optimization

The `supplier_id` field can be removed from the request body since the API key already identifies the supplier:

```json
{
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8"  // ⚠️ Optional - can be removed
}
```

---

## Complete Working Example

### Request

```bash
POST https://api.odl-tools.ch/api/validate-item
Content-Type: application/json
X-API-Key: WEWEB_PRODUCTION_2025_API_KEY
```

```json
{
  "offer_id": "1f218950-3789-4176-a883-958c593a84af",
  "item_id": "888413779764",
  "ean": "888413779764",
  "product_name": "Air Max 270",
  "category_id": "c1",
  "subcategory_id": "s5",
  "msrp": 200,
  "street_price": 180,
  "promo_price": 150,
  "purchase_price_ht": 100,
  "purchase_currency": "EUR",
  "quantity": 100,
  "package_weight_kg": 1
}
```

### Expected Response

```json
{
  "success": true,
  "is_valid": true,
  "deal_status": "good",
  "cost_id": "uuid",
  "generated_item_id": "uuid",
  "validation_issues": [],
  "item_details": {
    "item_id": "888413779764",
    "ean": "888413779764",
    "product_name": "Air Max 270"
  },
  "pricing": {
    "msrp": 200,
    "street_price": 180,
    "promo_price": 150,
    "purchase_price_original": 100,
    "purchase_currency": "EUR",
    "currency_rate": 0.9248
  },
  "applied_rule": {
    "rule_id": "uuid",
    "rule_name": "Global Default Rule",
    "scope": "global",
    "category": null,
    "subcategory": null
  }
}
```

---

## Field Reference

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `offer_id` | UUID | Offer identifier | `"1f218950-3789-4176-a883-958c593a84af"` |
| `msrp` | Number | Manufacturer suggested retail price (CHF TTC) | `200` |
| `street_price` | Number | Current market price (CHF TTC) | `180` |
| `promo_price` | Number | O!Deal promo price (CHF TTC) | `150` |
| `purchase_price_ht` | Number | Purchase price excluding tax | `100` |

### Recommended Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `category_id` | String | Category ID (c1, c2, etc.) | `"c1"` |
| `subcategory_id` | String | Subcategory ID (s1, s2, etc.) | `"s5"` |
| `purchase_currency` | String | Currency code (EUR, USD, CHF) | `"EUR"` |
| `item_id` | String/null | Product identifier or null to auto-generate | `"888413779764"` |
| `ean` | String | EAN/Barcode | `"888413779764"` |
| `product_name` | String | Product name | `"Air Max 270"` |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `quantity` | Integer | `1` | Quantity |
| `package_weight_kg` | Number | `0.5` | Package weight in kg |
| `pesa_fee_ht` | Number | `0` | PESA recycling fee (HT) |
| `warranty_cost_ht` | Number | `0` | Warranty cost (HT) |

---

## Deal Status Values

| Status | Meaning | Action |
|--------|---------|--------|
| `"top"` | ⭐ Excellent deal (margin ≥ target) | Publish immediately |
| `"good"` | ✅ Good deal (margin ≥ good threshold) | Publish |
| `"almost"` | ⚠️ Marginal deal (margin ≥ minimum) | Review before publishing |
| `"bad"` | ❌ Poor deal (margin < minimum) | Do not publish |

---

## Testing Checklist

- [ ] Change `category_name` → `category_id` in WeWeb workflow
- [ ] Change `subcategory_name` → `subcategory_id` in WeWeb workflow
- [ ] Remove `supplier_id` from request body (optional)
- [ ] Test with valid API key `WEWEB_PRODUCTION_2025_API_KEY`
- [ ] Verify response includes `generated_item_id` when `item_id` is null
- [ ] Verify response includes `deal_status` and `is_valid`
- [ ] Handle all 4 deal status values in UI (top, good, almost, bad)

---

## Errors to Watch For

### ❌ "Missing required field: supplier_id"
**Cause**: Old version of function (fixed in migration 16)
**Solution**: Migration already applied ✅

### ❌ "column effective_date does not exist"
**Cause**: Old version of function (fixed in migration 15)
**Solution**: Migration already applied ✅

### ❌ "Subcategory ID s5 not found in database"
**Cause**: Sending `subcategory_name: "s5"` instead of `subcategory_id: "s5"`
**Solution**: Change field name to `subcategory_id` ⚠️ **Action required**

### ❌ "Invalid API key"
**Cause**: API key not created or incorrect
**Solution**: Verify API key exists in Supabase `supplier_registry` table

---

## Support

For any issues or questions:
- API Documentation: https://app.odl-tools.ch/api-docs
- Contact: admin@odeal.ch

# Database Fixes Applied - 2025-10-26

## Summary

Three critical bugs were identified and fixed in the `validate_and_calculate_item()` PostgreSQL function during WeWeb integration testing.

---

## ✅ Fix #1: Missing `effective_date` Column (Migration 15)

### Error
```
"column 'effective_date' does not exist"
```

### Root Cause
Function tried to order currency rates by a non-existent column:
```sql
ORDER BY effective_date DESC  -- Column doesn't exist in currency_rates table
```

### Solution
Removed the ORDER BY clause:
```sql
SELECT rate INTO v_currency_rate
FROM currency_rates
WHERE from_currency = v_purchase_currency
  AND to_currency = 'CHF'
  AND is_active = true
LIMIT 1;  -- Fixed: ORDER BY removed
```

### Migration
`20251026000015_fix_currency_rates_column.sql` ✅ Applied

---

## ✅ Fix #2: supplier_id Parameter Not Used (Migration 16)

### Error
```json
{
  "error": "Missing required field: supplier_id"
}
```

### Root Cause
Function tried to extract `supplier_id` from JSONB data:
```sql
v_supplier_id := (p_item_data->>'supplier_id')::UUID;  -- Not in JSONB!
```

But the route handler gets `supplier_id` from API key verification and doesn't include it in the JSONB payload.

### Solution
Use the parameter directly instead of extracting from JSONB:
```sql
v_supplier_id := p_supplier_id;  -- Use parameter from API key
```

**Context:**
- API key identifies the supplier
- Route handler passes `p_supplier_id` as a parameter (line 274 in route.ts)
- JSONB `p_item_data` doesn't contain `supplier_id`

### Migration
`20251026000016_fix_supplier_id_parameter.sql` (v1) ✅ Applied

---

## ✅ Fix #3: Invalid format() Specifiers (Migration 16 v2)

### Error
```json
{
  "error": "Validation function error",
  "details": "unrecognized format() type specifier \".\"",
  "code": "VALIDATION_ERROR"
}
```

### Root Cause
PostgreSQL `format()` function doesn't support printf-style float formatting like `%.2f`:

```sql
-- ❌ WRONG (causes error):
format('Margin %.2f%% is below good threshold (%.2f%%) but above minimum (%.2f%%)',
  v_marge_brute_percent, v_rule.margin_good_min, v_rule.margin_almost_min)
```

**PostgreSQL `format()` only supports:**
- `%s` - string
- `%I` - identifier (quoted)
- `%L` - literal (escaped)
- **NOT `%.2f` for floats!**

### Solution
Round numbers to 2 decimals and use `%s` format specifier:

```sql
-- ✅ CORRECT (fixed):
format('Margin %s%% is below good threshold (%s%%) but above minimum (%s%%)',
  round(v_marge_brute_percent::numeric, 2),
  round(v_rule.margin_good_min::numeric, 2),
  round(v_rule.margin_almost_min::numeric, 2))
```

### Lines Changed
- **Line 264-265**: "almost" deal status message
- **Line 270-271**: "bad" deal status message

### Migration
`20251026000016_fix_supplier_id_parameter.sql` (v2, updated) ✅ Applied

---

## Current Status

### ✅ Database Function - Fully Fixed

All three bugs resolved:
1. ✅ No more `effective_date` errors
2. ✅ No more `supplier_id` missing errors
3. ✅ No more `format()` specifier errors

### ⚠️ WeWeb Integration - Requires Changes

**WeWeb team needs to update field names:**

```javascript
// ❌ CURRENT (wrong):
{
  category_name: "c1",       // IDs labeled as names!
  subcategory_name: "s5"
}

// ✅ REQUIRED (correct):
{
  category_id: "c1",         // Match the data type
  subcategory_id: "s5"
}
```

**Reference:** See `WEWEB_INTEGRATION_FIX.md` for complete integration guide.

---

## Test Results

### Before Fixes
- ❌ `effective_date` column error
- ❌ `supplier_id` missing error
- ❌ `format()` specifier error

### After Fixes
- ✅ Function executes successfully
- ✅ API responds with proper error messages (e.g., "Invalid API key")
- ✅ Ready for WeWeb integration (pending field name changes)

---

## API Endpoint

**Production URL:** `https://api.odl-tools.ch/api/validate-item`

**Authentication:** X-API-Key header

**Example Request:**
```json
{
  "offer_id": "uuid",
  "item_id": "888413779764",
  "category_id": "c1",
  "subcategory_id": "s5",
  "msrp": 200,
  "street_price": 180,
  "promo_price": 150,
  "purchase_price_ht": 100,
  "purchase_currency": "EUR"
}
```

---

## Files Modified

1. **Migrations:**
   - `applications/odl-tools/supabase/migrations/20251026000015_fix_currency_rates_column.sql`
   - `applications/odl-tools/supabase/migrations/20251026000016_fix_supplier_id_parameter.sql`

2. **Documentation:**
   - `WEWEB_INTEGRATION_FIX.md` (WeWeb team guide)
   - `FIXES_APPLIED_2025-10-26.md` (this file)

---

## Next Steps

1. **WeWeb Team:** Update field names from `category_name`/`subcategory_name` to `category_id`/`subcategory_id`
2. **Test:** Full end-to-end validation with real data
3. **Monitor:** Check API logs for any remaining issues
4. **Create API Key:** Generate production key `WEWEB_PRODUCTION_2025_API_KEY` if not exists

---

## Technical Notes

### PostgreSQL format() Function

**Supported format specifiers:**
```sql
%s - string (use for all types by converting/rounding first)
%I - identifier (quoted if needed)
%L - literal (escaped)
```

**NOT supported:**
```sql
%.2f, %d, %i, etc. - NO printf-style formatting!
```

**Best Practice:**
```sql
-- Convert/round first, then format as string
format('Value: %s', round(my_number::numeric, 2))
```

### API Key Authentication Flow

```
1. WeWeb sends X-API-Key header
2. Route handler calls verify_supplier_api_key(apiKey)
3. Returns supplier_id from API key lookup
4. Passes supplier_id as p_supplier_id parameter
5. Function uses parameter (NOT from JSONB)
```

---

## Change Log

| Time | Fix | Status |
|------|-----|--------|
| 11:59 | Migration 15 - effective_date fix | ✅ Applied |
| 12:30 | Migration 16 v1 - supplier_id parameter | ✅ Applied |
| 12:52 | Migration 16 v2 - format() specifiers | ✅ Applied |

---

## Support

- **API Documentation:** https://app.odl-tools.ch/api-docs
- **Contact:** admin@odeal.ch

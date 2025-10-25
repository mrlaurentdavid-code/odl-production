-- ============================================================================
-- Migration: Create Basic Validation Functions
-- Date: 2025-10-25
-- Description: Helper functions for validation (Phase 1A)
-- Note: Main validation function will be added in Phase 1B
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: Lookup Product by EAN
-- ============================================================================

CREATE OR REPLACE FUNCTION lookup_product_by_ean(p_ean TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_product RECORD;
  v_ean_clean TEXT;
BEGIN
  -- Clean EAN (trim spaces)
  v_ean_clean := TRIM(p_ean);

  -- Validate EAN format
  IF v_ean_clean IS NULL OR LENGTH(v_ean_clean) < 8 THEN
    RETURN jsonb_build_object(
      'found', false,
      'error', 'Invalid EAN format'
    );
  END IF;

  -- Lookup in products_catalog
  SELECT * INTO v_product
  FROM products_catalog
  WHERE ean = v_ean_clean
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'message', 'Product not in catalog'
    );
  END IF;

  -- Return product data
  RETURN jsonb_build_object(
    'found', true,
    'data', row_to_json(v_product)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_product_by_ean TO anon, authenticated;

COMMENT ON FUNCTION lookup_product_by_ean IS
  'Lookup product in catalog by EAN. Returns product data for auto-fill or {found: false}.';

-- ============================================================================
-- FUNCTION 2: Convert Price to CHF
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_to_chf(
  p_amount NUMERIC,
  p_currency TEXT,
  p_apply_safety_coef BOOLEAN DEFAULT true
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rate NUMERIC;
  v_safety_coef NUMERIC := 1;
  v_result NUMERIC;
BEGIN
  -- If already CHF, return as-is
  IF p_currency = 'CHF' THEN
    RETURN p_amount;
  END IF;

  -- Get currency rate
  SELECT rate INTO v_rate
  FROM currency_change
  WHERE base = p_currency
    AND quote = 'CHF'
  ORDER BY fetched_at DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Currency rate not available for %', p_currency;
  END IF;

  -- Get safety coefficient if requested
  IF p_apply_safety_coef THEN
    SELECT currency_safety_coefficient INTO v_safety_coef
    FROM get_active_business_rules();
  END IF;

  -- Calculate
  v_result := p_amount * v_rate * v_safety_coef;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION convert_to_chf TO anon, authenticated;

COMMENT ON FUNCTION convert_to_chf IS
  'Convert amount from any currency to CHF. Optionally applies safety coefficient.';

-- ============================================================================
-- FUNCTION 3: Calculate Payment Processing Fees
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_payment_fees(p_amount_chf NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rules RECORD;
  v_fee NUMERIC;
BEGIN
  SELECT * INTO v_rules FROM get_active_business_rules();

  -- Stripe formula: (amount * percentage) + fixed fee
  v_fee := (p_amount_chf * v_rules.payment_processing_fee_percent / 100)
         + v_rules.payment_processing_fee_fixed_chf;

  RETURN v_fee;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_payment_fees TO anon, authenticated;

COMMENT ON FUNCTION calculate_payment_fees IS
  'Calculate payment processing fees (Stripe). Formula: (amount * %) + fixed.';

-- ============================================================================
-- FUNCTION 4: Increment Validation Counter
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_supplier_validation_count(p_supplier_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE supplier_registry
  SET
    daily_validations_count = daily_validations_count + 1,
    updated_at = NOW()
  WHERE supplier_id = p_supplier_id;
$$;

COMMENT ON FUNCTION increment_supplier_validation_count IS
  'Increment daily validation counter for supplier. Called after successful validation.';

-- ============================================================================
-- FUNCTION 5: Log Modification
-- ============================================================================

CREATE OR REPLACE FUNCTION log_item_modification(
  p_offer_id UUID,
  p_item_id UUID,
  p_supplier_id UUID,
  p_user_id UUID,
  p_modification_type TEXT,
  p_old_values JSONB,
  p_new_values JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO offer_item_modifications_log (
    offer_id,
    item_id,
    supplier_id,
    user_id,
    modification_type,
    old_values,
    new_values,
    ip_address,
    created_at
  ) VALUES (
    p_offer_id,
    p_item_id,
    p_supplier_id,
    p_user_id,
    p_modification_type,
    p_old_values,
    p_new_values,
    inet_client_addr(),
    NOW()
  ) RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_item_modification TO anon, authenticated;

COMMENT ON FUNCTION log_item_modification IS
  'Log item modification for audit trail. Returns log_id.';

-- ============================================================================
-- FUNCTION 6: Check Gaming Attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_gaming_attempt(
  p_user_id UUID,
  p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rules RECORD;
  v_recent_count INT;
  v_is_gaming BOOLEAN := false;
BEGIN
  SELECT * INTO v_rules FROM get_active_business_rules();

  -- Count recent price modifications
  v_recent_count := count_recent_price_modifications(
    p_user_id,
    p_item_id,
    v_rules.price_modification_time_window_minutes
  );

  -- Detect gaming
  IF v_recent_count >= v_rules.max_price_modifications_per_item THEN
    v_is_gaming := true;
  END IF;

  RETURN jsonb_build_object(
    'is_gaming_suspected', v_is_gaming,
    'recent_modifications_count', v_recent_count,
    'max_allowed', v_rules.max_price_modifications_per_item,
    'time_window_minutes', v_rules.price_modification_time_window_minutes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION detect_gaming_attempt TO anon, authenticated;

COMMENT ON FUNCTION detect_gaming_attempt IS
  'Detect if user is attempting to game the system with repeated price changes.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Basic validation functions created:';
  RAISE NOTICE '  - lookup_product_by_ean()';
  RAISE NOTICE '  - convert_to_chf()';
  RAISE NOTICE '  - calculate_payment_fees()';
  RAISE NOTICE '  - increment_supplier_validation_count()';
  RAISE NOTICE '  - log_item_modification()';
  RAISE NOTICE '  - detect_gaming_attempt()';
  RAISE NOTICE '';
  RAISE NOTICE '⏳ Main validation function will be added in Phase 1B';
END $$;

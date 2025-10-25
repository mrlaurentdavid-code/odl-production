-- ============================================================================
-- Migration: Create Validate and Calculate Item Function
-- Date: 2025-10-25
-- Description: Main validation function for O!Deal supplier offers
-- ============================================================================

-- ============================================================================
-- FUNCTION: validate_and_calculate_item
-- ============================================================================
--
-- Purpose: Validates a single offer item and calculates complete COGS
--
-- Input: JSON object with item data from WeWeb
-- Output: JSON with validation result, deal status, and cost breakdown
--
-- Called by: Next.js API Gateway (/api/validate-item)
--
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_and_calculate_item(
  p_supplier_id UUID,
  p_user_id UUID,
  p_item_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- Business rules
  v_rules RECORD;

  -- Item identifiers
  v_offer_id UUID;
  v_item_id UUID;
  v_cost_id UUID;

  -- Product lookup
  v_product JSONB;
  v_ean TEXT;

  -- Prices (input from WeWeb)
  v_msrp NUMERIC;
  v_street_price NUMERIC;
  v_promo_price NUMERIC;
  v_purchase_price_ht NUMERIC;
  v_purchase_currency TEXT;
  v_quantity INT;

  -- Product details
  v_product_name TEXT;
  v_package_weight_kg NUMERIC;
  v_subcategory_id UUID;

  -- Currency conversion
  v_currency_rate NUMERIC;
  v_currency_safety_coef NUMERIC;
  v_purchase_price_chf_ht NUMERIC;

  -- Logistics costs
  v_logistics_inbound_ht NUMERIC := 0;
  v_logistics_outbound_ht NUMERIC := 0;
  v_logistics_inbound_carrier TEXT;
  v_logistics_outbound_carrier TEXT;
  v_logistics_inbound RECORD;
  v_logistics_outbound RECORD;

  -- Customs & TAR
  v_customs_duty_ht NUMERIC := 0;
  v_tar_ht NUMERIC := 0;
  v_customs_rate NUMERIC := 0;
  v_tar_rate NUMERIC := 0;

  -- Other costs
  v_pesa_fee_ht NUMERIC := 0;
  v_warranty_cost_ht NUMERIC := 0;
  v_payment_fee_ht NUMERIC := 0;

  -- Calculated totals
  v_cogs_total_ht NUMERIC;
  v_cogs_total_ttc NUMERIC;
  v_marge_brute_chf NUMERIC;
  v_marge_brute_percent NUMERIC;

  -- Customer savings
  v_eco_vs_msrp_chf NUMERIC;
  v_eco_vs_msrp_percent NUMERIC;
  v_eco_vs_street_chf NUMERIC;
  v_eco_vs_street_percent NUMERIC;

  -- Deal validation
  v_deal_status TEXT;
  v_is_valid BOOLEAN;
  v_validation_issues JSONB := '[]'::JSONB;
  v_validation_message TEXT;

  -- Anti-gaming
  v_gaming_result JSONB;
  v_gaming_detected BOOLEAN := false;

  -- Result
  v_result JSONB;

BEGIN
  -- ============================================================================
  -- STEP 1: GET BUSINESS RULES
  -- ============================================================================

  SELECT * INTO v_rules FROM get_active_business_rules();

  IF v_rules IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business rules not configured'
    );
  END IF;

  -- ============================================================================
  -- STEP 2: EXTRACT INPUT DATA
  -- ============================================================================

  v_offer_id := (p_item_data->>'offer_id')::UUID;
  v_item_id := (p_item_data->>'item_id')::UUID;
  v_ean := p_item_data->>'ean';

  -- Prices (required)
  v_msrp := (p_item_data->>'msrp')::NUMERIC;
  v_street_price := (p_item_data->>'street_price')::NUMERIC;
  v_promo_price := (p_item_data->>'promo_price')::NUMERIC;
  v_purchase_price_ht := (p_item_data->>'purchase_price_ht')::NUMERIC;
  v_purchase_currency := COALESCE(p_item_data->>'purchase_currency', 'CHF');
  v_quantity := COALESCE((p_item_data->>'quantity')::INT, 1);

  -- Product details
  v_product_name := p_item_data->>'product_name';
  v_package_weight_kg := (p_item_data->>'package_weight_kg')::NUMERIC;
  v_subcategory_id := (p_item_data->>'subcategory_id')::UUID;

  -- Optional costs
  v_pesa_fee_ht := COALESCE((p_item_data->>'pesa_fee_ht')::NUMERIC, 0);
  v_warranty_cost_ht := COALESCE((p_item_data->>'warranty_cost_ht')::NUMERIC, 0);

  -- Validate required fields
  IF v_offer_id IS NULL OR v_item_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required fields: offer_id, item_id'
    );
  END IF;

  IF v_msrp IS NULL OR v_street_price IS NULL OR v_promo_price IS NULL OR v_purchase_price_ht IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required price fields'
    );
  END IF;

  -- ============================================================================
  -- STEP 3: PRODUCT LOOKUP (OPTIONAL - AUTO-FILL FROM CATALOG)
  -- ============================================================================

  IF v_ean IS NOT NULL AND v_ean != '' THEN
    BEGIN
      v_product := lookup_product_by_ean(v_ean);

      IF (v_product->>'found')::BOOLEAN THEN
        -- Auto-fill from catalog if not provided
        IF v_product_name IS NULL THEN
          v_product_name := v_product->'data'->>'product_name';
        END IF;
        IF v_package_weight_kg IS NULL THEN
          v_package_weight_kg := (v_product->'data'->>'package_weight_kg')::NUMERIC;
        END IF;
        -- TAR rate from catalog (will be used below)
        v_tar_rate := COALESCE((v_product->'data'->>'tar_rate_ht')::NUMERIC, 0);
        v_customs_rate := COALESCE((v_product->'data'->>'customs_duty_rate')::NUMERIC, 0);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Catalog lookup failed, continue without it
      NULL;
    END;
  END IF;

  -- ============================================================================
  -- STEP 4: CURRENCY CONVERSION
  -- ============================================================================

  v_currency_safety_coef := v_rules.currency_safety_coefficient;

  IF v_purchase_currency = 'CHF' THEN
    v_purchase_price_chf_ht := v_purchase_price_ht;
    v_currency_rate := 1;
  ELSE
    -- Get latest rate
    SELECT rate INTO v_currency_rate
    FROM currency_change
    WHERE base = v_purchase_currency AND quote = 'CHF'
    ORDER BY fetched_at DESC
    LIMIT 1;

    IF v_currency_rate IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Currency rate not available for ' || v_purchase_currency
      );
    END IF;

    v_purchase_price_chf_ht := v_purchase_price_ht * v_currency_rate * v_currency_safety_coef;
  END IF;

  -- ============================================================================
  -- STEP 5: LOGISTICS COSTS
  -- ============================================================================

  IF v_package_weight_kg IS NOT NULL AND v_package_weight_kg > 0 THEN
    -- Inbound (supplier → warehouse)
    SELECT * INTO v_logistics_inbound
    FROM get_logistics_cost_for_weight('inbound', v_package_weight_kg);

    IF v_logistics_inbound IS NOT NULL THEN
      v_logistics_inbound_ht := v_logistics_inbound.total_cost;
      v_logistics_inbound_carrier := v_logistics_inbound.carrier;
    END IF;

    -- Outbound (warehouse → customer)
    SELECT * INTO v_logistics_outbound
    FROM get_logistics_cost_for_weight('outbound', v_package_weight_kg);

    IF v_logistics_outbound IS NOT NULL THEN
      v_logistics_outbound_ht := v_logistics_outbound.total_cost;
      v_logistics_outbound_carrier := v_logistics_outbound.carrier;
    END IF;
  END IF;

  -- ============================================================================
  -- STEP 6: CUSTOMS DUTY & TAR
  -- ============================================================================

  -- If not found in catalog, lookup by subcategory
  IF v_tar_rate = 0 AND v_subcategory_id IS NOT NULL THEN
    SELECT
      customs_duty_rate,
      tar_rate_ht
    INTO
      v_customs_rate,
      v_tar_rate
    FROM get_customs_rates_for_subcategory(v_subcategory_id);
  END IF;

  -- Calculate customs duty (percentage of purchase price CHF)
  IF v_customs_rate > 0 THEN
    v_customs_duty_ht := v_purchase_price_chf_ht * (v_customs_rate / 100);
  END IF;

  -- TAR is fixed amount per item
  v_tar_ht := v_tar_rate;

  -- ============================================================================
  -- STEP 7: PAYMENT PROCESSING FEES (STRIPE)
  -- ============================================================================

  v_payment_fee_ht := calculate_payment_fees(v_promo_price);

  -- ============================================================================
  -- STEP 8: CALCULATE TOTAL COGS
  -- ============================================================================

  v_cogs_total_ht :=
    v_purchase_price_chf_ht +
    v_logistics_inbound_ht +
    v_logistics_outbound_ht +
    v_customs_duty_ht +
    v_tar_ht +
    v_pesa_fee_ht +
    v_warranty_cost_ht +
    v_payment_fee_ht;

  -- TVA 8.1% (Switzerland)
  v_cogs_total_ttc := v_cogs_total_ht * 1.081;

  -- ============================================================================
  -- STEP 9: CALCULATE MARGINS
  -- ============================================================================

  v_marge_brute_chf := v_promo_price - v_cogs_total_ht;

  IF v_promo_price > 0 THEN
    v_marge_brute_percent := (v_marge_brute_chf / v_promo_price) * 100;
  ELSE
    v_marge_brute_percent := 0;
  END IF;

  -- ============================================================================
  -- STEP 10: CALCULATE CUSTOMER SAVINGS
  -- ============================================================================

  -- vs MSRP
  v_eco_vs_msrp_chf := v_msrp - v_promo_price;
  IF v_msrp > 0 THEN
    v_eco_vs_msrp_percent := (v_eco_vs_msrp_chf / v_msrp) * 100;
  ELSE
    v_eco_vs_msrp_percent := 0;
  END IF;

  -- vs Street Price
  v_eco_vs_street_chf := v_street_price - v_promo_price;
  IF v_street_price > 0 THEN
    v_eco_vs_street_percent := (v_eco_vs_street_chf / v_street_price) * 100;
  ELSE
    v_eco_vs_street_percent := 0;
  END IF;

  -- ============================================================================
  -- STEP 11: DETERMINE DEAL STATUS
  -- ============================================================================

  -- Initialize as valid
  v_is_valid := true;

  -- Check margin thresholds
  IF v_marge_brute_percent < v_rules.minimum_gross_margin_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'margin_too_low',
      'message', 'Marge brute trop faible: ' || ROUND(v_marge_brute_percent, 2) || '% (min: ' || v_rules.minimum_gross_margin_percent || '%)'
    );
    v_is_valid := false;
  END IF;

  IF v_marge_brute_percent > v_rules.maximum_gross_margin_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'margin_too_high',
      'message', 'Marge brute trop élevée: ' || ROUND(v_marge_brute_percent, 2) || '% (max: ' || v_rules.maximum_gross_margin_percent || '%)'
    );
    v_is_valid := false;
  END IF;

  -- Check customer savings vs MSRP
  IF v_eco_vs_msrp_percent < v_rules.deal_min_eco_vs_msrp_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'savings_too_low_msrp',
      'message', 'Économie client trop faible vs MSRP: ' || ROUND(v_eco_vs_msrp_percent, 2) || '% (min: ' || v_rules.deal_min_eco_vs_msrp_percent || '%)'
    );
    v_is_valid := false;
  END IF;

  -- Check customer savings vs Street Price
  IF v_eco_vs_street_percent < v_rules.deal_min_eco_vs_street_price_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'savings_too_low_street',
      'message', 'Économie client trop faible vs Street: ' || ROUND(v_eco_vs_street_percent, 2) || '% (min: ' || v_rules.deal_min_eco_vs_street_price_percent || '%)'
    );
  END IF;

  -- Determine deal_status
  IF NOT v_is_valid THEN
    v_deal_status := 'bad';
  ELSIF v_marge_brute_percent >= v_rules.target_gross_margin_percent
    AND v_eco_vs_msrp_percent >= v_rules.deal_min_eco_vs_msrp_percent THEN
    v_deal_status := 'top';
  ELSIF v_marge_brute_percent >= v_rules.minimum_gross_margin_percent
    AND v_eco_vs_msrp_percent >= v_rules.deal_min_eco_vs_msrp_percent THEN
    v_deal_status := 'good';
  ELSE
    v_deal_status := 'almost';
  END IF;

  -- ============================================================================
  -- STEP 12: ANTI-GAMING CHECK
  -- ============================================================================

  v_gaming_result := detect_gaming_attempt(p_user_id, v_item_id);
  v_gaming_detected := (v_gaming_result->>'is_gaming_suspected')::BOOLEAN;

  IF v_gaming_detected THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'gaming_detected',
      'message', 'Trop de modifications récentes détectées: ' ||
        (v_gaming_result->>'recent_modifications_count') ||
        ' dans les dernières ' ||
        (v_gaming_result->>'time_window_minutes') || ' minutes'
    );
  END IF;

  -- ============================================================================
  -- STEP 13: SAVE TO DATABASE
  -- ============================================================================

  -- Insert into offer_item_calculated_costs
  INSERT INTO offer_item_calculated_costs (
    offer_id,
    item_id,
    supplier_id,
    user_id,

    -- Prices
    msrp,
    street_price,
    promo_price,
    purchase_price_ht,
    purchase_currency,
    currency_rate,
    currency_safety_coefficient,

    -- Product details
    product_name,
    ean,
    package_weight_kg,
    quantity,

    -- Logistics
    logistics_inbound_ht,
    logistics_outbound_ht,
    logistics_inbound_carrier,
    logistics_outbound_carrier,

    -- Customs & TAR
    customs_duty_ht,
    customs_duty_rate,
    tar_ht,
    tar_rate,

    -- Other costs
    pesa_fee_ht,
    warranty_cost_ht,
    payment_processing_fee_ht,

    -- Totals (GENERATED columns will calculate these)
    -- marge_brute_chf, marge_brute_percent, eco_vs_msrp_chf, etc.

    -- Deal validation
    deal_status,
    validation_issues,
    gaming_detected

  ) VALUES (
    v_offer_id,
    v_item_id,
    p_supplier_id,
    p_user_id,

    v_msrp,
    v_street_price,
    v_promo_price,
    v_purchase_price_ht,
    v_purchase_currency,
    v_currency_rate,
    v_currency_safety_coef,

    v_product_name,
    v_ean,
    v_package_weight_kg,
    v_quantity,

    v_logistics_inbound_ht,
    v_logistics_outbound_ht,
    v_logistics_inbound_carrier,
    v_logistics_outbound_carrier,

    v_customs_duty_ht,
    v_customs_rate,
    v_tar_ht,
    v_tar_rate,

    v_pesa_fee_ht,
    v_warranty_cost_ht,
    v_payment_fee_ht,

    v_deal_status,
    v_validation_issues,
    v_gaming_detected

  ) RETURNING cost_id INTO v_cost_id;

  -- ============================================================================
  -- STEP 14: LOG MODIFICATION
  -- ============================================================================

  PERFORM log_item_modification(
    v_offer_id,
    v_item_id,
    p_supplier_id,
    p_user_id,
    'validate_item',
    NULL,  -- old_values (first validation, no old values)
    jsonb_build_object(
      'deal_status', v_deal_status,
      'is_valid', v_is_valid,
      'margin_percent', ROUND(v_marge_brute_percent, 2),
      'cogs_total', ROUND(v_cogs_total_ht, 2)
    )
  );

  -- ============================================================================
  -- STEP 15: INCREMENT VALIDATION COUNTER
  -- ============================================================================

  PERFORM increment_supplier_validation_count(p_supplier_id);

  -- ============================================================================
  -- STEP 16: CREATE NOTIFICATION (IF BAD DEAL)
  -- ============================================================================

  -- TODO Phase 2: Create sent_notifications table and insert here
  -- For now, just set validation message
  IF v_deal_status = 'bad' THEN
    v_validation_message := 'Deal rejected: margin or savings below thresholds';
  END IF;

  -- ============================================================================
  -- STEP 17: BUILD RESULT
  -- ============================================================================

  v_result := jsonb_build_object(
    'success', true,
    'cost_id', v_cost_id,
    'item_id', v_item_id,
    'offer_id', v_offer_id,

    -- Deal validation
    'deal_status', v_deal_status,
    'is_valid', v_is_valid,
    'validation_issues', v_validation_issues,

    -- Cost breakdown
    'costs', jsonb_build_object(
      'purchase_price_ht', ROUND(v_purchase_price_ht, 2),
      'purchase_price_chf_ht', ROUND(v_purchase_price_chf_ht, 2),
      'currency_rate', v_currency_rate,
      'currency_safety_coef', v_currency_safety_coef,

      'logistics_inbound_ht', ROUND(v_logistics_inbound_ht, 2),
      'logistics_inbound_carrier', COALESCE(v_logistics_inbound_carrier, 'N/A'),
      'logistics_outbound_ht', ROUND(v_logistics_outbound_ht, 2),
      'logistics_outbound_carrier', COALESCE(v_logistics_outbound_carrier, 'N/A'),

      'customs_duty_ht', ROUND(v_customs_duty_ht, 2),
      'customs_duty_rate', v_customs_rate,
      'tar_ht', ROUND(v_tar_ht, 2),

      'pesa_fee_ht', ROUND(v_pesa_fee_ht, 2),
      'warranty_cost_ht', ROUND(v_warranty_cost_ht, 2),
      'payment_fee_ht', ROUND(v_payment_fee_ht, 2),

      'cogs_total_ht', ROUND(v_cogs_total_ht, 2),
      'cogs_total_ttc', ROUND(v_cogs_total_ttc, 2)
    ),

    -- Margins
    'margins', jsonb_build_object(
      'marge_brute_chf', ROUND(v_marge_brute_chf, 2),
      'marge_brute_percent', ROUND(v_marge_brute_percent, 2),
      'target_margin', v_rules.target_gross_margin_percent,
      'minimum_margin', v_rules.minimum_gross_margin_percent,
      'maximum_margin', v_rules.maximum_gross_margin_percent
    ),

    -- Customer savings
    'savings', jsonb_build_object(
      'eco_vs_msrp_chf', ROUND(v_eco_vs_msrp_chf, 2),
      'eco_vs_msrp_percent', ROUND(v_eco_vs_msrp_percent, 2),
      'eco_vs_street_chf', ROUND(v_eco_vs_street_chf, 2),
      'eco_vs_street_percent', ROUND(v_eco_vs_street_percent, 2)
    ),

    -- Metadata
    'metadata', jsonb_build_object(
      'validated_at', NOW(),
      'supplier_id', p_supplier_id,
      'user_id', p_user_id,
      'gaming_detected', v_gaming_detected,
      'product_name', v_product_name,
      'ean', v_ean,
      'package_weight_kg', v_package_weight_kg,
      'quantity', v_quantity,
      'subcategory_id', v_subcategory_id
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_and_calculate_item TO authenticated, service_role;

-- Comment
COMMENT ON FUNCTION validate_and_calculate_item IS
  'Main validation function for O!Deal. Calculates complete COGS, margins, and deal status for a single item.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Function validate_and_calculate_item() created successfully';
  RAISE NOTICE '  Input: supplier_id, user_id, item_data (JSONB)';
  RAISE NOTICE '  Output: Complete validation result with COGS breakdown';
END $$;

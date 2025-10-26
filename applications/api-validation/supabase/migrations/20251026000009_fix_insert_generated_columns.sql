-- ============================================================================
-- Migration: Fix INSERT to match table structure
-- Date: 2025-10-26
-- Description: Remove GENERATED ALWAYS columns from INSERT, fix column names
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
  -- Business rules (hierarchical)
  v_rules RECORD;
  v_category_name TEXT;
  v_subcategory_name TEXT;

  -- Item identifiers
  v_offer_id UUID;
  v_item_id TEXT;  -- TEXT for EAN/SKU from WeWeb
  v_cost_id UUID;

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
  v_ean TEXT;

  -- Currency conversion
  v_currency_rate NUMERIC;
  v_currency_safety_coef NUMERIC;

  -- Logistics costs (simplified)
  v_logistics_total_ht NUMERIC := 0;
  v_logistics_carrier TEXT := 'Ohmex SA';

  -- Customs & TAR
  v_customs_duty_ht NUMERIC := 0;
  v_customs_rate NUMERIC := 0;
  v_tar_ht NUMERIC := 0;

  -- Other costs
  v_pesa_fee_ht NUMERIC := 0;
  v_warranty_cost_ht NUMERIC := 0;
  v_payment_fee_ht NUMERIC := 0;

  -- Deal validation
  v_deal_status TEXT;
  v_is_valid BOOLEAN;
  v_validation_issues JSONB := '[]'::JSONB;

BEGIN
  -- ============================================================================
  -- STEP 1: GET HIERARCHICAL BUSINESS RULES
  -- ============================================================================

  v_category_name := p_item_data->>'category_name';
  v_subcategory_name := p_item_data->>'subcategory_name';

  SELECT * INTO v_rules FROM get_applicable_rules(v_category_name, v_subcategory_name);

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
  v_item_id := p_item_data->>'item_id';  -- ACCEPT AS TEXT (EAN/SKU from WeWeb)
  v_ean := COALESCE(p_item_data->>'ean', v_item_id);

  v_msrp := (p_item_data->>'msrp')::NUMERIC;
  v_street_price := (p_item_data->>'street_price')::NUMERIC;
  v_promo_price := (p_item_data->>'promo_price')::NUMERIC;
  v_purchase_price_ht := (p_item_data->>'purchase_price_ht')::NUMERIC;
  v_purchase_currency := COALESCE(p_item_data->>'purchase_currency', 'CHF');
  v_quantity := COALESCE((p_item_data->>'quantity')::INT, 1);

  v_product_name := p_item_data->>'product_name';
  v_package_weight_kg := COALESCE((p_item_data->>'package_weight_kg')::NUMERIC, 0.5);

  v_pesa_fee_ht := COALESCE((p_item_data->>'pesa_fee_ht')::NUMERIC, 0);
  v_warranty_cost_ht := COALESCE((p_item_data->>'warranty_cost_ht')::NUMERIC, 0);

  -- Validate required fields
  IF v_offer_id IS NULL OR v_item_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required fields: offer_id, item_id'
    );
  END IF;

  IF v_msrp <= 0 OR v_street_price <= 0 OR v_promo_price <= 0 OR v_purchase_price_ht <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'All prices must be positive'
    );
  END IF;

  -- ============================================================================
  -- STEP 3: CURRENCY CONVERSION
  -- ============================================================================

  v_currency_safety_coef := v_rules.currency_safety_coefficient;

  IF v_purchase_currency != 'CHF' THEN
    SELECT rate INTO v_currency_rate
    FROM currency_rates
    WHERE from_currency = v_purchase_currency
      AND to_currency = 'CHF'
      AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_currency_rate IS NULL THEN
      v_currency_rate := 1.0;
    END IF;
  ELSE
    v_currency_rate := 1.0;
  END IF;

  -- ============================================================================
  -- STEP 4: CALCULATE LOGISTICS COSTS
  -- ============================================================================

  SELECT
    COALESCE(price_transport, 0) + COALESCE(price_reception, 0) + COALESCE(price_prep, 0),
    COALESCE(carrier, 'Ohmex SA')
  INTO v_logistics_total_ht, v_logistics_carrier
  FROM logistics_rates
  WHERE is_active = true
    AND is_default = true
  LIMIT 1;

  -- If no default, use first active rate
  IF v_logistics_total_ht IS NULL OR v_logistics_total_ht = 0 THEN
    SELECT
      COALESCE(price_transport, 0) + COALESCE(price_reception, 0) + COALESCE(price_prep, 0),
      COALESCE(carrier, 'Ohmex SA')
    INTO v_logistics_total_ht, v_logistics_carrier
    FROM logistics_rates
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Fallback if still NULL
  IF v_logistics_total_ht IS NULL THEN
    v_logistics_total_ht := 5.0;
  END IF;

  -- ============================================================================
  -- STEP 5: CALCULATE CUSTOMS DUTY
  -- ============================================================================

  IF v_category_name IS NOT NULL THEN
    SELECT duty_rate_percent INTO v_customs_rate
    FROM odeal_customs_duty_rates
    WHERE category_name = v_category_name
      AND is_active = true
    LIMIT 1;
  END IF;

  IF v_customs_rate IS NULL OR v_customs_rate = 0 THEN
    v_customs_rate := 0;
  END IF;

  v_customs_duty_ht := v_purchase_price_ht * v_currency_rate * v_currency_safety_coef * (v_customs_rate / 100.0);

  -- ============================================================================
  -- STEP 6: CALCULATE PAYMENT PROCESSING FEE
  -- ============================================================================

  v_payment_fee_ht := (v_promo_price * (v_rules.payment_processing_fee_percent / 100.0)) + v_rules.payment_processing_fee_fixed_chf;

  -- ============================================================================
  -- STEP 7: DETERMINE DEAL STATUS (with configurable thresholds)
  -- ============================================================================

  -- Calculate margins (for validation logic)
  DECLARE
    v_cogs_total_calc NUMERIC;
    v_marge_brute_calc NUMERIC;
    v_marge_brute_percent_calc NUMERIC;
    v_eco_vs_msrp_percent_calc NUMERIC;
    v_eco_vs_street_percent_calc NUMERIC;
  BEGIN
    v_cogs_total_calc := (v_purchase_price_ht * v_currency_rate * v_currency_safety_coef) + v_logistics_total_ht + v_customs_duty_ht + v_tar_ht + v_pesa_fee_ht + v_warranty_cost_ht + v_payment_fee_ht;
    v_marge_brute_calc := v_promo_price - v_cogs_total_calc;
    v_marge_brute_percent_calc := CASE WHEN v_promo_price > 0 THEN (v_marge_brute_calc / v_promo_price) * 100 ELSE 0 END;
    v_eco_vs_msrp_percent_calc := CASE WHEN v_msrp > 0 THEN ((v_msrp - v_promo_price) / v_msrp) * 100 ELSE 0 END;
    v_eco_vs_street_percent_calc := CASE WHEN v_street_price > 0 THEN ((v_street_price - v_promo_price) / v_street_price) * 100 ELSE 0 END;

    -- BAD: Margin below minimum
    IF v_marge_brute_percent_calc < v_rules.minimum_gross_margin_percent THEN
      v_deal_status := 'bad';
      v_is_valid := false;
      v_validation_issues := v_validation_issues || jsonb_build_object(
        'issue', 'margin_too_low',
        'message', format('Marge brute %s%% < minimum %s%%', ROUND(v_marge_brute_percent_calc, 2), v_rules.minimum_gross_margin_percent)
      );

    -- BAD: Eco vs MSRP AND Eco vs Street both below minimum
    ELSIF v_eco_vs_msrp_percent_calc < v_rules.deal_min_eco_vs_msrp_percent
          AND v_eco_vs_street_percent_calc < v_rules.deal_min_eco_vs_street_price_percent THEN
      v_deal_status := 'bad';
      v_is_valid := false;
      v_validation_issues := v_validation_issues || jsonb_build_object(
        'issue', 'savings_too_low',
        'message', 'Économies insuffisantes vs MSRP et vs Street'
      );

    -- TOP: Margin >= target AND (Eco MSRP >= top threshold OR Eco Street >= top threshold)
    ELSIF v_marge_brute_percent_calc >= v_rules.target_gross_margin_percent
          AND (v_eco_vs_msrp_percent_calc >= v_rules.deal_top_eco_vs_msrp_percent
               OR v_eco_vs_street_percent_calc >= v_rules.deal_top_eco_vs_street_percent) THEN
      v_deal_status := 'top';
      v_is_valid := true;

    -- GOOD: Margin >= good threshold AND (Eco MSRP >= good threshold OR Eco Street >= good threshold)
    ELSIF v_marge_brute_percent_calc >= v_rules.deal_good_margin_percent
          AND (v_eco_vs_msrp_percent_calc >= v_rules.deal_good_eco_vs_msrp_percent
               OR v_eco_vs_street_percent_calc >= v_rules.deal_good_eco_vs_street_percent) THEN
      v_deal_status := 'good';
      v_is_valid := true;

    -- ALMOST: Margin OK but savings not quite good enough
    ELSE
      v_deal_status := 'almost';
      v_is_valid := true;
      v_validation_issues := v_validation_issues || jsonb_build_object(
        'issue', 'deal_marginal',
        'message', 'Deal acceptable mais pourrait être amélioré'
      );
    END IF;
  END;

  -- ============================================================================
  -- STEP 8: INSERT RECORD (only non-generated columns)
  -- ============================================================================

  INSERT INTO offer_item_calculated_costs (
    offer_id,
    item_id,
    ean,
    supplier_id,
    user_id,
    product_name,
    quantity,
    msrp,
    street_price,
    promo_price,
    purchase_price_ht,
    purchase_currency,
    currency_rate,
    currency_safety_coefficient,
    package_weight_kg,
    logistics_inbound_ht,
    logistics_inbound_carrier,
    customs_duty_ht,
    customs_duty_rate,
    tar_ht,
    pesa_fee_ht,
    warranty_cost_ht,
    payment_processing_fee_ht,
    deal_status,
    validation_issues
  ) VALUES (
    v_offer_id,
    NULL,  -- item_id is TEXT from WeWeb, table expects UUID
    v_ean,
    p_supplier_id,
    p_user_id,
    v_product_name,
    v_quantity,
    v_msrp,
    v_street_price,
    v_promo_price,
    v_purchase_price_ht,
    v_purchase_currency,
    v_currency_rate,
    v_currency_safety_coef,
    v_package_weight_kg,
    v_logistics_total_ht,
    v_logistics_carrier,
    v_customs_duty_ht,
    v_customs_rate,
    v_tar_ht,
    v_pesa_fee_ht,
    v_warranty_cost_ht,
    v_payment_fee_ht,
    v_deal_status,
    v_validation_issues
  )
  RETURNING cost_id INTO v_cost_id;

  -- ============================================================================
  -- STEP 9: RETURN SUCCESS RESPONSE
  -- ============================================================================

  RETURN jsonb_build_object(
    'success', true,
    'is_valid', v_is_valid,
    'deal_status', v_deal_status,
    'cost_id', v_cost_id,
    'validation_issues', v_validation_issues,
    'item_details', jsonb_build_object(
      'item_id', v_item_id,
      'ean', v_ean,
      'product_name', v_product_name
    ),
    'pricing', jsonb_build_object(
      'msrp', v_msrp,
      'street_price', v_street_price,
      'promo_price', v_promo_price,
      'purchase_price_original', v_purchase_price_ht,
      'purchase_currency', v_purchase_currency,
      'currency_rate', v_currency_rate
    ),
    'costs_breakdown', jsonb_build_object(
      'logistics_ht', ROUND(v_logistics_total_ht, 2),
      'customs_duty_ht', ROUND(v_customs_duty_ht, 2),
      'tar_ht', ROUND(v_tar_ht, 2),
      'pesa_fee_ht', ROUND(v_pesa_fee_ht, 2),
      'warranty_cost_ht', ROUND(v_warranty_cost_ht, 2),
      'payment_fee_ht', ROUND(v_payment_fee_ht, 2)
    ),
    'deal_thresholds', jsonb_build_object(
      'bad', jsonb_build_object(
        'min_margin', v_rules.minimum_gross_margin_percent,
        'min_eco_msrp', v_rules.deal_min_eco_vs_msrp_percent,
        'min_eco_street', v_rules.deal_min_eco_vs_street_price_percent
      ),
      'good', jsonb_build_object(
        'min_margin', v_rules.deal_good_margin_percent,
        'min_eco_msrp', v_rules.deal_good_eco_vs_msrp_percent,
        'min_eco_street', v_rules.deal_good_eco_vs_street_percent
      ),
      'top', jsonb_build_object(
        'min_margin', v_rules.target_gross_margin_percent,
        'min_eco_msrp', v_rules.deal_top_eco_vs_msrp_percent,
        'min_eco_street', v_rules.deal_top_eco_vs_street_percent
      )
    ),
    'applied_rule', jsonb_build_object(
      'rule_id', v_rules.id,
      'rule_name', v_rules.rule_name,
      'scope', v_rules.scope,
      'category', v_category_name,
      'subcategory', v_subcategory_name
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Validation function error',
      'details', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION validate_and_calculate_item IS 'Validates supplier item offer. Fixed: only inserts non-generated columns.';

DO $$
BEGIN
  RAISE NOTICE '✓ Function validate_and_calculate_item() updated - fixed column mapping';
END $$;

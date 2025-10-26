-- ============================================================================
-- Migration: Add deal status thresholds to odl_rules
-- Date: 2025-10-26
-- Description: Add configurable thresholds for TOP and GOOD deal statuses
-- ============================================================================

-- Add new columns for GOOD deal thresholds
ALTER TABLE odl_rules ADD COLUMN IF NOT EXISTS deal_good_margin_percent NUMERIC DEFAULT 25;
ALTER TABLE odl_rules ADD COLUMN IF NOT EXISTS deal_good_eco_vs_msrp_percent NUMERIC DEFAULT 30;
ALTER TABLE odl_rules ADD COLUMN IF NOT EXISTS deal_good_eco_vs_street_percent NUMERIC DEFAULT 18;

-- Add new columns for TOP deal thresholds
ALTER TABLE odl_rules ADD COLUMN IF NOT EXISTS deal_top_eco_vs_msrp_percent NUMERIC DEFAULT 40;
ALTER TABLE odl_rules ADD COLUMN IF NOT EXISTS deal_top_eco_vs_street_percent NUMERIC DEFAULT 25;

COMMENT ON COLUMN odl_rules.deal_good_margin_percent IS 'Marge minimum pour qualifier un deal comme "GOOD"';
COMMENT ON COLUMN odl_rules.deal_good_eco_vs_msrp_percent IS 'Économie MSRP minimum pour qualifier un deal comme "GOOD"';
COMMENT ON COLUMN odl_rules.deal_good_eco_vs_street_percent IS 'Économie Street minimum pour qualifier un deal comme "GOOD"';
COMMENT ON COLUMN odl_rules.deal_top_eco_vs_msrp_percent IS 'Économie MSRP pour qualifier un deal comme "TOP" (utilisé avec OU)';
COMMENT ON COLUMN odl_rules.deal_top_eco_vs_street_percent IS 'Économie Street pour qualifier un deal comme "TOP" (utilisé avec OU)';

-- Update existing global rule with default values
UPDATE odl_rules
SET
  deal_good_margin_percent = 25,
  deal_good_eco_vs_msrp_percent = 30,
  deal_good_eco_vs_street_percent = 18,
  deal_top_eco_vs_msrp_percent = 40,
  deal_top_eco_vs_street_percent = 25
WHERE scope = 'global';

-- ============================================================================
-- Update validate_and_calculate_item function to use configurable thresholds
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
  v_item_id UUID;
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
  v_purchase_price_chf_ht NUMERIC;

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
  v_item_id := (p_item_data->>'item_id')::UUID;
  v_ean := p_item_data->>'ean';

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

    v_purchase_price_chf_ht := v_purchase_price_ht * v_currency_rate * v_currency_safety_coef;
  ELSE
    v_currency_rate := 1.0;
    v_purchase_price_chf_ht := v_purchase_price_ht;
  END IF;

  -- ============================================================================
  -- STEP 4: CALCULATE LOGISTICS COSTS (using existing structure)
  -- ============================================================================

  -- Use default logistics rate from existing structure
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

  v_logistics_total_ht := COALESCE(v_logistics_total_ht, 10.0);

  -- ============================================================================
  -- STEP 5: CALCULATE CUSTOMS DUTY
  -- ============================================================================

  IF v_purchase_currency != 'CHF' AND v_category_name IS NOT NULL THEN
    SELECT duty_rate_percentage / 100.0 INTO v_customs_rate
    FROM odeal_customs_duty_rates
    WHERE category_name = v_category_name
      AND is_active = true
    LIMIT 1;

    v_customs_rate := COALESCE(v_customs_rate, 0);
    v_customs_duty_ht := v_purchase_price_chf_ht * v_customs_rate;
  END IF;

  -- ============================================================================
  -- STEP 6: CALCULATE PAYMENT PROCESSING FEES
  -- ============================================================================

  v_payment_fee_ht := (v_promo_price * (v_rules.payment_processing_fee_percent / 100.0))
                     + v_rules.payment_processing_fee_fixed_chf;

  -- ============================================================================
  -- STEP 7: CALCULATE COGS
  -- ============================================================================

  v_cogs_total_ht := v_purchase_price_chf_ht
                   + v_logistics_total_ht
                   + v_customs_duty_ht
                   + v_tar_ht
                   + v_pesa_fee_ht
                   + v_warranty_cost_ht
                   + v_payment_fee_ht;

  v_cogs_total_ttc := v_cogs_total_ht * 1.081;  -- TVA 8.1%

  -- ============================================================================
  -- STEP 8: CALCULATE MARGINS
  -- ============================================================================

  v_marge_brute_chf := v_promo_price - v_cogs_total_ttc;
  v_marge_brute_percent := (v_marge_brute_chf / v_promo_price) * 100;

  -- ============================================================================
  -- STEP 9: CALCULATE CUSTOMER SAVINGS
  -- ============================================================================

  v_eco_vs_msrp_chf := v_msrp - v_promo_price;
  v_eco_vs_msrp_percent := (v_eco_vs_msrp_chf / v_msrp) * 100;

  v_eco_vs_street_chf := v_street_price - v_promo_price;
  v_eco_vs_street_percent := (v_eco_vs_street_chf / v_street_price) * 100;

  -- ============================================================================
  -- STEP 10: VALIDATE DEAL (using hierarchical rules with configurable thresholds)
  -- ============================================================================

  IF v_marge_brute_percent < v_rules.minimum_gross_margin_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'margin_too_low',
      'message', format('Marge brute trop faible: %s%% (min: %s%%)',
                       ROUND(v_marge_brute_percent, 2),
                       v_rules.minimum_gross_margin_percent)
    );
  END IF;

  IF v_eco_vs_msrp_percent < v_rules.deal_min_eco_vs_msrp_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'savings_too_low_msrp',
      'message', format('Économie client trop faible vs MSRP: %s%% (min: %s%%)',
                       ROUND(v_eco_vs_msrp_percent, 2),
                       v_rules.deal_min_eco_vs_msrp_percent)
    );
  END IF;

  IF v_eco_vs_street_percent < v_rules.deal_min_eco_vs_street_price_percent THEN
    v_validation_issues := v_validation_issues || jsonb_build_object(
      'type', 'savings_too_low_street',
      'message', format('Économie client trop faible vs Street: %s%% (min: %s%%)',
                       ROUND(v_eco_vs_street_percent, 2),
                       v_rules.deal_min_eco_vs_street_price_percent)
    );
  END IF;

  -- Determine deal status using CONFIGURABLE thresholds
  IF jsonb_array_length(v_validation_issues) > 0 THEN
    v_deal_status := 'bad';
    v_is_valid := false;
  ELSIF v_marge_brute_percent >= v_rules.target_gross_margin_percent
        AND (v_eco_vs_msrp_percent >= v_rules.deal_top_eco_vs_msrp_percent
             OR v_eco_vs_street_percent >= v_rules.deal_top_eco_vs_street_percent) THEN
    v_deal_status := 'top';
    v_is_valid := true;
  ELSIF v_marge_brute_percent >= v_rules.deal_good_margin_percent
        AND v_eco_vs_msrp_percent >= v_rules.deal_good_eco_vs_msrp_percent
        AND v_eco_vs_street_percent >= v_rules.deal_good_eco_vs_street_percent THEN
    v_deal_status := 'good';
    v_is_valid := true;
  ELSE
    v_deal_status := 'almost';
    v_is_valid := true;
  END IF;

  -- ============================================================================
  -- STEP 11: RETURN RESULT
  -- ============================================================================

  v_cost_id := gen_random_uuid();

  RETURN jsonb_build_object(
    'success', true,
    'is_valid', v_is_valid,
    'deal_status', v_deal_status,
    'cost_id', v_cost_id,
    'offer_id', v_offer_id,
    'item_id', v_item_id,
    'costs', jsonb_build_object(
      'purchase_price_ht', v_purchase_price_ht,
      'purchase_price_chf_ht', ROUND(v_purchase_price_chf_ht, 2),
      'currency_rate', v_currency_rate,
      'currency_safety_coef', v_currency_safety_coef,
      'logistics_total_ht', v_logistics_total_ht,
      'logistics_carrier', v_logistics_carrier,
      'customs_duty_ht', ROUND(v_customs_duty_ht, 2),
      'customs_duty_rate', v_customs_rate,
      'tar_ht', v_tar_ht,
      'pesa_fee_ht', v_pesa_fee_ht,
      'warranty_cost_ht', v_warranty_cost_ht,
      'payment_fee_ht', ROUND(v_payment_fee_ht, 2),
      'cogs_total_ht', ROUND(v_cogs_total_ht, 2),
      'cogs_total_ttc', ROUND(v_cogs_total_ttc, 2)
    ),
    'margins', jsonb_build_object(
      'marge_brute_chf', ROUND(v_marge_brute_chf, 2),
      'marge_brute_percent', ROUND(v_marge_brute_percent, 2),
      'minimum_margin', v_rules.minimum_gross_margin_percent,
      'target_margin', v_rules.target_gross_margin_percent
    ),
    'savings', jsonb_build_object(
      'eco_vs_msrp_chf', ROUND(v_eco_vs_msrp_chf, 2),
      'eco_vs_msrp_percent', ROUND(v_eco_vs_msrp_percent, 2),
      'eco_vs_street_chf', ROUND(v_eco_vs_street_chf, 2),
      'eco_vs_street_percent', ROUND(v_eco_vs_street_percent, 2)
    ),
    'metadata', jsonb_build_object(
      'validated_at', NOW(),
      'supplier_id', p_supplier_id,
      'user_id', p_user_id,
      'product_name', v_product_name,
      'ean', v_ean,
      'package_weight_kg', v_package_weight_kg,
      'quantity', v_quantity,
      'category_name', v_category_name,
      'subcategory_name', v_subcategory_name,
      'rule_scope', v_rules.scope,
      'rule_id', v_rules.id,
      'gaming_detected', false
    ),
    'validation_issues', v_validation_issues,
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
    )
  );

END;
$$;

GRANT EXECUTE ON FUNCTION validate_and_calculate_item TO authenticated, service_role;

COMMENT ON FUNCTION validate_and_calculate_item IS
  'Validates supplier offer item with hierarchical business rules and configurable deal status thresholds';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Deal status thresholds added to odl_rules';
  RAISE NOTICE '✓ Function validate_and_calculate_item() updated with configurable thresholds';
END $$;

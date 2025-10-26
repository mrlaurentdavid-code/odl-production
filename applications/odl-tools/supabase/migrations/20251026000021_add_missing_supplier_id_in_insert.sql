-- Migration: Add missing supplier_id in INSERT statement
-- Date: 2025-10-26
-- Issue: Migration 16 forgot to include supplier_id in INSERT column list
-- Solution: Add supplier_id column and v_supplier_id value to INSERT

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
  -- Input variables
  v_offer_id UUID;
  v_supplier_id UUID;  -- Will use p_supplier_id parameter
  v_item_id TEXT;
  v_item_id_uuid UUID;
  v_ean TEXT;
  v_product_name TEXT;
  v_category_name TEXT;
  v_subcategory_name TEXT;
  v_category_id TEXT;
  v_subcategory_id TEXT;
  v_msrp NUMERIC;
  v_street_price NUMERIC;
  v_promo_price NUMERIC;
  v_purchase_price_ht NUMERIC;
  v_purchase_currency TEXT;
  v_quantity INTEGER;
  v_package_weight_kg NUMERIC;
  v_pesa_fee_ht NUMERIC;
  v_warranty_cost_ht NUMERIC;

  -- Calculation variables
  v_currency_rate NUMERIC;
  v_purchase_price_chf_ht NUMERIC;
  v_customs_duty_rate NUMERIC;
  v_customs_duty_ht NUMERIC;
  v_transport_cost_ht NUMERIC;
  v_receiving_cost_ht NUMERIC;
  v_preparation_cost_ht NUMERIC;
  v_logistics_total_ht NUMERIC;
  v_cogs_ht NUMERIC;
  v_promo_price_ht NUMERIC;
  v_marge_brute_ht NUMERIC;
  v_marge_brute_percent NUMERIC;
  v_payment_processing_fee_ht NUMERIC;

  -- Rule matching variables
  v_rule RECORD;
  v_deal_status TEXT;
  v_is_valid BOOLEAN;

  -- Output variables
  v_cost_id UUID;
  v_validation_issues TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Extract input data
  v_offer_id := (p_item_data->>'offer_id')::UUID;
  v_supplier_id := p_supplier_id;  -- FIXED: Use parameter instead of JSONB
  v_item_id := p_item_data->>'item_id';
  v_ean := p_item_data->>'ean';
  v_product_name := p_item_data->>'product_name';
  v_category_id := p_item_data->>'category_id';
  v_subcategory_id := p_item_data->>'subcategory_id';
  v_category_name := p_item_data->>'category_name';
  v_subcategory_name := p_item_data->>'subcategory_name';
  v_msrp := (p_item_data->>'msrp')::NUMERIC;
  v_street_price := (p_item_data->>'street_price')::NUMERIC;
  v_promo_price := (p_item_data->>'promo_price')::NUMERIC;
  v_purchase_price_ht := (p_item_data->>'purchase_price_ht')::NUMERIC;
  v_purchase_currency := COALESCE(p_item_data->>'purchase_currency', 'CHF');
  v_quantity := COALESCE((p_item_data->>'quantity')::INTEGER, 1);
  v_package_weight_kg := COALESCE((p_item_data->>'package_weight_kg')::NUMERIC, 0.5);
  v_pesa_fee_ht := COALESCE((p_item_data->>'pesa_fee_ht')::NUMERIC, 0);
  v_warranty_cost_ht := COALESCE((p_item_data->>'warranty_cost_ht')::NUMERIC, 0);

  -- Lookup category/subcategory from IDs if provided
  IF v_subcategory_id IS NOT NULL AND v_subcategory_id != '' THEN
    -- Try product subcategories first
    SELECT s.name, c.name, c.category_id INTO v_subcategory_name, v_category_name, v_category_id
    FROM odl_product_subcategories s
    JOIN odl_product_categories c ON s.category_id = c.category_id
    WHERE s.subcategory_id = v_subcategory_id AND s.is_active = true;

    -- If not found, try service subcategories
    IF v_subcategory_name IS NULL THEN
      SELECT s.name, c.name, c.category_id INTO v_subcategory_name, v_category_name, v_category_id
      FROM odl_service_subcategories s
      JOIN odl_service_categories c ON s.category_id = c.category_id
      WHERE s.subcategory_id = v_subcategory_id AND s.is_active = true;
    END IF;

    IF v_subcategory_name IS NULL THEN
      v_validation_issues := array_append(v_validation_issues,
        format('Subcategory ID %s not found in database', v_subcategory_id));
    END IF;
  ELSIF v_category_id IS NOT NULL AND v_category_id != '' THEN
    -- Only category_id provided, lookup category name
    SELECT name INTO v_category_name
    FROM odl_product_categories
    WHERE category_id = v_category_id AND is_active = true;

    IF v_category_name IS NULL THEN
      SELECT name INTO v_category_name
      FROM odl_service_categories
      WHERE category_id = v_category_id AND is_active = true;
    END IF;

    IF v_category_name IS NULL THEN
      v_validation_issues := array_append(v_validation_issues,
        format('Category ID %s not found in database', v_category_id));
    END IF;
  END IF;

  -- Auto-generate UUID if item_id is NULL or empty
  IF v_item_id IS NULL OR v_item_id = '' THEN
    v_item_id_uuid := gen_random_uuid();
  ELSE
    -- item_id is TEXT from WeWeb, we always generate a new UUID for the database
    v_item_id_uuid := gen_random_uuid();
  END IF;

  -- Use EAN as fallback if not provided
  IF v_ean IS NULL OR v_ean = '' THEN
    v_ean := v_item_id;
  END IF;

  -- Validate required fields
  IF v_offer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required field: offer_id'
    );
  END IF;

  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required field: supplier_id'
    );
  END IF;

  -- Validate prices are positive
  IF v_msrp <= 0 OR v_street_price <= 0 OR v_promo_price <= 0 OR v_purchase_price_ht <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'All prices must be positive numbers'
    );
  END IF;

  -- Get currency conversion rate (removed ORDER BY effective_date)
  SELECT rate INTO v_currency_rate
  FROM currency_rates
  WHERE from_currency = v_purchase_currency
    AND to_currency = 'CHF'
    AND is_active = true
  LIMIT 1;

  IF v_currency_rate IS NULL THEN
    v_currency_rate := 1.0;
    v_validation_issues := array_append(v_validation_issues,
      format('Currency rate not found for %s, using 1.0', v_purchase_currency));
  END IF;

  -- Convert purchase price to CHF with security coefficient
  v_purchase_price_chf_ht := v_purchase_price_ht * v_currency_rate * 1.02;

  -- Get customs duty rate based on subcategory_id (if provided)
  IF v_subcategory_id IS NOT NULL AND v_subcategory_id != '' THEN
    SELECT duty_percent INTO v_customs_duty_rate
    FROM odeal_customs_duty_rates
    WHERE subcategory_id = v_subcategory_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Fallback to category_name if no rate found with subcategory_id
  IF v_customs_duty_rate IS NULL AND v_category_name IS NOT NULL THEN
    SELECT duty_percent INTO v_customs_duty_rate
    FROM odeal_customs_duty_rates cdr
    JOIN odl_product_subcategories ps ON ps.subcategory_id = cdr.subcategory_id
    JOIN odl_product_categories pc ON pc.category_id = ps.category_id
    WHERE pc.name = v_category_name
      AND cdr.is_active = true
    LIMIT 1;
  END IF;

  IF v_customs_duty_rate IS NULL THEN
    v_customs_duty_rate := 0;
    IF v_category_name IS NOT NULL THEN
      v_validation_issues := array_append(v_validation_issues,
        format('Customs duty rate not found for category %s, using 0%%', v_category_name));
    END IF;
  END IF;

  v_customs_duty_ht := v_purchase_price_chf_ht * (v_customs_duty_rate / 100);

  -- Calculate logistics costs
  v_transport_cost_ht := v_package_weight_kg * 15.0;
  v_receiving_cost_ht := 5.0;
  v_preparation_cost_ht := 3.0;
  v_logistics_total_ht := v_transport_cost_ht + v_receiving_cost_ht + v_preparation_cost_ht;

  -- Calculate payment processing fee
  v_payment_processing_fee_ht := (v_promo_price * 0.015) + 0.30;

  -- Calculate total COGS
  v_cogs_ht := v_purchase_price_chf_ht + v_customs_duty_ht + v_logistics_total_ht
    + v_pesa_fee_ht + v_warranty_cost_ht + v_payment_processing_fee_ht;

  -- Convert promo price to HT
  v_promo_price_ht := v_promo_price / 1.081;

  -- Calculate margins
  v_marge_brute_ht := v_promo_price_ht - v_cogs_ht;
  v_marge_brute_percent := (v_marge_brute_ht / v_promo_price_ht) * 100;

  -- Find applicable business rule using IDs
  SELECT
    *,
    deal_good_margin_percent AS margin_good_min,
    minimum_gross_margin_percent AS margin_almost_min,
    target_gross_margin_percent AS margin_top_min,
    id AS rule_id
  INTO v_rule
  FROM odl_rules
  WHERE is_active = true
    AND (
      (scope = 'subcategory' AND category_id = v_category_id AND subcategory_id = v_subcategory_id)
      OR (scope = 'category' AND category_id = v_category_id AND subcategory_id IS NULL)
      OR (scope = 'global' AND category_id IS NULL AND subcategory_id IS NULL)
    )
  ORDER BY
    CASE scope
      WHEN 'subcategory' THEN 1
      WHEN 'category' THEN 2
      WHEN 'global' THEN 3
    END
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No business rule found for validation'
    );
  END IF;

  -- Determine deal status
  IF v_marge_brute_percent >= v_rule.margin_top_min THEN
    v_deal_status := 'top';
    v_is_valid := true;
  ELSIF v_marge_brute_percent >= v_rule.margin_good_min THEN
    v_deal_status := 'good';
    v_is_valid := true;
  ELSIF v_marge_brute_percent >= v_rule.margin_almost_min THEN
    v_deal_status := 'almost';
    v_is_valid := false;
    v_validation_issues := array_append(v_validation_issues,
      format('Margin %s%% is below good threshold (%s%%) but above minimum (%s%%)',
        round(v_marge_brute_percent::numeric, 2), round(v_rule.margin_good_min::numeric, 2), round(v_rule.margin_almost_min::numeric, 2)));
  ELSE
    v_deal_status := 'bad';
    v_is_valid := false;
    v_validation_issues := array_append(v_validation_issues,
      format('Margin %s%% is below minimum threshold (%s%%)',
        round(v_marge_brute_percent::numeric, 2), round(v_rule.margin_almost_min::numeric, 2)));
  END IF;

  -- Insert calculated costs (FIXED: Added supplier_id column and v_supplier_id value)
  INSERT INTO offer_item_calculated_costs (
    offer_id, item_id, supplier_id, ean, product_name, category_id, category_name,
    subcategory_id, subcategory_name, quantity, msrp, street_price, promo_price,
    purchase_price_original, purchase_currency, currency_rate, purchase_price_chf_ht,
    package_weight_kg, customs_duty_rate_percent, customs_duty_ht, transport_cost_ht,
    receiving_cost_ht, preparation_cost_ht, logistics_total_ht, pesa_fee_ht,
    warranty_cost_ht, payment_processing_fee_ht, cogs_ht, promo_price_ht,
    marge_brute_ht, marge_brute_percent, deal_status, is_publishable, applied_rule_id, validation_notes
  ) VALUES (
    v_offer_id, v_item_id_uuid, v_supplier_id, v_ean, v_product_name, v_category_id, v_category_name,
    v_subcategory_id, v_subcategory_name, v_quantity, v_msrp, v_street_price, v_promo_price,
    v_purchase_price_ht, v_purchase_currency, v_currency_rate, v_purchase_price_chf_ht,
    v_package_weight_kg, v_customs_duty_rate, v_customs_duty_ht, v_transport_cost_ht,
    v_receiving_cost_ht, v_preparation_cost_ht, v_logistics_total_ht, v_pesa_fee_ht,
    v_warranty_cost_ht, v_payment_processing_fee_ht, v_cogs_ht, v_promo_price_ht,
    v_marge_brute_ht, v_marge_brute_percent, v_deal_status, v_is_valid, v_rule.rule_id,
    array_to_string(v_validation_issues, '; ')
  )
  RETURNING cost_id INTO v_cost_id;

  -- Return validation result
  RETURN jsonb_build_object(
    'success', true,
    'is_valid', v_is_valid,
    'deal_status', v_deal_status,
    'cost_id', v_cost_id,
    'generated_item_id', v_item_id_uuid,
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
    'applied_rule', jsonb_build_object(
      'rule_id', v_rule.rule_id,
      'rule_name', v_rule.rule_name,
      'scope', v_rule.scope,
      'category', v_rule.category_name,
      'subcategory', v_rule.subcategory_name
    )
  );
END;
$$;

COMMENT ON FUNCTION validate_and_calculate_item(UUID, UUID, JSONB) IS
'Validates supplier item offer. Uses p_supplier_id parameter from API key. Accepts category_id/subcategory_id and looks up names. Auto-generates UUID for item_id when NULL. Returns generated_item_id in response. FIXED: Added supplier_id in INSERT statement.';

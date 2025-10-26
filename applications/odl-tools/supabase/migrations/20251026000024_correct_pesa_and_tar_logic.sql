-- Migration: Correct PESA and TAR logic
-- Date: 2025-10-26
-- Purpose:
--   1. Remove fake customs duty calculation (always 0)
--   2. Calculate PESA fees from customs_fees table if shipping_origin != 'CH'
--   3. TAR is provided by WeWeb (from TAR API call) - not calculated here
--   4. PESA fees per unit = total PESA / quantity

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
  v_supplier_id UUID;
  v_user_id UUID;
  v_item_id TEXT;
  v_item_id_uuid UUID;
  v_variant_id UUID;
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
  v_length_cm NUMERIC;
  v_width_cm NUMERIC;
  v_height_cm NUMERIC;
  v_shipping_origin TEXT;
  v_contain_battery BOOLEAN;
  v_battery_type TEXT;
  v_pesa_fee_ht NUMERIC;
  v_warranty_cost_ht NUMERIC;
  v_tar_ht NUMERIC;

  -- Calculation variables
  v_currency_rate NUMERIC;
  v_purchase_price_chf_ht NUMERIC;
  v_customs_duty_rate NUMERIC := 0;  -- Always 0 (no customs duty calculation)
  v_customs_duty_ht NUMERIC := 0;    -- Always 0
  v_transport_cost_ht NUMERIC;
  v_receiving_cost_ht NUMERIC;
  v_preparation_cost_ht NUMERIC;
  v_logistics_total_ht NUMERIC;
  v_logistics_inbound_ht NUMERIC;
  v_logistics_inbound_carrier TEXT;
  v_logistics_outbound_ht NUMERIC;
  v_logistics_outbound_carrier TEXT;
  v_tar_rate NUMERIC := 0;
  v_cogs_ht NUMERIC;
  v_promo_price_ht NUMERIC;
  v_marge_brute_ht NUMERIC;
  v_marge_brute_percent NUMERIC;
  v_payment_processing_fee_ht NUMERIC;

  -- PESA fees variables
  v_pesa_admin_base NUMERIC := 0;
  v_pesa_gestion_droits NUMERIC := 0;
  v_pesa_gestion_tva NUMERIC := 0;
  v_pesa_total NUMERIC := 0;
  v_pesa_per_unit NUMERIC := 0;
  v_merchandise_value NUMERIC;

  -- Rule matching variables
  v_rule RECORD;
  v_deal_status TEXT;
  v_is_valid BOOLEAN;

  -- Output variables
  v_cost_id UUID;
  v_validation_issues TEXT[] := ARRAY[]::TEXT[];
  v_validation_message_key TEXT;
BEGIN
  -- Extract input data
  v_offer_id := (p_item_data->>'offer_id')::UUID;
  v_supplier_id := p_supplier_id;
  v_user_id := p_user_id;
  v_item_id := p_item_data->>'item_id';
  v_variant_id := (p_item_data->>'variant_id')::UUID;
  v_ean := p_item_data->>'ean';
  v_product_name := p_item_data->>'product_name';
  v_msrp := (p_item_data->>'msrp')::NUMERIC;
  v_street_price := (p_item_data->>'street_price')::NUMERIC;
  v_promo_price := (p_item_data->>'promo_price')::NUMERIC;
  v_purchase_price_ht := (p_item_data->>'purchase_price_ht')::NUMERIC;
  v_purchase_currency := COALESCE(p_item_data->>'purchase_currency', 'CHF');
  v_quantity := COALESCE((p_item_data->>'quantity')::INTEGER, 1);
  v_package_weight_kg := COALESCE((p_item_data->>'package_weight_kg')::NUMERIC, 0.5);
  v_length_cm := (p_item_data->>'length_cm')::NUMERIC;
  v_width_cm := (p_item_data->>'width_cm')::NUMERIC;
  v_height_cm := (p_item_data->>'height_cm')::NUMERIC;
  v_shipping_origin := UPPER(COALESCE(p_item_data->>'shipping_origin', 'CH'));
  v_contain_battery := COALESCE((p_item_data->>'contain_battery')::BOOLEAN, false);
  v_battery_type := p_item_data->>'battery_type';
  v_warranty_cost_ht := COALESCE((p_item_data->>'warranty_cost_ht')::NUMERIC, 0);
  v_tar_ht := COALESCE((p_item_data->>'tar_ht')::NUMERIC, 0);  -- Provided by WeWeb from TAR API

  -- SMART DETECTION: Check if category_name/subcategory_name are actually IDs
  v_category_id := p_item_data->>'category_id';
  v_subcategory_id := p_item_data->>'subcategory_id';
  v_category_name := p_item_data->>'category_name';
  v_subcategory_name := p_item_data->>'subcategory_name';

  IF v_category_id IS NULL AND v_category_name ~ '^c[0-9]+$' THEN
    v_category_id := v_category_name;
    v_category_name := NULL;
  END IF;

  IF v_subcategory_id IS NULL AND v_subcategory_name ~ '^s[0-9]+$' THEN
    v_subcategory_id := v_subcategory_name;
    v_subcategory_name := NULL;
  END IF;

  -- Lookup category/subcategory names from IDs
  IF v_subcategory_id IS NOT NULL AND v_subcategory_id != '' THEN
    SELECT s.name, c.name, c.category_id INTO v_subcategory_name, v_category_name, v_category_id
    FROM odl_product_subcategories s
    JOIN odl_product_categories c ON s.category_id = c.category_id
    WHERE s.subcategory_id = v_subcategory_id AND s.is_active = true;

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

  -- Auto-generate UUID for item_id
  v_item_id_uuid := gen_random_uuid();

  -- Use EAN as fallback
  IF v_ean IS NULL OR v_ean = '' THEN
    v_ean := v_item_id;
  END IF;

  -- Validate required fields
  IF v_offer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required field: offer_id');
  END IF;

  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required field: supplier_id');
  END IF;

  IF v_msrp <= 0 OR v_street_price <= 0 OR v_promo_price <= 0 OR v_purchase_price_ht <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'All prices must be positive numbers');
  END IF;

  -- Get currency conversion rate
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

  -- Calculate merchandise value for PESA (purchase price * quantity)
  v_merchandise_value := v_purchase_price_chf_ht * v_quantity;

  -- PESA FEES LOGIC: Only if shipping_origin != 'CH'
  IF v_shipping_origin != 'CH' THEN
    -- Admin base fee
    SELECT value INTO v_pesa_admin_base
    FROM customs_fees
    WHERE provider_id = 'pesa' AND fee_type = 'admin_base' AND is_active = true;

    -- Gestion droits (3.5% with min CHF 5)
    DECLARE
      v_droits_taux NUMERIC;
      v_droits_min NUMERIC;
    BEGIN
      SELECT value INTO v_droits_taux
      FROM customs_fees
      WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_taux' AND is_active = true;

      SELECT value INTO v_droits_min
      FROM customs_fees
      WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_min' AND is_active = true;

      v_pesa_gestion_droits := GREATEST(v_merchandise_value * v_droits_taux, v_droits_min);
    END;

    -- Gestion TVA (2.5% with min CHF 5)
    DECLARE
      v_tva_taux NUMERIC;
      v_tva_min NUMERIC;
    BEGIN
      SELECT value INTO v_tva_taux
      FROM customs_fees
      WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_taux' AND is_active = true;

      SELECT value INTO v_tva_min
      FROM customs_fees
      WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_min' AND is_active = true;

      v_pesa_gestion_tva := GREATEST(v_merchandise_value * v_tva_taux, v_tva_min);
    END;

    -- Total PESA fees
    v_pesa_total := COALESCE(v_pesa_admin_base, 0) + COALESCE(v_pesa_gestion_droits, 0) + COALESCE(v_pesa_gestion_tva, 0);

    -- PESA per unit
    v_pesa_per_unit := v_pesa_total / v_quantity;

    v_validation_issues := array_append(v_validation_issues,
      format('Import from %s - PESA fees applied: CHF %s total (CHF %s per unit)',
        v_shipping_origin, ROUND(v_pesa_total, 2), ROUND(v_pesa_per_unit, 2)));
  ELSE
    v_pesa_total := 0;
    v_pesa_per_unit := 0;
    v_validation_issues := array_append(v_validation_issues,
      'Shipping from Switzerland - no PESA fees');
  END IF;

  -- Use PESA per unit as pesa_fee_ht
  v_pesa_fee_ht := v_pesa_per_unit;

  -- TAR: Already provided by WeWeb (from TAR API)
  IF v_contain_battery AND v_tar_ht = 0 THEN
    v_validation_issues := array_append(v_validation_issues,
      'Battery detected but no TAR provided - TAR should be calculated via TAR API');
  END IF;

  v_tar_rate := v_tar_ht;  -- Store as rate for consistency

  -- Calculate logistics costs
  v_transport_cost_ht := v_package_weight_kg * 15.0;
  v_receiving_cost_ht := 5.0;
  v_preparation_cost_ht := 3.0;
  v_logistics_total_ht := v_transport_cost_ht + v_receiving_cost_ht + v_preparation_cost_ht;

  v_logistics_inbound_ht := v_transport_cost_ht;
  v_logistics_inbound_carrier := 'Standard';
  v_logistics_outbound_ht := v_receiving_cost_ht + v_preparation_cost_ht;
  v_logistics_outbound_carrier := 'Swiss Post';

  -- Calculate payment processing fee
  v_payment_processing_fee_ht := (v_promo_price * 0.015) + 0.30;

  -- Calculate total COGS (including PESA and TAR)
  v_cogs_ht := v_purchase_price_chf_ht + v_logistics_total_ht
    + v_tar_ht + v_pesa_fee_ht + v_warranty_cost_ht + v_payment_processing_fee_ht;

  -- Convert promo price to HT
  v_promo_price_ht := v_promo_price / 1.081;

  -- Calculate margins
  v_marge_brute_ht := v_promo_price_ht - v_cogs_ht;
  v_marge_brute_percent := (v_marge_brute_ht / v_promo_price_ht) * 100;

  -- Find applicable business rule
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
    RETURN jsonb_build_object('success', false, 'error', 'No business rule found for validation');
  END IF;

  -- Determine deal status
  IF v_marge_brute_percent >= v_rule.margin_top_min THEN
    v_deal_status := 'top';
    v_is_valid := true;
    v_validation_message_key := 'deal_top';
  ELSIF v_marge_brute_percent >= v_rule.margin_good_min THEN
    v_deal_status := 'good';
    v_is_valid := true;
    v_validation_message_key := 'deal_good';
  ELSIF v_marge_brute_percent >= v_rule.margin_almost_min THEN
    v_deal_status := 'almost';
    v_is_valid := false;
    v_validation_message_key := 'deal_almost';
    v_validation_issues := array_append(v_validation_issues,
      format('Margin %s%% is below good threshold (%s%%) but above minimum (%s%%)',
        round(v_marge_brute_percent::numeric, 2),
        round(v_rule.margin_good_min::numeric, 2),
        round(v_rule.margin_almost_min::numeric, 2)));
  ELSE
    v_deal_status := 'bad';
    v_is_valid := false;
    v_validation_message_key := 'deal_bad';
    v_validation_issues := array_append(v_validation_issues,
      format('Margin %s%% is below minimum threshold (%s%%)',
        round(v_marge_brute_percent::numeric, 2),
        round(v_rule.margin_almost_min::numeric, 2)));
  END IF;

  -- Insert calculated costs WITH ALL FIELDS
  INSERT INTO offer_item_calculated_costs (
    offer_id, item_id, variant_id, supplier_id, user_id,
    ean, product_name, category_id, category_name,
    subcategory_id, subcategory_name, quantity,
    msrp, street_price, promo_price,
    purchase_price_original, purchase_currency, currency_rate,
    currency_safety_coefficient, purchase_price_chf_ht,
    package_weight_kg, length_cm, width_cm, height_cm,
    shipping_origin, contain_battery, battery_type,
    customs_duty_rate_percent, customs_duty_ht,
    tar_rate, tar_ht,
    transport_cost_ht, receiving_cost_ht, preparation_cost_ht, logistics_total_ht,
    logistics_inbound_ht, logistics_inbound_carrier,
    logistics_outbound_ht, logistics_outbound_carrier,
    pesa_fee_ht, warranty_cost_ht, payment_processing_fee_ht,
    cogs_ht, promo_price_ht,
    marge_brute_ht, marge_brute_percent,
    deal_status, is_publishable,
    applied_rule_id, validation_message_key, validation_notes
  ) VALUES (
    v_offer_id, v_item_id_uuid, v_variant_id, v_supplier_id, v_user_id,
    v_ean, v_product_name, v_category_id, v_category_name,
    v_subcategory_id, v_subcategory_name, v_quantity,
    v_msrp, v_street_price, v_promo_price,
    v_purchase_price_ht, v_purchase_currency, v_currency_rate,
    1.02, v_purchase_price_chf_ht,
    v_package_weight_kg, v_length_cm, v_width_cm, v_height_cm,
    v_shipping_origin, v_contain_battery, v_battery_type,
    v_customs_duty_rate, v_customs_duty_ht,
    v_tar_rate, v_tar_ht,
    v_transport_cost_ht, v_receiving_cost_ht, v_preparation_cost_ht, v_logistics_total_ht,
    v_logistics_inbound_ht, v_logistics_inbound_carrier,
    v_logistics_outbound_ht, v_logistics_outbound_carrier,
    v_pesa_fee_ht, v_warranty_cost_ht, v_payment_processing_fee_ht,
    v_cogs_ht, v_promo_price_ht,
    v_marge_brute_ht, v_marge_brute_percent,
    v_deal_status, v_is_valid,
    v_rule.rule_id, v_validation_message_key, array_to_string(v_validation_issues, '; ')
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
      'product_name', v_product_name,
      'category_id', v_category_id,
      'category_name', v_category_name,
      'subcategory_id', v_subcategory_id,
      'subcategory_name', v_subcategory_name
    ),
    'pricing', jsonb_build_object(
      'msrp', v_msrp,
      'street_price', v_street_price,
      'promo_price', v_promo_price,
      'purchase_price_original', v_purchase_price_ht,
      'purchase_currency', v_purchase_currency,
      'currency_rate', v_currency_rate
    ),
    'costs', jsonb_build_object(
      'purchase_price_chf_ht', v_purchase_price_chf_ht,
      'pesa_fee_total', ROUND(v_pesa_total, 2),
      'pesa_fee_per_unit', ROUND(v_pesa_per_unit, 2),
      'tar_ht', v_tar_ht,
      'logistics_total_ht', v_logistics_total_ht,
      'cogs_ht', v_cogs_ht
    ),
    'margins', jsonb_build_object(
      'marge_brute_ht', v_marge_brute_ht,
      'marge_brute_percent', v_marge_brute_percent
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
'Complete validation with smart category detection, proper PESA fees calculation from customs_fees table (only if shipping_origin != CH), TAR provided by WeWeb from TAR API, and customs duty always 0.';

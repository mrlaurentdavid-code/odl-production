-- Migration: Fix battery field name inconsistency (CORRECTED V2)
-- Date: 2025-10-26
-- Purpose:
--   Fix the inconsistency between API (has_battery) and SQL function (contain_battery)
--   The function should read 'has_battery' from JSONB, not 'contain_battery'
--   ALSO: Fix table names (use odl_product_categories/odl_product_subcategories)
--   ALSO: Read contain_electronic from JSONB

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
  v_contain_electronic BOOLEAN;  -- ADDED
  v_has_battery BOOLEAN;          -- RENAMED from v_contain_battery
  v_battery_type TEXT;
  v_pesa_fee_ht NUMERIC;
  v_warranty_cost_ht NUMERIC;
  v_tar_ht NUMERIC;

  -- Calculation variables
  v_currency_rate NUMERIC;
  v_purchase_price_chf_ht NUMERIC;
  v_customs_duty_rate NUMERIC := 0;
  v_customs_duty_ht NUMERIC := 0;
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

  -- FIX: Read 'has_battery' instead of 'contain_battery'
  v_contain_electronic := COALESCE((p_item_data->>'contain_electronic')::BOOLEAN, false);
  v_has_battery := COALESCE((p_item_data->>'has_battery')::BOOLEAN, false);
  v_battery_type := p_item_data->>'battery_type';

  v_warranty_cost_ht := COALESCE((p_item_data->>'warranty_cost_ht')::NUMERIC, 0);
  v_tar_ht := COALESCE((p_item_data->>'tar_ht')::NUMERIC, 0);

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
  END IF;

  IF v_category_id IS NOT NULL AND v_category_id != '' AND v_category_name IS NULL THEN
    SELECT name INTO v_category_name FROM odl_product_categories WHERE category_id = v_category_id AND is_active = true;

    IF v_category_name IS NULL THEN
      SELECT name INTO v_category_name FROM odl_service_categories WHERE category_id = v_category_id AND is_active = true;
    END IF;
  END IF;

  -- Get currency rate
  SELECT rate INTO v_currency_rate
  FROM currency_rates
  WHERE currency_code = v_purchase_currency
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_currency_rate IS NULL THEN
    v_currency_rate := 1.0;
  END IF;

  -- Calculate purchase price in CHF
  v_purchase_price_chf_ht := v_purchase_price_ht * v_currency_rate;

  -- Calculate logistics costs
  v_transport_cost_ht := 4.50;
  v_receiving_cost_ht := 5.0;
  v_preparation_cost_ht := 3.0;
  v_logistics_inbound_ht := v_transport_cost_ht;
  v_logistics_inbound_carrier := 'Standard';
  v_logistics_outbound_ht := 8.0;
  v_logistics_outbound_carrier := 'Swiss Post';
  v_logistics_total_ht := v_transport_cost_ht + v_receiving_cost_ht + v_preparation_cost_ht;

  -- Calculate PESA fees if shipping from abroad
  IF v_shipping_origin != 'CH' AND v_shipping_origin != 'SWITZERLAND' THEN
    v_merchandise_value := v_purchase_price_chf_ht * v_quantity;

    SELECT
      admin_base_fee,
      gestion_droits_percent,
      gestion_tva_percent
    INTO
      v_pesa_admin_base,
      v_pesa_gestion_droits,
      v_pesa_gestion_tva
    FROM customs_fees
    WHERE country_code = v_shipping_origin
    LIMIT 1;

    IF v_pesa_admin_base IS NULL THEN
      SELECT
        admin_base_fee,
        gestion_droits_percent,
        gestion_tva_percent
      INTO
        v_pesa_admin_base,
        v_pesa_gestion_droits,
        v_pesa_gestion_tva
      FROM customs_fees
      WHERE country_code = 'DEFAULT'
      LIMIT 1;
    END IF;

    v_pesa_total := v_pesa_admin_base +
                    (v_merchandise_value * v_pesa_gestion_droits / 100) +
                    (v_merchandise_value * v_pesa_gestion_tva / 100);

    v_pesa_per_unit := v_pesa_total / v_quantity;

    v_validation_issues := array_append(v_validation_issues,
      'Import from ' || v_shipping_origin || ' - PESA fees applied: CHF ' ||
      ROUND(v_pesa_total, 2)::TEXT || ' total (CHF ' ||
      ROUND(v_pesa_per_unit, 2)::TEXT || ' per unit)');
  END IF;

  -- Calculate TAR rate
  IF v_tar_ht > 0 THEN
    v_tar_rate := v_tar_ht;
  END IF;

  -- Calculate payment processing fee (1.7% of promo price)
  v_payment_processing_fee_ht := v_promo_price * 0.017;

  -- Calculate COGS
  v_cogs_ht := v_purchase_price_chf_ht +
               v_logistics_total_ht +
               v_customs_duty_ht +
               v_tar_ht +
               v_pesa_per_unit +
               v_warranty_cost_ht +
               v_payment_processing_fee_ht;

  -- Calculate promo price HT (TTC / 1.081)
  v_promo_price_ht := v_promo_price / 1.081;

  -- Calculate margins
  v_marge_brute_ht := v_promo_price_ht - v_cogs_ht;
  v_marge_brute_percent := (v_marge_brute_ht / v_promo_price_ht) * 100;

  -- Match business rule
  SELECT * INTO v_rule
  FROM odeal_business_rules
  WHERE is_active = true
    AND (scope = 'global' OR
         (scope = 'category' AND category_id = v_category_id) OR
         (scope = 'subcategory' AND subcategory_id = v_subcategory_id))
  ORDER BY
    CASE scope
      WHEN 'subcategory' THEN 1
      WHEN 'category' THEN 2
      WHEN 'global' THEN 3
    END
  LIMIT 1;

  -- Determine deal status
  IF v_marge_brute_percent >= v_rule.margin_threshold_top THEN
    v_deal_status := 'top';
    v_is_valid := true;
  ELSIF v_marge_brute_percent >= v_rule.margin_threshold_good THEN
    v_deal_status := 'good';
    v_is_valid := true;
  ELSIF v_marge_brute_percent >= v_rule.margin_threshold_acceptable THEN
    v_deal_status := 'almost';
    v_is_valid := false;
    v_validation_issues := array_append(v_validation_issues,
      'Margin ' || ROUND(v_marge_brute_percent, 2)::TEXT ||
      '% is below minimum threshold (' || v_rule.margin_threshold_good::TEXT || '%)');
  ELSE
    v_deal_status := 'bad';
    v_is_valid := false;
    v_validation_issues := array_append(v_validation_issues,
      'Margin ' || ROUND(v_marge_brute_percent, 2)::TEXT ||
      '% is below minimum threshold (' || v_rule.margin_threshold_good::TEXT || '%)');
  END IF;

  v_validation_message_key := 'deal_' || v_deal_status;

  -- Generate item_id if not provided
  IF v_item_id IS NULL OR v_item_id = '' THEN
    v_item_id_uuid := gen_random_uuid();
  ELSE
    BEGIN
      v_item_id_uuid := v_item_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_item_id_uuid := gen_random_uuid();
    END;
  END IF;

  -- Insert calculated costs
  INSERT INTO offer_item_calculated_costs (
    offer_id, item_id, variant_id,
    supplier_id, user_id,
    ean, product_name,
    category_id, category_name,
    subcategory_id, subcategory_name,
    quantity,
    msrp, street_price, promo_price,
    purchase_price_original, purchase_currency,
    currency_rate,
    package_weight_kg, length_cm, width_cm, height_cm,
    shipping_origin, contain_electronic, has_battery, battery_type,
    transport_cost_ht, receiving_cost_ht, preparation_cost_ht,
    logistics_total_ht,
    logistics_inbound_ht, logistics_inbound_carrier,
    logistics_outbound_ht, logistics_outbound_carrier,
    customs_duty_ht, customs_duty_rate_percent,
    tar_ht, tar_rate,
    pesa_fee_ht,
    warranty_cost_ht,
    payment_processing_fee_ht,
    purchase_price_chf_ht,
    cogs_ht,
    promo_price_ht,
    marge_brute_ht, marge_brute_percent,
    applied_rule_id,
    deal_status, is_valid,
    validation_message_key,
    validation_issues,
    validation_notes,
    is_publishable
  ) VALUES (
    v_offer_id, v_item_id_uuid, v_variant_id,
    v_supplier_id, v_user_id,
    v_ean, v_product_name,
    v_category_id, v_category_name,
    v_subcategory_id, v_subcategory_name,
    v_quantity,
    v_msrp, v_street_price, v_promo_price,
    v_purchase_price_ht, v_purchase_currency,
    v_currency_rate,
    v_package_weight_kg, v_length_cm, v_width_cm, v_height_cm,
    v_shipping_origin, v_contain_electronic, v_has_battery, v_battery_type,
    v_transport_cost_ht, v_receiving_cost_ht, v_preparation_cost_ht,
    v_logistics_total_ht,
    v_logistics_inbound_ht, v_logistics_inbound_carrier,
    v_logistics_outbound_ht, v_logistics_outbound_carrier,
    v_customs_duty_ht, v_customs_duty_rate,
    v_tar_ht, v_tar_rate,
    v_pesa_per_unit,
    v_warranty_cost_ht,
    v_payment_processing_fee_ht,
    v_purchase_price_chf_ht,
    v_cogs_ht,
    v_promo_price_ht,
    v_marge_brute_ht, v_marge_brute_percent,
    v_rule.rule_id,
    v_deal_status, v_is_valid,
    v_validation_message_key,
    v_validation_issues,
    array_to_string(v_validation_issues, '; '),
    v_is_valid
  )
  RETURNING cost_id INTO v_cost_id;

  -- Calculate eco savings percentages
  RETURN jsonb_build_object(
    'success', true,
    'cost_id', v_cost_id,
    'generated_item_id', v_item_id_uuid,
    'deal_status', v_deal_status,
    'is_valid', v_is_valid,
    'item_details', jsonb_build_object(
      'item_id', v_item_id_uuid,
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
      'logistics_total_ht', v_logistics_total_ht,
      'pesa_fee_total', v_pesa_total,
      'pesa_fee_per_unit', v_pesa_per_unit,
      'tar_ht', v_tar_ht,
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
      'category', v_rule.category_id,
      'subcategory', v_rule.subcategory_id
    ),
    'validation_issues', v_validation_issues
  );
END;
$$;

COMMENT ON FUNCTION validate_and_calculate_item(UUID, UUID, JSONB) IS
'Fixed version: reads has_battery and contain_electronic from JSONB correctly';

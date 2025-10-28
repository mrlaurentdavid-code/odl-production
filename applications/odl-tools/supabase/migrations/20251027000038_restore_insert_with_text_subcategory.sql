-- Migration: Restore INSERT with TEXT subcategory_id
-- Date: 2025-10-27
-- Purpose: Restore database INSERT now that subcategory_id is TEXT (not UUID)
--
-- Migration 36: Added INSERT but failed due to UUID cast
-- Migration 37: Fixed table schema (subcategory_id UUID → TEXT)
-- Migration 38: Restore INSERT with correct TEXT type

DROP FUNCTION IF EXISTS validate_and_calculate_item(UUID, UUID, JSONB);

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
  v_contain_electronic BOOLEAN;
  v_has_battery BOOLEAN;
  v_battery_type TEXT;
  v_pesa_fee_ht NUMERIC;
  v_warranty_cost_ht NUMERIC;
  v_tar_ht NUMERIC;

  -- Calculation variables
  v_currency_rate NUMERIC;
  v_purchase_price_chf_ht NUMERIC;
  v_customs_duty_rate NUMERIC := 0;
  v_customs_duty_ht NUMERIC := 0;
  v_transport_result JSON;
  v_transport_base NUMERIC;
  v_logistics_total_ht NUMERIC;
  v_logistics_inbound_ht NUMERIC;
  v_logistics_outbound_ht NUMERIC;
  v_logistics_carrier TEXT;
  v_logistics_mode TEXT;
  v_logistics_format TEXT;
  v_tar_rate NUMERIC := 0;
  v_cogs_ht NUMERIC;
  v_promo_price_ht NUMERIC;
  v_marge_brute_ht NUMERIC;
  v_marge_brute_percent NUMERIC;
  v_payment_processing_fee_ht NUMERIC;

  -- PESA fees variables
  v_pesa_admin_base NUMERIC := 0;
  v_pesa_gestion_droits_taux NUMERIC := 0;
  v_pesa_gestion_droits_min NUMERIC := 0;
  v_pesa_gestion_tva_taux NUMERIC := 0;
  v_pesa_gestion_tva_min NUMERIC := 0;
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
  v_result JSONB;
  v_validation_issues TEXT[] := ARRAY[]::TEXT[];

BEGIN
  -- Extract all input fields from JSONB
  v_offer_id := (p_item_data->>'offer_id')::UUID;
  v_item_id := p_item_data->>'item_id';
  v_variant_id := (p_item_data->>'variant_id')::UUID;
  v_ean := p_item_data->>'ean';
  v_product_name := COALESCE(p_item_data->>'product_name', 'Unknown Product');
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
  v_length_cm := COALESCE((p_item_data->>'length_cm')::NUMERIC, 20);
  v_width_cm := COALESCE((p_item_data->>'width_cm')::NUMERIC, 15);
  v_height_cm := COALESCE((p_item_data->>'height_cm')::NUMERIC, 5);
  v_shipping_origin := COALESCE(p_item_data->>'shipping_origin', 'CH');

  v_contain_electronic := COALESCE((p_item_data->>'contain_electronic')::BOOLEAN, false);
  v_has_battery := COALESCE((p_item_data->>'has_battery')::BOOLEAN, false);
  v_battery_type := p_item_data->>'battery_type';

  v_warranty_cost_ht := COALESCE((p_item_data->>'warranty_cost_ht')::NUMERIC, 0);
  v_tar_ht := COALESCE((p_item_data->>'tar_ht')::NUMERIC, 0);

  -- Auto-generate item_id if null
  IF v_item_id IS NULL OR v_item_id = '' THEN
    v_item_id_uuid := gen_random_uuid();
    v_item_id := v_item_id_uuid::TEXT;
  ELSE
    BEGIN
      v_item_id_uuid := v_item_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_item_id_uuid := gen_random_uuid();
      v_item_id := v_item_id_uuid::TEXT;
    END;
  END IF;

  -- Get currency rate
  IF v_purchase_currency != 'CHF' THEN
    SELECT rate INTO v_currency_rate
    FROM currency_rates
    WHERE from_currency = v_purchase_currency
      AND to_currency = 'CHF'
      AND is_active = TRUE
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_currency_rate IS NULL THEN
      CASE v_purchase_currency
        WHEN 'EUR' THEN v_currency_rate := 0.92;
        WHEN 'USD' THEN v_currency_rate := 0.88;
        WHEN 'GBP' THEN v_currency_rate := 1.13;
        ELSE v_currency_rate := 1.0;
      END CASE;

      v_validation_issues := array_append(v_validation_issues,
        'Currency rate for ' || v_purchase_currency || ' not found, using default rate ' || v_currency_rate::TEXT);
    END IF;

    v_purchase_price_chf_ht := v_purchase_price_ht * v_currency_rate;
  ELSE
    v_currency_rate := 1.0;
    v_purchase_price_chf_ht := v_purchase_price_ht;
  END IF;

  -- Calculate transport costs
  BEGIN
    v_transport_result := calculate_transport_cost_with_optimization(
      p_length_cm := v_length_cm,
      p_width_cm := v_width_cm,
      p_height_cm := v_height_cm,
      p_weight_kg := v_package_weight_kg,
      p_carrier := NULL,
      p_mode := NULL,
      p_provider_id := 'ohmex',
      p_quantity := v_quantity,
      p_pallet_format_id := 'euro'
    );

    IF (v_transport_result->>'success')::BOOLEAN THEN
      v_transport_base := (v_transport_result->'costs'->'transport'->>'base')::NUMERIC;
      v_logistics_carrier := v_transport_result->'costs'->'transport'->>'carrier';
      v_logistics_mode := v_transport_result->'costs'->'transport'->>'mode';
      v_logistics_format := v_transport_result->'costs'->'transport'->>'format_label';

      -- Split transport costs: inbound (reception) and outbound (prep + transport)
      -- Base = transport + reception (0.50) + prep (2.50)
      v_logistics_inbound_ht := 0.50;  -- Reception cost (fixed)
      v_logistics_outbound_ht := v_transport_base - 0.50;  -- Transport + prep

      v_logistics_total_ht := v_transport_base / NULLIF(v_quantity, 0);
    ELSE
      v_logistics_inbound_ht := 0.50;
      v_logistics_outbound_ht := 12.00;
      v_logistics_total_ht := 12.50;
      v_logistics_carrier := 'Default';
      v_logistics_mode := 'Standard';

      v_validation_issues := array_append(v_validation_issues,
        'Transport cost calculation failed, using default rate CHF 12.50');
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_logistics_inbound_ht := 0.50;
      v_logistics_outbound_ht := 12.00;
      v_logistics_total_ht := 12.50;
      v_logistics_carrier := 'Default';
      v_logistics_mode := 'Standard';

      v_validation_issues := array_append(v_validation_issues,
        'Error calculating transport cost: ' || SQLERRM || ', using default rate CHF 12.50');
  END;

  -- Calculate PESA fees
  IF v_shipping_origin != 'CH' AND v_shipping_origin != 'SWITZERLAND' THEN
    v_merchandise_value := v_purchase_price_chf_ht * v_quantity;

    SELECT
      MAX(CASE WHEN fee_type = 'admin_base' THEN value ELSE 0 END),
      MAX(CASE WHEN fee_type = 'gestion_droits_taux' THEN value ELSE 0 END),
      MAX(CASE WHEN fee_type = 'gestion_droits_min' THEN value ELSE 0 END),
      MAX(CASE WHEN fee_type = 'gestion_tva_taux' THEN value ELSE 0 END),
      MAX(CASE WHEN fee_type = 'gestion_tva_min' THEN value ELSE 0 END)
    INTO
      v_pesa_admin_base,
      v_pesa_gestion_droits_taux,
      v_pesa_gestion_droits_min,
      v_pesa_gestion_tva_taux,
      v_pesa_gestion_tva_min
    FROM customs_fees
    WHERE provider_id = 'pesa'
      AND is_active = TRUE;

    IF v_pesa_admin_base IS NULL THEN
      v_pesa_admin_base := 37.00;
      v_pesa_gestion_droits_taux := 2.50;
      v_pesa_gestion_droits_min := 15.00;
      v_pesa_gestion_tva_taux := 0.15;
      v_pesa_gestion_tva_min := 15.00;

      v_validation_issues := array_append(v_validation_issues,
        'PESA fees not found in database, using default rates');
    END IF;

    v_pesa_gestion_droits := GREATEST(
      v_pesa_gestion_droits_min,
      v_merchandise_value * (v_pesa_gestion_droits_taux / 100)
    );

    v_pesa_gestion_tva := GREATEST(
      v_pesa_gestion_tva_min,
      v_merchandise_value * (v_pesa_gestion_tva_taux / 100)
    );

    v_pesa_total := v_pesa_admin_base + v_pesa_gestion_droits + v_pesa_gestion_tva;
    v_pesa_per_unit := v_pesa_total / NULLIF(v_quantity, 0);

    v_validation_issues := array_append(v_validation_issues,
      'Import from ' || v_shipping_origin || ' - PESA fees applied: CHF ' ||
      ROUND(v_pesa_total, 2)::TEXT || ' total (CHF ' || ROUND(v_pesa_per_unit, 2)::TEXT || ' per unit)');
  ELSE
    v_pesa_total := 0;
    v_pesa_per_unit := 0;
  END IF;

  -- Calculate COGS
  v_cogs_ht := v_purchase_price_chf_ht +
               v_pesa_per_unit +
               v_tar_ht +
               v_logistics_total_ht +
               COALESCE(v_warranty_cost_ht, 0);

  -- Calculate margins
  v_promo_price_ht := v_promo_price / 1.081;
  v_marge_brute_ht := v_promo_price_ht - v_cogs_ht;
  v_marge_brute_percent := (v_marge_brute_ht / NULLIF(v_promo_price_ht, 0)) * 100;

  -- Determine deal status
  IF v_marge_brute_percent >= 30 THEN
    v_deal_status := 'top';
    v_is_valid := TRUE;
  ELSIF v_marge_brute_percent >= 20 THEN
    v_deal_status := 'good';
    v_is_valid := TRUE;
  ELSIF v_marge_brute_percent >= 15 THEN
    v_deal_status := 'almost';
    v_is_valid := FALSE;
    v_validation_issues := array_append(v_validation_issues,
      'Margin ' || ROUND(v_marge_brute_percent, 2)::TEXT || '% is below minimum threshold (20.00%)');
  ELSE
    v_deal_status := 'bad';
    v_is_valid := FALSE;
    v_validation_issues := array_append(v_validation_issues,
      'Margin ' || ROUND(v_marge_brute_percent, 2)::TEXT || '% is below minimum threshold (20.00%)');
  END IF;

  -- ============================================================================
  -- INSERT INTO DATABASE
  -- ============================================================================
  INSERT INTO offer_item_calculated_costs (
    offer_id,
    item_id,
    variant_id,
    supplier_id,
    user_id,
    ean,
    product_name,
    subcategory_id,
    quantity,
    msrp,
    street_price,
    promo_price,
    purchase_price_ht,
    purchase_currency,
    currency_rate,
    package_weight_kg,
    length_cm,
    width_cm,
    height_cm,
    logistics_inbound_ht,
    logistics_inbound_carrier,
    logistics_outbound_ht,
    logistics_outbound_carrier,
    tar_ht,
    pesa_fee_ht,
    warranty_cost_ht,
    deal_status,
    validation_issues
  ) VALUES (
    v_offer_id,
    v_item_id_uuid,
    v_variant_id,
    p_supplier_id,
    p_user_id,
    v_ean,
    v_product_name,
    v_subcategory_id,  -- Now TEXT, no cast needed
    v_quantity,
    v_msrp,
    v_street_price,
    v_promo_price,
    v_purchase_price_ht,
    v_purchase_currency,
    v_currency_rate,
    v_package_weight_kg,
    v_length_cm,
    v_width_cm,
    v_height_cm,
    v_logistics_inbound_ht,
    v_logistics_carrier || ' - ' || v_logistics_mode,
    v_logistics_outbound_ht,
    v_logistics_carrier || ' - ' || v_logistics_mode,
    v_tar_ht,
    v_pesa_per_unit,
    v_warranty_cost_ht,
    v_deal_status,
    to_jsonb(v_validation_issues)
  )
  RETURNING cost_id INTO v_cost_id;

  -- Build result JSONB
  v_result := jsonb_build_object(
    'success', TRUE,
    'is_valid', v_is_valid,
    'deal_status', v_deal_status,
    'cost_id', v_cost_id,
    'generated_item_id', v_item_id,
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
      'purchase_price_chf_ht', ROUND(v_purchase_price_chf_ht, 2),
      'pesa_fee_total', ROUND(v_pesa_total, 2),
      'pesa_fee_per_unit', ROUND(v_pesa_per_unit, 2),
      'tar_ht', ROUND(v_tar_ht, 2),
      'logistics_total_ht', ROUND(v_logistics_total_ht, 2),
      'logistics_carrier', v_logistics_carrier,
      'logistics_mode', v_logistics_mode,
      'logistics_format', v_logistics_format,
      'cogs_ht', ROUND(v_cogs_ht, 2)
    ),
    'margins', jsonb_build_object(
      'marge_brute_ht', ROUND(v_marge_brute_ht, 2),
      'marge_brute_percent', ROUND(v_marge_brute_percent, 2)
    ),
    'validation_issues', v_validation_issues
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Validation function error',
      'details', SQLERRM,
      'code', 'VALIDATION_ERROR'
    );
END;
$$;

COMMENT ON FUNCTION validate_and_calculate_item(UUID, UUID, JSONB) IS 'Validates supplier item, calculates costs, and saves to database - v38 (with TEXT subcategory_id)';

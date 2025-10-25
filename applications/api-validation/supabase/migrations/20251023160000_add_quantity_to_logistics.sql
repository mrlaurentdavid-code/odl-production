-- ============================================
-- LOGISTICS CALCULATOR - ADD QUANTITY SUPPORT
-- Date: 23 Octobre 2025
-- Description: Mise à jour de la fonction pour supporter la quantité
--              Les frais de douane sont divisés par la quantité
--              Nombre de positions douanières fixé à 1
-- ============================================

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_logistics_cost(
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN, INT, NUMERIC, TEXT
);

-- Recreate function with quantity parameter
CREATE OR REPLACE FUNCTION calculate_logistics_cost(
    p_length_cm NUMERIC,
    p_width_cm NUMERIC,
    p_height_cm NUMERIC,
    p_weight_kg NUMERIC,
    p_carrier TEXT DEFAULT NULL,
    p_mode TEXT DEFAULT NULL,
    p_is_imported BOOLEAN DEFAULT FALSE,
    p_quantity INT DEFAULT 1,
    p_merchandise_value NUMERIC DEFAULT 0,
    p_provider_id TEXT DEFAULT 'ohmex'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_rate RECORD;
    v_transport_cost NUMERIC;
    v_reception_cost NUMERIC;
    v_prep_cost NUMERIC;
    v_transport_subtotal NUMERIC;

    v_customs_admin NUMERIC := 0;
    v_customs_positions NUMERIC := 0;
    v_customs_droits NUMERIC := 0;
    v_customs_tva NUMERIC := 0;
    v_customs_subtotal NUMERIC := 0;
    v_customs_per_unit NUMERIC := 0;

    v_margin_security NUMERIC;
    v_total_ht NUMERIC;
    v_tva_rate NUMERIC := 0.081;
    v_tva_amount NUMERIC;
    v_total_ttc NUMERIC;

    v_customs_fee_admin NUMERIC;
    v_customs_fee_position NUMERIC;
    v_customs_fee_droits_rate NUMERIC;
    v_customs_fee_droits_min NUMERIC;
    v_customs_fee_tva_rate NUMERIC;
    v_customs_fee_tva_min NUMERIC;
BEGIN
    -- Validation: quantity must be at least 1
    IF p_quantity < 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La quantité doit être au moins 1'
        );
    END IF;

    -- 1. Find matching rate based on dimensions and weight
    SELECT *
    INTO v_rate
    FROM logistics_rates
    WHERE provider_id = p_provider_id
      AND is_active = TRUE
      AND length_cm >= p_length_cm
      AND width_cm >= p_width_cm
      AND height_cm >= p_height_cm
      AND (weight_max_kg IS NULL OR weight_max_kg >= p_weight_kg)
      AND (p_carrier IS NULL OR carrier = p_carrier)
      AND (p_mode IS NULL OR mode = p_mode)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- If no matching rate found
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Aucun format disponible pour ces dimensions/poids',
            'details', json_build_object(
                'length_cm', p_length_cm,
                'width_cm', p_width_cm,
                'height_cm', p_height_cm,
                'weight_kg', p_weight_kg,
                'carrier', p_carrier,
                'mode', p_mode
            )
        );
    END IF;

    -- 2. Calculate transport costs
    v_transport_cost := v_rate.price_transport;
    v_reception_cost := v_rate.price_reception;
    v_prep_cost := v_rate.price_prep;
    v_transport_subtotal := v_transport_cost + v_reception_cost + v_prep_cost;

    -- 3. Calculate customs costs (if imported)
    IF p_is_imported THEN
        -- Get customs fees from customs_fees table (provider = 'pesa')
        SELECT value INTO v_customs_fee_admin
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'admin_base' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_position
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'position_supp' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_droits_rate
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_taux' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_droits_min
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_min' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_tva_rate
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_taux' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_tva_min
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_min' AND is_active = TRUE;

        -- Admin base (always 1 position now)
        v_customs_admin := COALESCE(v_customs_fee_admin, 80);

        -- No additional positions (always 1 position)
        v_customs_positions := 0;

        -- Gestion droits (with minimum)
        v_customs_droits := GREATEST(
            p_merchandise_value * COALESCE(v_customs_fee_droits_rate, 0.035),
            COALESCE(v_customs_fee_droits_min, 5)
        );

        -- Gestion TVA (with minimum)
        v_customs_tva := GREATEST(
            p_merchandise_value * COALESCE(v_customs_fee_tva_rate, 0.025),
            COALESCE(v_customs_fee_tva_min, 5)
        );

        -- Total customs for all items
        v_customs_subtotal := v_customs_admin + v_customs_positions + v_customs_droits + v_customs_tva;

        -- Customs cost per unit
        v_customs_per_unit := v_customs_subtotal / p_quantity;
    END IF;

    -- 4. Calculate margin (10% on transport + customs per unit)
    v_margin_security := (v_transport_subtotal + v_customs_per_unit) * 0.10;

    -- 5. Calculate totals per unit
    v_total_ht := v_transport_subtotal + v_customs_per_unit + v_margin_security;
    v_tva_amount := v_total_ht * v_tva_rate;
    v_total_ttc := v_total_ht + v_tva_amount;

    -- 6. Return structured result
    RETURN json_build_object(
        'success', true,
        'rate', json_build_object(
            'rate_id', v_rate.rate_id,
            'format_label', v_rate.format_label,
            'carrier', v_rate.carrier,
            'mode', v_rate.mode,
            'dimensions_cm', json_build_object(
                'length', v_rate.length_cm,
                'width', v_rate.width_cm,
                'height', v_rate.height_cm
            ),
            'weight_max_kg', v_rate.weight_max_kg
        ),
        'costs', json_build_object(
            'transport', json_build_object(
                'price_transport', v_transport_cost,
                'price_reception', v_reception_cost,
                'price_prep', v_prep_cost,
                'subtotal', v_transport_subtotal
            ),
            'customs', json_build_object(
                'admin_base', v_customs_admin,
                'positions_supp', v_customs_positions,
                'gestion_droits', v_customs_droits,
                'gestion_tva', v_customs_tva,
                'subtotal', v_customs_subtotal,
                'per_unit', v_customs_per_unit,
                'quantity', p_quantity
            ),
            'margin_security', v_margin_security,
            'total_ht', v_total_ht,
            'tva_rate', v_tva_rate,
            'tva_amount', v_tva_amount,
            'total_ttc', v_total_ttc
        )
    );
END;
$$;

-- Add comment
COMMENT ON FUNCTION calculate_logistics_cost IS
'Calcule les coûts logistiques totaux par unité (transport + douane/quantité + marge + TVA).
Paramètres: dimensions, poids, transporteur, mode, import, quantité, valeur marchandise.
Les frais de douane sont toujours pour 1 position et divisés par la quantité.';

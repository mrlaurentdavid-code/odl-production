-- Migration: Fix calculate_transport_cost_with_pallets function
-- Description: Update function to use correct column names from logistics_rates table

CREATE OR REPLACE FUNCTION calculate_transport_cost_with_pallets(
    p_length_cm NUMERIC,
    p_width_cm NUMERIC,
    p_height_cm NUMERIC,
    p_weight_kg NUMERIC,
    p_carrier TEXT DEFAULT 'dhl',
    p_mode TEXT DEFAULT 'standard',
    p_provider_id TEXT DEFAULT 'ohmex',
    p_quantity INT DEFAULT 1,
    p_pallet_format_id TEXT DEFAULT 'euro'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_price_transport NUMERIC := 0;
    v_price_reception NUMERIC := 0;
    v_price_prep NUMERIC := 0;
    v_transport_subtotal NUMERIC := 0;
    v_margin_rate NUMERIC := 0.10;
    v_tva_rate NUMERIC := 0.081;
    v_transport_margin NUMERIC := 0;
    v_transport_tva NUMERIC := 0;
    v_transport_total NUMERIC := 0;
    v_transport_per_unit NUMERIC := 0;
    v_pallet_calc JSON;
    v_pallets_needed INT := 0;
    v_carrier TEXT;
    v_mode TEXT;
BEGIN
    -- Find the best matching rate
    SELECT
        price_transport,
        price_reception,
        price_prep,
        carrier,
        mode
    INTO
        v_price_transport,
        v_price_reception,
        v_price_prep,
        v_carrier,
        v_mode
    FROM logistics_rates
    WHERE provider_id = p_provider_id
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_mode IS NULL OR mode = p_mode)
    AND p_length_cm <= length_cm
    AND p_width_cm <= width_cm
    AND p_height_cm <= height_cm
    AND (weight_max_kg IS NULL OR p_weight_kg <= weight_max_kg)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- Default prices if no rate found
    IF v_price_transport IS NULL THEN
        v_price_transport := 50;
        v_price_reception := 0.50;
        v_price_prep := 2.50;
        v_carrier := COALESCE(p_carrier, 'default');
        v_mode := COALESCE(p_mode, 'standard');
    END IF;

    -- Calculate pallet requirements
    v_pallet_calc := calculate_pallet_requirements(
        p_quantity,
        p_length_cm,
        p_width_cm,
        p_height_cm,
        p_weight_kg,
        p_pallet_format_id
    );

    -- Extract pallets needed
    IF (v_pallet_calc->>'success')::BOOLEAN THEN
        v_pallets_needed := (v_pallet_calc->'calculation'->>'pallets_needed')::INT;
    ELSE
        -- If pallet calculation failed, return the error
        RETURN v_pallet_calc;
    END IF;

    -- Calculate transport cost (total for all pallets/shipment)
    v_transport_subtotal := v_price_transport + v_price_reception + v_price_prep;
    v_transport_margin := v_transport_subtotal * v_margin_rate;
    v_transport_tva := (v_transport_subtotal + v_transport_margin) * v_tva_rate;
    v_transport_total := v_transport_subtotal + v_transport_margin + v_transport_tva;

    -- Per unit cost based on actual quantity ordered
    v_transport_per_unit := v_transport_total / p_quantity;

    RETURN json_build_object(
        'success', true,
        'costs', json_build_object(
            'transport', json_build_object(
                'base', v_transport_subtotal,
                'margin', v_transport_margin,
                'tva', v_transport_tva,
                'subtotal', v_transport_total,
                'per_unit', v_transport_per_unit,
                'carrier', v_carrier,
                'mode', v_mode
            ),
            'total_per_unit', v_transport_per_unit
        ),
        'pallet_info', v_pallet_calc,
        'quantity', p_quantity,
        'provider_id', p_provider_id
    );
END;
$$;

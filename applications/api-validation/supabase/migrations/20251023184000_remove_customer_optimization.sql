-- Migration: Remove customer shipping optimization feature
-- Description: Removes the optimization tool and related functions

-- Drop the customer optimization function
DROP FUNCTION IF EXISTS calculate_customer_shipping_optimization(
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, INT
);

-- Update main function to remove optimization from response
CREATE OR REPLACE FUNCTION calculate_transport_cost_with_optimization(
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
    v_optimization JSON;
    v_pallets_needed INT := 0;
    v_carrier TEXT;
    v_mode TEXT;
    v_format_label TEXT;
    v_container_length NUMERIC;
    v_container_width NUMERIC;
    v_container_height NUMERIC;
    v_delivery_options JSON[];
    v_option_record RECORD;
BEGIN
    -- Find the best matching rate
    SELECT
        price_transport,
        price_reception,
        price_prep,
        carrier,
        mode,
        format_label,
        length_cm,
        width_cm,
        height_cm
    INTO
        v_price_transport,
        v_price_reception,
        v_price_prep,
        v_carrier,
        v_mode,
        v_format_label,
        v_container_length,
        v_container_width,
        v_container_height
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
        v_format_label := 'Format par défaut';
        v_container_length := NULL;
        v_container_width := NULL;
        v_container_height := NULL;
        v_delivery_options := ARRAY[]::JSON[];
    ELSE
        -- Find all delivery options for the same container dimensions
        v_delivery_options := ARRAY[]::JSON[];
        FOR v_option_record IN
            SELECT
                carrier,
                mode,
                format_label as option_format_label,
                price_transport,
                price_reception,
                price_prep,
                (price_transport + price_reception + price_prep) as base_cost
            FROM logistics_rates
            WHERE provider_id = p_provider_id
            AND length_cm = v_container_length
            AND width_cm = v_container_width
            AND height_cm = v_container_height
            ORDER BY (price_transport + price_reception + price_prep) ASC
        LOOP
            DECLARE
                v_opt_base NUMERIC;
                v_opt_margin NUMERIC;
                v_opt_tva NUMERIC;
                v_opt_total NUMERIC;
            BEGIN
                v_opt_base := v_option_record.base_cost;
                v_opt_margin := v_opt_base * v_margin_rate;
                v_opt_tva := (v_opt_base + v_opt_margin) * v_tva_rate;
                v_opt_total := v_opt_base + v_opt_margin + v_opt_tva;

                v_delivery_options := array_append(v_delivery_options, json_build_object(
                    'carrier', v_option_record.carrier,
                    'mode', v_option_record.mode,
                    'format_label', v_option_record.option_format_label,
                    'base', v_opt_base,
                    'margin', v_opt_margin,
                    'tva', v_opt_tva,
                    'total', v_opt_total,
                    'per_unit', v_opt_total / p_quantity,
                    'is_selected', v_option_record.carrier = v_carrier AND v_option_record.mode = v_mode
                ));
            END;
        END LOOP;
    END IF;

    -- Calculate pallet requirements (for supplier quantity)
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
    END IF;

    -- Calculate transport cost for supplier quantity
    v_transport_subtotal := v_price_transport + v_price_reception + v_price_prep;
    v_transport_margin := v_transport_subtotal * v_margin_rate;
    v_transport_tva := (v_transport_subtotal + v_transport_margin) * v_tva_rate;
    v_transport_total := v_transport_subtotal + v_transport_margin + v_transport_tva;
    v_transport_per_unit := v_transport_total / p_quantity;

    -- Calculate customer transport optimization (for small quantities 1-10)
    BEGIN
        v_optimization := calculate_customer_transport_optimization(
            p_height_cm,
            p_length_cm,
            p_width_cm,
            p_weight_kg,
            p_provider_id
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_optimization := NULL;
    END;

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
                'mode', v_mode,
                'format_label', v_format_label,
                'container_dimensions', json_build_object(
                    'length_cm', v_container_length,
                    'width_cm', v_container_width,
                    'height_cm', v_container_height
                )
            ),
            'total_per_unit', v_transport_per_unit,
            'delivery_options', array_to_json(v_delivery_options)
        ),
        'pallet_info', v_pallet_calc,
        'customer_optimization', v_optimization,
        'quantity', p_quantity,
        'provider_id', p_provider_id
    );
END;
$$;

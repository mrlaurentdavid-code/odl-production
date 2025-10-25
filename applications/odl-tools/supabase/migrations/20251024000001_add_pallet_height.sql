-- Migration: Add pallet height to calculations
-- Description: Account for the physical height of the pallet itself (15.2cm for Euro)

-- Add pallet_height_cm column to pallet_formats
ALTER TABLE pallet_formats ADD COLUMN IF NOT EXISTS pallet_height_cm NUMERIC DEFAULT 15.2;

-- Update Euro pallet with correct pallet height
UPDATE pallet_formats
SET pallet_height_cm = 15.2
WHERE pallet_format_id = 'euro';

-- Update the calculation function to account for pallet height
CREATE OR REPLACE FUNCTION calculate_pallet_requirements(
    p_quantity INT,
    p_product_length_cm NUMERIC,
    p_product_width_cm NUMERIC,
    p_product_height_cm NUMERIC,
    p_product_weight_kg NUMERIC,
    p_pallet_format_id TEXT DEFAULT 'euro'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_pallet_length NUMERIC;
    v_pallet_width NUMERIC;
    v_pallet_height NUMERIC;
    v_pallet_physical_height NUMERIC;
    v_available_height NUMERIC;
    v_pallet_max_weight NUMERIC;
    v_products_per_layer INT;
    v_layers_per_pallet INT;
    v_products_per_pallet INT;
    v_pallets_needed INT;
    v_weight_limited_products INT;
    v_final_products_per_pallet INT;
    v_total_products_shipped INT;
    v_product_loss INT;
    v_pallet_format_name TEXT;
    -- Track orientation used
    v_orientation_used INT := 1;
    v_base_length NUMERIC;
    v_base_width NUMERIC;
    v_stack_height NUMERIC;
BEGIN
    -- Get pallet dimensions
    SELECT
        length_cm,
        width_cm,
        height_cm,
        COALESCE(pallet_height_cm, 15.2),
        max_weight_kg,
        format_name
    INTO
        v_pallet_length,
        v_pallet_width,
        v_pallet_height,
        v_pallet_physical_height,
        v_pallet_max_weight,
        v_pallet_format_name
    FROM pallet_formats
    WHERE pallet_format_id = p_pallet_format_id;

    -- If pallet format not found, use euro palette as default
    IF v_pallet_length IS NULL THEN
        SELECT
            length_cm,
            width_cm,
            height_cm,
            COALESCE(pallet_height_cm, 15.2),
            max_weight_kg,
            format_name
        INTO
            v_pallet_length,
            v_pallet_width,
            v_pallet_height,
            v_pallet_physical_height,
            v_pallet_max_weight,
            v_pallet_format_name
        FROM pallet_formats
        WHERE is_default = true
        LIMIT 1;
    END IF;

    -- Calculate available height for products (total height - pallet height)
    v_available_height := v_pallet_height - v_pallet_physical_height;

    -- Test all 3D orientations to maximize pallet capacity
    DECLARE
        v_orientation_capacity INT;
        v_orientation_per_layer INT;
        v_orientation_layers INT;
        v_best_capacity INT := 0;
    BEGIN
        -- Orientation 1: length×width base, height stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_length_cm) * FLOOR(v_pallet_width / p_product_width_cm),
            FLOOR(v_pallet_length / p_product_width_cm) * FLOOR(v_pallet_width / p_product_length_cm)
        );
        v_orientation_layers := FLOOR(v_available_height / p_product_height_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
            v_orientation_used := 1;
            v_base_length := p_product_length_cm;
            v_base_width := p_product_width_cm;
            v_stack_height := p_product_height_cm;
        END IF;

        -- Orientation 2: length×height base, width stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_length_cm) * FLOOR(v_pallet_width / p_product_height_cm),
            FLOOR(v_pallet_length / p_product_height_cm) * FLOOR(v_pallet_width / p_product_length_cm)
        );
        v_orientation_layers := FLOOR(v_available_height / p_product_width_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
            v_orientation_used := 2;
            v_base_length := p_product_length_cm;
            v_base_width := p_product_height_cm;
            v_stack_height := p_product_width_cm;
        END IF;

        -- Orientation 3: width×height base, length stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_width_cm) * FLOOR(v_pallet_width / p_product_height_cm),
            FLOOR(v_pallet_length / p_product_height_cm) * FLOOR(v_pallet_width / p_product_width_cm)
        );
        v_orientation_layers := FLOOR(v_available_height / p_product_length_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
            v_orientation_used := 3;
            v_base_length := p_product_width_cm;
            v_base_width := p_product_height_cm;
            v_stack_height := p_product_length_cm;
        END IF;

        v_products_per_pallet := v_best_capacity;
    END;

    -- Calculate weight limit
    v_weight_limited_products := FLOOR(v_pallet_max_weight / p_product_weight_kg);

    -- Final products per pallet
    v_final_products_per_pallet := LEAST(v_products_per_pallet, v_weight_limited_products);

    -- If no products can fit at all, return error
    IF v_final_products_per_pallet = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Product dimensions or weight exceed pallet capacity'
        );
    END IF;

    -- Calculate number of pallets needed
    v_pallets_needed := CEIL(p_quantity::NUMERIC / v_final_products_per_pallet);

    -- Calculate actual products shipped and potential loss
    v_total_products_shipped := v_pallets_needed * v_final_products_per_pallet;
    v_product_loss := v_total_products_shipped - p_quantity;

    RETURN json_build_object(
        'success', true,
        'pallet_format', json_build_object(
            'id', p_pallet_format_id,
            'name', v_pallet_format_name,
            'dimensions', json_build_object(
                'length_cm', v_pallet_length,
                'width_cm', v_pallet_width,
                'height_cm', v_pallet_height,
                'pallet_height_cm', v_pallet_physical_height,
                'available_height_cm', v_available_height,
                'max_weight_kg', v_pallet_max_weight
            )
        ),
        'calculation', json_build_object(
            'products_per_layer', v_products_per_layer,
            'layers_per_pallet', v_layers_per_pallet,
            'products_per_pallet_dimension', v_products_per_pallet,
            'products_per_pallet_weight', v_weight_limited_products,
            'products_per_pallet_final', v_final_products_per_pallet,
            'pallets_needed', v_pallets_needed,
            'total_products_shipped', v_total_products_shipped,
            'product_loss', v_product_loss,
            'efficiency_percent', ROUND((p_quantity::NUMERIC / v_total_products_shipped * 100)::NUMERIC, 2),
            'orientation_used', v_orientation_used,
            'product_base_length', v_base_length,
            'product_base_width', v_base_width,
            'product_stack_height', v_stack_height
        )
    );
END;
$$;

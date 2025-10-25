-- Migration: Add Pallet Calculation System
-- Description: Add tables and functions for pallet calculations including formats and shipping formats

-- ============================================================
-- TABLE: pallet_formats
-- Stores different pallet format specifications
-- ============================================================
CREATE TABLE IF NOT EXISTS pallet_formats (
    pallet_format_id TEXT PRIMARY KEY,
    format_name TEXT NOT NULL,
    length_cm NUMERIC NOT NULL CHECK (length_cm > 0),
    width_cm NUMERIC NOT NULL CHECK (width_cm > 0),
    height_cm NUMERIC NOT NULL CHECK (height_cm > 0),
    max_weight_kg NUMERIC NOT NULL CHECK (max_weight_kg > 0),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: shipping_formats
-- Links shipping formats to logistics providers with pallet info
-- ============================================================
CREATE TABLE IF NOT EXISTS shipping_formats (
    shipping_format_id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES logistics_providers(provider_id) ON DELETE CASCADE,
    pallet_format_id TEXT NOT NULL REFERENCES pallet_formats(pallet_format_id) ON DELETE RESTRICT,
    format_name TEXT NOT NULL,
    max_pallets INTEGER NOT NULL CHECK (max_pallets > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA: pallet_formats
-- ============================================================
INSERT INTO pallet_formats (pallet_format_id, format_name, length_cm, width_cm, height_cm, max_weight_kg, is_default)
VALUES
    ('euro', 'Euro Palette', 120, 80, 200, 1000, true)
ON CONFLICT (pallet_format_id) DO NOTHING;

-- ============================================================
-- SEED DATA: shipping_formats (Ohmex)
-- ============================================================
INSERT INTO shipping_formats (shipping_format_id, provider_id, pallet_format_id, format_name, max_pallets)
VALUES
    ('ohmex_half_pallet', 'ohmex', 'euro', 'Demi Palette', 1),
    ('ohmex_1_pallet', 'ohmex', 'euro', '1 Palette', 1),
    ('ohmex_2_pallets', 'ohmex', 'euro', '2 Palettes', 2),
    ('ohmex_groupage', 'ohmex', 'euro', 'Groupage', 6),
    ('ohmex_full_truck', 'ohmex', 'euro', 'Full Truck', 33),
    ('ohmex_full_truck_xl', 'ohmex', 'euro', 'Full Truck XL', 66)
ON CONFLICT (shipping_format_id) DO NOTHING;

-- ============================================================
-- FUNCTION: calculate_pallet_requirements
-- Calculates how many pallets needed and products per pallet
-- ============================================================
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
    v_pallet_max_weight NUMERIC;
    v_products_per_layer_length INT;
    v_products_per_layer_width INT;
    v_products_per_layer INT;
    v_layers_per_pallet INT;
    v_products_per_pallet INT;
    v_pallets_needed INT;
    v_weight_limited_products INT;
    v_final_products_per_pallet INT;
    v_total_products_shipped INT;
    v_product_loss INT;
    v_pallet_format_name TEXT;
BEGIN
    -- Get pallet dimensions
    SELECT
        length_cm,
        width_cm,
        height_cm,
        max_weight_kg,
        format_name
    INTO
        v_pallet_length,
        v_pallet_width,
        v_pallet_height,
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
            max_weight_kg,
            format_name
        INTO
            v_pallet_length,
            v_pallet_width,
            v_pallet_height,
            v_pallet_max_weight,
            v_pallet_format_name
        FROM pallet_formats
        WHERE is_default = true
        LIMIT 1;
    END IF;

    -- Test all 3D orientations to maximize pallet capacity
    -- Orientation 1: length×width base, height stacked
    -- Orientation 2: length×height base, width stacked
    -- Orientation 3: width×height base, length stacked

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
        v_orientation_layers := FLOOR(v_pallet_height / p_product_height_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
        END IF;

        -- Orientation 2: length×height base, width stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_length_cm) * FLOOR(v_pallet_width / p_product_height_cm),
            FLOOR(v_pallet_length / p_product_height_cm) * FLOOR(v_pallet_width / p_product_length_cm)
        );
        v_orientation_layers := FLOOR(v_pallet_height / p_product_width_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
        END IF;

        -- Orientation 3: width×height base, length stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_width_cm) * FLOOR(v_pallet_width / p_product_height_cm),
            FLOOR(v_pallet_length / p_product_height_cm) * FLOOR(v_pallet_width / p_product_width_cm)
        );
        v_orientation_layers := FLOOR(v_pallet_height / p_product_length_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
        END IF;

        v_products_per_pallet := v_best_capacity;
    END;

    -- Calculate weight limit: how many products can fit based on weight
    v_weight_limited_products := FLOOR(v_pallet_max_weight / p_product_weight_kg);

    -- Final products per pallet is the minimum of dimension-based and weight-based
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
            'efficiency_percent', ROUND((p_quantity::NUMERIC / v_total_products_shipped * 100)::NUMERIC, 2)
        )
    );
END;
$$;

-- ============================================================
-- FUNCTION: calculate_transport_cost_with_pallets
-- Enhanced version that includes pallet calculations
-- ============================================================
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
    v_base_price NUMERIC := 0;
    v_margin_rate NUMERIC := 0;
    v_tva_rate NUMERIC := 0;
    v_transport_base NUMERIC := 0;
    v_transport_margin NUMERIC := 0;
    v_transport_tva NUMERIC := 0;
    v_transport_total NUMERIC := 0;
    v_transport_per_unit NUMERIC := 0;
    v_pallet_calc JSON;
    v_pallets_needed INT := 0;
BEGIN
    -- Get the rate
    SELECT base_price, margin_percentage, tva_percentage
    INTO v_base_price, v_margin_rate, v_tva_rate
    FROM logistics_rates
    WHERE provider_id = p_provider_id
    AND carrier = p_carrier
    AND mode = p_mode
    LIMIT 1;

    -- Default rates if not found
    IF v_base_price IS NULL THEN
        v_base_price := 50;
        v_margin_rate := 0.15;
        v_tva_rate := 0.077;
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
    v_pallets_needed := (v_pallet_calc->'calculation'->>'pallets_needed')::INT;

    -- Calculate transport cost
    v_transport_base := v_base_price;
    v_transport_margin := v_transport_base * v_margin_rate;
    v_transport_tva := (v_transport_base + v_transport_margin) * v_tva_rate;
    v_transport_total := v_transport_base + v_transport_margin + v_transport_tva;

    -- Per unit cost based on actual quantity ordered
    v_transport_per_unit := v_transport_total / p_quantity;

    RETURN json_build_object(
        'success', true,
        'costs', json_build_object(
            'transport', json_build_object(
                'base', v_transport_base,
                'margin', v_transport_margin,
                'tva', v_transport_tva,
                'subtotal', v_transport_total,
                'per_unit', v_transport_per_unit,
                'carrier', p_carrier,
                'mode', p_mode
            ),
            'total_per_unit', v_transport_per_unit
        ),
        'pallet_info', v_pallet_calc,
        'quantity', p_quantity,
        'provider_id', p_provider_id
    );
END;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE pallet_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_formats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to pallet_formats"
ON pallet_formats FOR SELECT
USING (true);

CREATE POLICY "Public read access to shipping_formats"
ON shipping_formats FOR SELECT
USING (true);

-- Authenticated users can modify
CREATE POLICY "Authenticated users can insert pallet_formats"
ON pallet_formats FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pallet_formats"
ON pallet_formats FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pallet_formats"
ON pallet_formats FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert shipping_formats"
ON shipping_formats FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipping_formats"
ON shipping_formats FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shipping_formats"
ON shipping_formats FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shipping_formats_provider ON shipping_formats(provider_id);
CREATE INDEX IF NOT EXISTS idx_shipping_formats_pallet ON shipping_formats(pallet_format_id);
CREATE INDEX IF NOT EXISTS idx_pallet_formats_default ON pallet_formats(is_default);

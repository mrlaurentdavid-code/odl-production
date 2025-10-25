-- ============================================================================
-- Migration: Extend Logistics Rates
-- Date: 2025-10-25
-- Description: Add weight-based pricing to logistics_rates
-- ============================================================================

-- Add new columns for weight-based pricing
ALTER TABLE logistics_rates
ADD COLUMN IF NOT EXISTS weight_kg_min NUMERIC,
ADD COLUMN IF NOT EXISTS weight_kg_max NUMERIC,
ADD COLUMN IF NOT EXISTS per_kg_cost_ht NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS handling_fee_ht NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('inbound', 'outbound'));

-- Add index for weight lookups
CREATE INDEX IF NOT EXISTS idx_logistics_rates_weight
ON logistics_rates(direction, weight_kg_min, weight_kg_max)
WHERE direction IS NOT NULL;

COMMENT ON COLUMN logistics_rates.weight_kg_min IS
  'Minimum weight in kg for this rate tier (inclusive)';

COMMENT ON COLUMN logistics_rates.weight_kg_max IS
  'Maximum weight in kg for this rate tier (inclusive)';

COMMENT ON COLUMN logistics_rates.direction IS
  'inbound = supplier to warehouse, outbound = warehouse to customer';

-- Insert O!Deal weight-based rates
INSERT INTO logistics_rates (
  provider_id,
  format_label,
  carrier,
  mode,
  length_cm,
  width_cm,
  height_cm,
  weight_max_kg,
  direction,
  weight_kg_min,
  weight_kg_max,
  price_transport,
  handling_fee_ht,
  is_active
) VALUES
  -- Inbound (supplier → warehouse) - DHL
  ('ohmex', 'Inbound 0-1kg', 'DHL', 'Weight-based', 0, 0, 0, 1, 'inbound', 0, 1, 5.50, 2.00, true),
  ('ohmex', 'Inbound 1-5kg', 'DHL', 'Weight-based', 0, 0, 0, 5, 'inbound', 1, 5, 8.00, 3.00, true),
  ('ohmex', 'Inbound 5-10kg', 'DHL', 'Weight-based', 0, 0, 0, 10, 'inbound', 5, 10, 12.00, 4.00, true),
  ('ohmex', 'Inbound 10-20kg', 'DHL', 'Weight-based', 0, 0, 0, 20, 'inbound', 10, 20, 18.00, 5.00, true),
  ('ohmex', 'Inbound 20-30kg', 'DHL', 'Weight-based', 0, 0, 0, 30, 'inbound', 20, 30, 25.00, 6.00, true),

  -- Outbound (warehouse → customer) - Swiss Post
  ('ohmex', 'Outbound 0-1kg', 'Swiss Post', 'Weight-based', 0, 0, 0, 1, 'outbound', 0, 1, 6.90, 1.50, true),
  ('ohmex', 'Outbound 1-5kg', 'Swiss Post', 'Weight-based', 0, 0, 0, 5, 'outbound', 1, 5, 9.50, 2.50, true),
  ('ohmex', 'Outbound 5-10kg', 'Swiss Post', 'Weight-based', 0, 0, 0, 10, 'outbound', 5, 10, 14.00, 3.50, true),
  ('ohmex', 'Outbound 10-20kg', 'Swiss Post', 'Weight-based', 0, 0, 0, 20, 'outbound', 10, 20, 20.00, 4.50, true),
  ('ohmex', 'Outbound 20-30kg', 'Swiss Post', 'Weight-based', 0, 0, 0, 30, 'outbound', 20, 30, 28.00, 5.50, true)
ON CONFLICT (provider_id, format_label, carrier, mode) DO NOTHING;

-- Function: Get logistics cost for weight
CREATE OR REPLACE FUNCTION get_logistics_cost_for_weight(
  p_direction TEXT,
  p_weight_kg NUMERIC
)
RETURNS TABLE (
  rate_id UUID,
  carrier TEXT,
  base_cost NUMERIC,
  handling_fee NUMERIC,
  total_cost NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    lr.rate_id,
    lr.carrier,
    lr.price_transport AS base_cost,
    lr.handling_fee_ht AS handling_fee,
    (lr.price_transport + lr.handling_fee_ht) AS total_cost
  FROM logistics_rates lr
  WHERE lr.direction = p_direction
    AND lr.is_active = true
    AND p_weight_kg >= lr.weight_kg_min
    AND p_weight_kg <= lr.weight_kg_max
  ORDER BY lr.price_transport ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_logistics_cost_for_weight TO anon, authenticated;

COMMENT ON FUNCTION get_logistics_cost_for_weight IS
  'Returns logistics cost for given direction and weight. Returns cheapest option if multiple match.';

-- Verification
DO $$
DECLARE
  v_inbound_count INT;
  v_outbound_count INT;
BEGIN
  SELECT COUNT(*) INTO v_inbound_count
  FROM logistics_rates WHERE direction = 'inbound';

  SELECT COUNT(*) INTO v_outbound_count
  FROM logistics_rates WHERE direction = 'outbound';

  RAISE NOTICE '✓ Logistics rates extended: % inbound rates, % outbound rates',
    v_inbound_count, v_outbound_count;
END $$;

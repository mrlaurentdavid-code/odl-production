-- ============================================================================
-- Migration: Create O!Deal Customs Duty Rates
-- Date: 2025-10-25
-- Description: Fallback customs duty rates by subcategory
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.odeal_customs_duty_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subcategory identification
  subcategory_id TEXT UNIQUE NOT NULL,
  subcategory_name TEXT,

  -- Customs duty
  duty_percent NUMERIC DEFAULT 0,

  -- TAR (Taxe Anticipée Recyclage)
  tar_applies BOOLEAN DEFAULT false,
  tar_fee_ht NUMERIC DEFAULT 0,
  tar_organism TEXT,  -- 'SWICO', 'SENS', 'Inobat', etc.

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_odeal_customs_duty_rates_subcategory
ON odeal_customs_duty_rates(subcategory_id)
WHERE is_active = true;

-- Enable RLS
ALTER TABLE odeal_customs_duty_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_odeal_customs_duty_rates"
ON odeal_customs_duty_rates
USING (false);

COMMENT ON TABLE odeal_customs_duty_rates IS
  'Fallback customs duty and TAR rates by subcategory. Used when product not in products_catalog.';

-- Insert sample data
INSERT INTO odeal_customs_duty_rates (
  subcategory_id,
  subcategory_name,
  duty_percent,
  tar_applies,
  tar_fee_ht,
  tar_organism,
  notes
) VALUES
  -- Electronics
  ('s20', 'Smartphones', 0, true, 2.50, 'SENS', 'Small electronics with battery'),
  ('s21', 'Laptops', 0, true, 5.00, 'SENS', 'Computers and laptops'),
  ('s22', 'Tablets', 0, true, 3.50, 'SENS', 'Tablets and e-readers'),
  ('s23', 'Audio', 0, true, 2.00, 'SENS', 'Headphones, speakers'),
  ('s24', 'Smartwatches', 0, true, 1.50, 'SENS', 'Wearables'),

  -- Appliances
  ('s30', 'Small Appliances', 0, true, 4.00, 'SENS', 'Kitchen appliances'),
  ('s31', 'Large Appliances', 0, true, 15.00, 'SENS', 'Refrigerators, washing machines'),

  -- Textiles (no TAR, but customs duty)
  ('s10', 'Clothing', 10, false, 0, NULL, '10% customs duty'),
  ('s11', 'Shoes', 8, false, 0, NULL, '8% customs duty'),

  -- Other
  ('s40', 'Toys', 5, false, 0, NULL, '5% customs duty'),
  ('s50', 'Books', 0, false, 0, NULL, 'No duty, no TAR')
ON CONFLICT (subcategory_id) DO NOTHING;

-- Function: Get customs rates for subcategory
CREATE OR REPLACE FUNCTION get_customs_rates_for_subcategory(p_subcategory_id TEXT)
RETURNS odeal_customs_duty_rates
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM odeal_customs_duty_rates
  WHERE subcategory_id = p_subcategory_id
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_customs_rates_for_subcategory TO anon, authenticated;

-- Verification
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM odeal_customs_duty_rates;
  RAISE NOTICE '✓ Table odeal_customs_duty_rates created with % sample rates', v_count;
END $$;

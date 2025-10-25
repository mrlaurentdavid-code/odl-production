-- ============================================================================
-- Migration: Create O!Deal Business Rules
-- Date: 2025-10-25
-- Description: Configuration thresholds for validation logic
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.odeal_business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer savings thresholds
  deal_min_eco_vs_msrp_percent NUMERIC DEFAULT 30,
  deal_min_eco_vs_street_price_percent NUMERIC DEFAULT 15,

  -- Margin thresholds
  target_gross_margin_percent NUMERIC DEFAULT 30,
  minimum_gross_margin_percent NUMERIC DEFAULT 20,
  maximum_gross_margin_percent NUMERIC DEFAULT 50,

  -- Currency safety coefficient (protection against rate fluctuations)
  currency_safety_coefficient NUMERIC DEFAULT 1.02,  -- 2% safety margin

  -- Payment processing fees
  payment_processing_fee_percent NUMERIC DEFAULT 2.9,
  payment_processing_fee_fixed_chf NUMERIC DEFAULT 0.30,

  -- Anti-gaming thresholds
  max_price_modifications_per_item INT DEFAULT 3,
  price_modification_time_window_minutes INT DEFAULT 15,

  -- Status
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active rule at a time
CREATE UNIQUE INDEX idx_odeal_business_rules_active
ON odeal_business_rules(is_active)
WHERE is_active = true;

-- Enable RLS
ALTER TABLE odeal_business_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_odeal_business_rules"
ON odeal_business_rules
USING (false);

COMMENT ON TABLE odeal_business_rules IS
  'Business validation rules. Editable thresholds for margins, savings, and anti-gaming.';

COMMENT ON COLUMN odeal_business_rules.currency_safety_coefficient IS
  'Multiplier applied to currency conversion (1.02 = 2% safety margin). Protects against rate fluctuations.';

-- Insert default rules
INSERT INTO odeal_business_rules (
  deal_min_eco_vs_msrp_percent,
  deal_min_eco_vs_street_price_percent,
  target_gross_margin_percent,
  minimum_gross_margin_percent,
  maximum_gross_margin_percent,
  currency_safety_coefficient,
  payment_processing_fee_percent,
  payment_processing_fee_fixed_chf,
  max_price_modifications_per_item,
  price_modification_time_window_minutes,
  is_active,
  notes
) VALUES (
  30,    -- Min 30% saving vs MSRP
  15,    -- Min 15% saving vs Street Price
  30,    -- Target 30% gross margin
  20,    -- Minimum 20% gross margin
  50,    -- Maximum 50% gross margin
  1.02,  -- 2% currency safety coefficient
  2.9,   -- Stripe fee 2.9%
  0.30,  -- Stripe fixed fee 0.30 CHF
  3,     -- Max 3 price modifications per item
  15,    -- Within 15 minutes window
  true,
  'Default O!Deal validation rules - MVP October 2025'
);

-- Function: Get active rules
CREATE OR REPLACE FUNCTION get_active_business_rules()
RETURNS odeal_business_rules
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM odeal_business_rules
  WHERE is_active = true
  AND (valid_until IS NULL OR valid_until > NOW())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_active_business_rules TO anon, authenticated;

-- Verification
DO $$
DECLARE
  v_rules_count INT;
BEGIN
  SELECT COUNT(*) INTO v_rules_count FROM odeal_business_rules WHERE is_active = true;

  IF v_rules_count = 1 THEN
    RAISE NOTICE '✓ Business rules created successfully (active rules: %)', v_rules_count;
  ELSE
    RAISE EXCEPTION '✗ Expected 1 active rule, got %', v_rules_count;
  END IF;
END $$;

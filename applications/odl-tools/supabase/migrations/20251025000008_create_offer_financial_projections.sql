-- ============================================================================
-- Migration: Create Offer Financial Projections
-- Date: 2025-10-25
-- Description: BEP (Break-Even Point) and risk analysis per offer
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offer_financial_projections (
  projection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES supplier_registry(supplier_id) ON DELETE CASCADE,

  -- Item counts
  total_items_count INT,
  total_items_publishable INT,  -- is_valid = true
  total_units_available INT,

  -- Financial aggregates (HT CHF)
  ca_max_ht NUMERIC,  -- Max revenue if all units sell
  marge_brute_total_ht NUMERIC,
  marge_brute_avg_percent NUMERIC,

  -- Break-Even Point
  fixed_costs_ht NUMERIC DEFAULT 95,  -- Default PESA fee
  bep_ca_ht NUMERIC,  -- Minimum revenue to break even
  bep_units INT,  -- Minimum units to sell
  bep_sellthrough_percent NUMERIC,  -- % of stock to sell

  -- Risk Score (A/B/C/D)
  risk_score TEXT CHECK (risk_score IN ('A', 'B', 'C', 'D')),
  risk_factors JSONB,
  alerts TEXT[],

  -- Scenarios
  scenario_pessimistic_ca_ht NUMERIC,  -- 25% sellthrough
  scenario_realistic_ca_ht NUMERIC,    -- 50% sellthrough
  scenario_optimistic_ca_ht NUMERIC,   -- 75% sellthrough

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX idx_offer_financial_projections_supplier
ON offer_financial_projections(supplier_id);

CREATE INDEX idx_offer_financial_projections_risk
ON offer_financial_projections(risk_score);

-- Enable RLS
ALTER TABLE offer_financial_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_offer_financial_projections"
ON offer_financial_projections
USING (false);

COMMENT ON TABLE offer_financial_projections IS
  'Financial analysis and BEP for offers. Calculated from offer_item_calculated_costs.';

COMMENT ON COLUMN offer_financial_projections.bep_sellthrough_percent IS
  'Percentage of stock needed to sell to break even. Lower = less risky.';

COMMENT ON COLUMN offer_financial_projections.risk_score IS
  'A: BEP ≤10% (very low risk), B: ≤25%, C: ≤50%, D: >50% (high risk)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Table offer_financial_projections created successfully';
END $$;

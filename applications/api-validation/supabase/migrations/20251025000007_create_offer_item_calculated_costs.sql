-- ============================================================================
-- Migration: Create Offer Item Calculated Costs
-- Date: 2025-10-25
-- Description: CONFIDENTIAL - Detailed cost breakdown per item
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offer_item_calculated_costs (
  -- Primary key
  cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  offer_id UUID NOT NULL,
  item_id UUID,      -- NULL for simple items
  variant_id UUID,   -- NULL for simple items
  supplier_id UUID NOT NULL REFERENCES supplier_registry(supplier_id) ON DELETE CASCADE,
  user_id UUID REFERENCES supplier_users(user_id) ON DELETE SET NULL,

  -- Product info (copied from request)
  ean TEXT,
  product_name TEXT,
  subcategory_id UUID,
  quantity INT DEFAULT 1,

  -- Prices (TTC)
  msrp NUMERIC NOT NULL,
  street_price NUMERIC NOT NULL,
  promo_price NUMERIC NOT NULL,

  -- Purchase (HT original currency)
  purchase_price_ht NUMERIC NOT NULL,
  purchase_currency TEXT NOT NULL DEFAULT 'CHF',
  currency_rate NUMERIC NOT NULL DEFAULT 1,
  currency_safety_coefficient NUMERIC NOT NULL DEFAULT 1.02,

  -- Purchase converted (HT CHF with safety coefficient)
  purchase_price_chf_ht NUMERIC GENERATED ALWAYS AS (
    purchase_price_ht * currency_rate * currency_safety_coefficient
  ) STORED,

  -- Dimensions & weight
  package_weight_kg NUMERIC,
  length_cm NUMERIC,
  width_cm NUMERIC,
  height_cm NUMERIC,

  -- Cost breakdown (HT CHF)
  logistics_inbound_ht NUMERIC DEFAULT 0,
  logistics_inbound_carrier TEXT,
  logistics_outbound_ht NUMERIC DEFAULT 0,
  logistics_outbound_carrier TEXT,
  customs_duty_ht NUMERIC DEFAULT 0,
  customs_duty_rate NUMERIC DEFAULT 0,
  tar_ht NUMERIC DEFAULT 0,
  tar_rate NUMERIC DEFAULT 0,
  pesa_fee_ht NUMERIC DEFAULT 0,
  warranty_cost_ht NUMERIC DEFAULT 0,
  payment_processing_fee_ht NUMERIC DEFAULT 0,

  -- Total COGS (HT CHF) - GENERATED
  cogs_total_ht NUMERIC GENERATED ALWAYS AS (
    purchase_price_ht * currency_rate * currency_safety_coefficient +
    logistics_inbound_ht +
    logistics_outbound_ht +
    customs_duty_ht +
    tar_ht +
    pesa_fee_ht +
    warranty_cost_ht +
    payment_processing_fee_ht
  ) STORED,

  -- Margins - GENERATED
  marge_brute_ht NUMERIC GENERATED ALWAYS AS (
    promo_price - (
      purchase_price_ht * currency_rate * currency_safety_coefficient +
      logistics_inbound_ht +
      logistics_outbound_ht +
      customs_duty_ht +
      tar_ht +
      pesa_fee_ht +
      warranty_cost_ht +
      payment_processing_fee_ht
    )
  ) STORED,

  marge_brute_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN promo_price > 0
    THEN ((promo_price - (
      purchase_price_ht * currency_rate * currency_safety_coefficient +
      logistics_inbound_ht +
      logistics_outbound_ht +
      customs_duty_ht +
      tar_ht +
      pesa_fee_ht +
      warranty_cost_ht +
      payment_processing_fee_ht
    )) / promo_price * 100)
    ELSE 0
    END
  ) STORED,

  -- Customer savings - GENERATED
  eco_vs_msrp_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN msrp > 0
    THEN ((msrp - promo_price) / msrp * 100)
    ELSE 0
    END
  ) STORED,

  eco_vs_street_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN street_price > 0
    THEN ((street_price - promo_price) / street_price * 100)
    ELSE 0
    END
  ) STORED,

  -- Validation result
  deal_status TEXT CHECK (deal_status IN ('top', 'good', 'almost', 'bad')),
  is_valid BOOLEAN GENERATED ALWAYS AS (deal_status IN ('top', 'good')) STORED,
  validation_message_key TEXT,
  validation_issues JSONB DEFAULT '[]'::JSONB,

  -- Anti-gaming
  gaming_detected BOOLEAN DEFAULT false,

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX idx_offer_item_calculated_costs_offer
ON offer_item_calculated_costs(offer_id);

CREATE INDEX idx_offer_item_calculated_costs_supplier
ON offer_item_calculated_costs(supplier_id);

CREATE INDEX idx_offer_item_calculated_costs_item
ON offer_item_calculated_costs(item_id)
WHERE item_id IS NOT NULL;

CREATE INDEX idx_offer_item_calculated_costs_variant
ON offer_item_calculated_costs(variant_id)
WHERE variant_id IS NOT NULL;

CREATE INDEX idx_offer_item_calculated_costs_valid
ON offer_item_calculated_costs(offer_id, is_valid)
WHERE is_valid = true;

-- Enable RLS (CRITICAL - DENY ALL)
ALTER TABLE offer_item_calculated_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_offer_item_calculated_costs"
ON offer_item_calculated_costs
USING (false);

COMMENT ON TABLE offer_item_calculated_costs IS
  '⚠️ CONFIDENTIAL - Detailed cost breakdown. Suppliers NEVER see this. Access via SECURITY DEFINER functions only.';

COMMENT ON COLUMN offer_item_calculated_costs.cogs_total_ht IS
  'Total Cost of Goods Sold (HT CHF). Includes ALL costs to deliver product to customer.';

COMMENT ON COLUMN offer_item_calculated_costs.marge_brute_percent IS
  'Gross margin percentage. Formula: (Promo Price - COGS) / Promo Price * 100';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Table offer_item_calculated_costs created with GENERATED columns';
END $$;

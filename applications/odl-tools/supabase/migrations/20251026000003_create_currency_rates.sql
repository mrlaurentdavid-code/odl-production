-- ============================================================================
-- Migration: Create Currency Rates Table
-- Date: 2025-10-26
-- Description: Currency exchange rates for price conversions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Currency pair
  from_currency TEXT NOT NULL CHECK (from_currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('EUR', 'USD', 'GBP', 'CHF')),

  -- Exchange rate
  rate NUMERIC NOT NULL CHECK (rate > 0),

  -- Metadata
  source TEXT DEFAULT 'manual',  -- manual, api, etc.
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_currency_rates_pair ON currency_rates(from_currency, to_currency);
CREATE INDEX idx_currency_rates_active ON currency_rates(is_active) WHERE is_active = true;

-- Only one active rate per currency pair
CREATE UNIQUE INDEX idx_currency_rates_unique_active_pair
ON currency_rates(from_currency, to_currency)
WHERE is_active = true;

-- Enable RLS
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Read-only for authenticated users
CREATE POLICY "currency_rates_read_only"
ON currency_rates
FOR SELECT
USING (is_active = true);

COMMENT ON TABLE currency_rates IS
  'Currency exchange rates for converting supplier prices to CHF';

-- Insert default rates (EUR to CHF is most common)
INSERT INTO currency_rates (from_currency, to_currency, rate, source, is_active) VALUES
  ('EUR', 'CHF', 0.9248, 'manual', true),
  ('USD', 'CHF', 0.8500, 'manual', true),
  ('GBP', 'CHF', 1.1200, 'manual', true),
  ('CHF', 'CHF', 1.0000, 'manual', true)
ON CONFLICT DO NOTHING;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Currency rates table created with default rates';
END $$;

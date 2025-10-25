-- ============================================================================
-- Migration: Create Currency Change Table
-- Date: 2025-10-24
-- Description: Table for storing daily currency exchange rates
-- Note: Must be created BEFORE currency refresh cron migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.currency_change (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Currency pair
  base TEXT NOT NULL,   -- e.g., 'EUR'
  quote TEXT NOT NULL,  -- e.g., 'CHF'

  -- Rate data
  date DATE NOT NULL,
  rate NUMERIC NOT NULL,

  -- Source info
  source TEXT DEFAULT 'frankfurter' NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_currency_change_pair
ON currency_change(base, quote, fetched_at DESC);

CREATE INDEX idx_currency_change_date
ON currency_change(date DESC);

-- No RLS needed (public read-only data)
-- But we enable it anyway for consistency
ALTER TABLE currency_change ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_currency_change"
ON currency_change
FOR SELECT
USING (true);

COMMENT ON TABLE currency_change IS
  'Daily currency exchange rates from Frankfurter API (ECB rates). Refreshed daily at 2 AM.';

COMMENT ON COLUMN currency_change.base IS
  'Base currency (3-letter code, e.g., EUR, USD, GBP)';

COMMENT ON COLUMN currency_change.quote IS
  'Quote currency (always CHF for O!Deal validation)';

COMMENT ON COLUMN currency_change.rate IS
  'Exchange rate: 1 base = rate × quote. Example: 1 EUR = 0.9248 CHF';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Table currency_change created successfully';
  RAISE NOTICE '  Ready for currency refresh Edge Function';
END $$;

-- Migration: Setup Daily Currency Refresh
-- Date: 2025-10-25
-- Description: Configure pg_cron to refresh EUR/USD/GBP→CHF rates daily at 2:00 AM

-- ============================================================================
-- STEP 1: Enable pg_cron extension (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 2: Grant permissions to postgres role
-- ============================================================================

GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- STEP 3: Schedule daily currency refresh
-- ============================================================================

-- Remove existing job if it exists (ignore error if not found)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-currency-daily');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist yet, that's OK
  NULL;
END $$;

-- Schedule new job (runs every day at 2:00 AM UTC)
SELECT cron.schedule(
  'refresh-currency-daily',
  '0 2 * * *',  -- Cron syntax: minute hour day month weekday
  $$
    SELECT net.http_post(
      url := 'https://xewnzetqvrovqjcvwkus.supabase.co/functions/v1/refresh-currency',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
      )
    );
  $$
);

-- ============================================================================
-- STEP 4: Create helper function to check last refresh
-- ============================================================================

CREATE OR REPLACE FUNCTION get_last_currency_refresh()
RETURNS TABLE (
  base TEXT,
  quote TEXT,
  rate NUMERIC,
  fetched_at TIMESTAMPTZ,
  age_hours NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    base,
    quote,
    rate,
    fetched_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - fetched_at)) / 3600, 2) AS age_hours
  FROM currency_change
  WHERE (base, quote, fetched_at) IN (
    SELECT base, quote, MAX(fetched_at)
    FROM currency_change
    GROUP BY base, quote
  )
  ORDER BY base, quote;
$$;

COMMENT ON FUNCTION get_last_currency_refresh() IS
  'Returns the most recent currency rates for all pairs with their age in hours';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_last_currency_refresh() TO anon, authenticated;

-- ============================================================================
-- STEP 5: Create manual refresh trigger function (for testing)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_currency_refresh()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response JSONB;
BEGIN
  -- Call Edge Function
  SELECT content::JSONB INTO v_response
  FROM net.http_post(
    url := 'https://xewnzetqvrovqjcvwkus.supabase.co/functions/v1/refresh-currency',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
    )
  );

  RETURN v_response;
END;
$$;

COMMENT ON FUNCTION trigger_currency_refresh() IS
  'Manually trigger currency refresh for testing. Use: SELECT trigger_currency_refresh();';

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION trigger_currency_refresh() TO authenticated;

-- ============================================================================
-- STEP 6: Add index for performance
-- ============================================================================

-- Index for fast lookups by (base, quote, fetched_at DESC)
CREATE INDEX IF NOT EXISTS idx_currency_change_lookup
ON currency_change (base, quote, fetched_at DESC);

-- ============================================================================
-- STEP 7: Verify cron job created
-- ============================================================================

-- Query to check cron jobs
DO $$
DECLARE
  v_job_count INT;
BEGIN
  SELECT COUNT(*) INTO v_job_count
  FROM cron.job
  WHERE jobname = 'refresh-currency-daily';

  IF v_job_count = 0 THEN
    RAISE EXCEPTION 'Cron job was not created successfully';
  END IF;

  RAISE NOTICE 'Cron job "refresh-currency-daily" created successfully';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- To view all cron jobs:
-- SELECT * FROM cron.job;

-- To view cron job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To manually trigger refresh (for testing):
-- SELECT trigger_currency_refresh();

-- To check last refresh:
-- SELECT * FROM get_last_currency_refresh();

-- To unschedule (disable) the job:
-- SELECT cron.unschedule('refresh-currency-daily');

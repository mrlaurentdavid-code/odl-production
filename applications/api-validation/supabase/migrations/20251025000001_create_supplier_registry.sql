-- ============================================================================
-- Migration: Create Supplier Registry
-- Date: 2025-10-25
-- Description: Registry of approved suppliers with API key authentication
-- ============================================================================

-- Create supplier_registry table
CREATE TABLE IF NOT EXISTS public.supplier_registry (
  -- Primary identification
  supplier_id UUID PRIMARY KEY,

  -- Company info (optional, for debugging)
  company_name TEXT,
  company_email TEXT,

  -- API Key authentication (hashed for security)
  api_key_hash TEXT UNIQUE NOT NULL,
  api_key_prefix TEXT NOT NULL,  -- First 12 chars for identification (e.g., "odl_sup_abc1")
  api_key_created_at TIMESTAMPTZ DEFAULT NOW(),
  api_key_last_used_at TIMESTAMPTZ,
  api_key_expires_at TIMESTAMPTZ,  -- NULL = never expires

  -- Status flags
  is_active BOOLEAN DEFAULT true,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('pending', 'approved', 'rejected', 'suspended')),

  -- Rate limiting
  max_daily_validations INT DEFAULT 1000,
  daily_validations_count INT DEFAULT 0,
  last_validation_reset DATE DEFAULT CURRENT_DATE,

  -- Sync metadata
  synced_from TEXT DEFAULT 'weweb',
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional metadata
  notes TEXT,
  tags TEXT[]
);

-- Indexes for performance
CREATE INDEX idx_supplier_registry_api_key_hash
ON supplier_registry(api_key_hash);

CREATE INDEX idx_supplier_registry_active
ON supplier_registry(supplier_id)
WHERE is_active = true AND validation_status = 'approved';

CREATE INDEX idx_supplier_registry_reset
ON supplier_registry(last_validation_reset)
WHERE daily_validations_count > 0;

-- Enable RLS (deny all by default, functions will use SECURITY DEFINER)
ALTER TABLE supplier_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_supplier_registry"
ON supplier_registry
USING (false);

-- Comments
COMMENT ON TABLE supplier_registry IS
  'Registry of suppliers synced from WeWeb. Used for API key authentication and rate limiting.';

COMMENT ON COLUMN supplier_registry.api_key_hash IS
  'SHA256 hash of the API key. Never store plain text keys.';

COMMENT ON COLUMN supplier_registry.api_key_prefix IS
  'First 12 characters of API key for identification in logs (e.g., "odl_sup_abc1").';

COMMENT ON COLUMN supplier_registry.daily_validations_count IS
  'Number of validation requests today. Reset daily by cron job.';

-- Function: Verify API Key
CREATE OR REPLACE FUNCTION verify_supplier_api_key(p_api_key TEXT)
RETURNS TABLE (
  supplier_id UUID,
  is_valid BOOLEAN,
  error_message TEXT,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_api_key_hash TEXT;
  v_supplier RECORD;
BEGIN
  -- Validate input
  IF p_api_key IS NULL OR LENGTH(p_api_key) < 20 THEN
    RETURN QUERY SELECT
      NULL::UUID,
      false,
      'Invalid API key format'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Hash the provided key
  v_api_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');

  -- Lookup supplier
  SELECT
    sr.supplier_id,
    sr.company_name,
    sr.is_active,
    sr.validation_status,
    sr.daily_validations_count,
    sr.max_daily_validations,
    sr.api_key_expires_at
  INTO v_supplier
  FROM supplier_registry sr
  WHERE sr.api_key_hash = v_api_key_hash;

  -- Check if found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID,
      false,
      'Invalid API key'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_supplier.api_key_expires_at IS NOT NULL
     AND v_supplier.api_key_expires_at < NOW() THEN
    RETURN QUERY SELECT
      v_supplier.supplier_id,
      false,
      'API key expired'::TEXT,
      v_supplier.company_name;
    RETURN;
  END IF;

  -- Check if active
  IF v_supplier.is_active = false THEN
    RETURN QUERY SELECT
      v_supplier.supplier_id,
      false,
      'Supplier account disabled'::TEXT,
      v_supplier.company_name;
    RETURN;
  END IF;

  -- Check validation status
  IF v_supplier.validation_status != 'approved' THEN
    RETURN QUERY SELECT
      v_supplier.supplier_id,
      false,
      'Supplier not approved (status: ' || v_supplier.validation_status || ')'::TEXT,
      v_supplier.company_name;
    RETURN;
  END IF;

  -- Check daily quota
  IF v_supplier.daily_validations_count >= v_supplier.max_daily_validations THEN
    RETURN QUERY SELECT
      v_supplier.supplier_id,
      false,
      'Daily validation quota exceeded (' || v_supplier.max_daily_validations || ')'::TEXT,
      v_supplier.company_name;
    RETURN;
  END IF;

  -- Update last used timestamp
  UPDATE supplier_registry
  SET
    api_key_last_used_at = NOW(),
    updated_at = NOW()
  WHERE supplier_registry.supplier_id = v_supplier.supplier_id;

  -- Return success
  RETURN QUERY SELECT
    v_supplier.supplier_id,
    true,
    NULL::TEXT,
    v_supplier.company_name;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_supplier_api_key TO anon, authenticated;

COMMENT ON FUNCTION verify_supplier_api_key IS
  'Verifies supplier API key and returns supplier_id if valid. Called by API Gateway.';

-- Function: Reset daily quotas (called by cron)
CREATE OR REPLACE FUNCTION reset_daily_supplier_quotas()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE supplier_registry
  SET
    daily_validations_count = 0,
    last_validation_reset = CURRENT_DATE,
    updated_at = NOW()
  WHERE last_validation_reset < CURRENT_DATE
  RETURNING 1;

  SELECT COUNT(*)::INT FROM (
    SELECT 1 FROM supplier_registry WHERE last_validation_reset = CURRENT_DATE
  ) t;
$$;

COMMENT ON FUNCTION reset_daily_supplier_quotas IS
  'Resets daily validation counters for all suppliers. Run by cron at midnight.';

-- Schedule daily reset (requires pg_cron extension)
DO $$
BEGIN
  -- Try to unschedule existing job first (ignore if doesn't exist)
  BEGIN
    PERFORM cron.unschedule('reset-supplier-quotas');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Try to schedule cron job (will fail gracefully if pg_cron not available)
  BEGIN
    PERFORM cron.schedule(
      'reset-supplier-quotas',
      '0 0 * * *',  -- Midnight every day
      'SELECT reset_daily_supplier_quotas();'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job (pg_cron may not be enabled): %', SQLERRM;
  END;
END $$;

-- Verification
DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'supplier_registry'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    RAISE NOTICE '✓ Table supplier_registry created successfully';
  ELSE
    RAISE EXCEPTION '✗ Table supplier_registry was not created';
  END IF;
END $$;

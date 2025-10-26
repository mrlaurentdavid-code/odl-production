-- ============================================================================
-- Migration: Create Supplier API Keys Table
-- Date: 2025-10-26
-- Description: Table to store hashed API keys for supplier authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_api_keys (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to supplier
  supplier_id UUID NOT NULL REFERENCES supplier_registry(supplier_id) ON DELETE CASCADE,

  -- API key (hashed with SHA256)
  api_key_hash TEXT NOT NULL,

  -- Metadata
  key_name TEXT NOT NULL,
  created_by UUID,  -- user_id who created this key

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,  -- NULL = never expires

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_supplier_api_keys_supplier
ON supplier_api_keys(supplier_id);

CREATE INDEX idx_supplier_api_keys_hash
ON supplier_api_keys(api_key_hash)
WHERE is_active = true;

CREATE INDEX idx_supplier_api_keys_lookup
ON supplier_api_keys(supplier_id, api_key_hash)
WHERE is_active = true;

-- Unique constraint: same hash can't be used twice for same supplier
CREATE UNIQUE INDEX idx_supplier_api_keys_unique_hash_per_supplier
ON supplier_api_keys(supplier_id, api_key_hash);

-- Enable RLS
ALTER TABLE supplier_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Deny all direct access (only via API)
CREATE POLICY "deny_all_supplier_api_keys"
ON supplier_api_keys
USING (false);

-- Comment
COMMENT ON TABLE supplier_api_keys IS
  'Hashed API keys for supplier authentication. Keys are stored as SHA256 hashes for security.';

COMMENT ON COLUMN supplier_api_keys.api_key_hash IS
  'SHA256 hash of the API key. Never store plain text keys!';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_api_keys') THEN
    RAISE NOTICE '✓ Table supplier_api_keys created successfully';
  END IF;
END $$;

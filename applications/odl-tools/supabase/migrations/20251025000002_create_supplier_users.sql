-- ============================================================================
-- Migration: Create Supplier Users
-- Date: 2025-10-25
-- Description: Users associated with suppliers for granular audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_users (
  -- Primary identification
  user_id UUID PRIMARY KEY,  -- primary_contact_id from WeWeb
  supplier_id UUID NOT NULL REFERENCES supplier_registry(supplier_id) ON DELETE CASCADE,

  -- User info (optional, for debugging)
  user_email TEXT,
  user_name TEXT,

  -- Role within company
  role TEXT CHECK (role IN ('primary_contact', 'secondary_contact', 'admin', 'viewer')),
  is_primary BOOLEAN DEFAULT false,

  -- Permissions
  can_create_offers BOOLEAN DEFAULT true,
  can_validate_items BOOLEAN DEFAULT true,
  can_modify_prices BOOLEAN DEFAULT true,
  can_view_costs BOOLEAN DEFAULT false,  -- NEVER true for suppliers

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Sync metadata
  synced_from TEXT DEFAULT 'weweb',
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_supplier_users_supplier
ON supplier_users(supplier_id);

CREATE INDEX idx_supplier_users_lookup
ON supplier_users(user_id, supplier_id)
WHERE is_active = true;

CREATE INDEX idx_supplier_users_primary
ON supplier_users(supplier_id)
WHERE is_primary = true;

-- Unique constraint: only one primary contact per supplier
CREATE UNIQUE INDEX idx_supplier_users_one_primary
ON supplier_users(supplier_id)
WHERE is_primary = true;

-- Enable RLS
ALTER TABLE supplier_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_supplier_users"
ON supplier_users
USING (false);

COMMENT ON TABLE supplier_users IS
  'Users associated with suppliers. Enables user-level audit trail and permissions.';

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'supplier_users') THEN
    RAISE NOTICE '✓ Table supplier_users created successfully';
  END IF;
END $$;

-- ============================================================================
-- Migration: Create Offer Metadata
-- Date: 2025-10-25
-- Description: Index table for offers synced from WeWeb
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offer_metadata (
  offer_id UUID PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES supplier_registry(supplier_id) ON DELETE CASCADE,

  -- Offer info (from WeWeb)
  deal_name TEXT,
  offer_type TEXT,
  status TEXT,
  selected_category TEXT,

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Validation tracking
  items_validated_count INT DEFAULT 0,
  last_validation_at TIMESTAMPTZ,

  -- Projection cached
  has_projection BOOLEAN DEFAULT false,
  last_projection_at TIMESTAMPTZ,

  -- Sync
  synced_from TEXT DEFAULT 'weweb',
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_offer_metadata_supplier
ON offer_metadata(supplier_id);

CREATE INDEX idx_offer_metadata_status
ON offer_metadata(status, start_date DESC);

-- Enable RLS
ALTER TABLE offer_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_offer_metadata"
ON offer_metadata
USING (false);

COMMENT ON TABLE offer_metadata IS
  'Metadata index for offers. Lightweight tracking without duplicating WeWeb data.';

-- Function: Upsert offer metadata
CREATE OR REPLACE FUNCTION upsert_offer_metadata(
  p_offer_id UUID,
  p_supplier_id UUID,
  p_deal_name TEXT DEFAULT NULL,
  p_offer_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS offer_metadata
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result offer_metadata;
BEGIN
  INSERT INTO offer_metadata (
    offer_id,
    supplier_id,
    deal_name,
    offer_type,
    status,
    last_sync_at
  ) VALUES (
    p_offer_id,
    p_supplier_id,
    p_deal_name,
    p_offer_type,
    p_status,
    NOW()
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    deal_name = COALESCE(EXCLUDED.deal_name, offer_metadata.deal_name),
    offer_type = COALESCE(EXCLUDED.offer_type, offer_metadata.offer_type),
    status = COALESCE(EXCLUDED.status, offer_metadata.status),
    last_sync_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_offer_metadata TO anon, authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Table offer_metadata created successfully';
END $$;

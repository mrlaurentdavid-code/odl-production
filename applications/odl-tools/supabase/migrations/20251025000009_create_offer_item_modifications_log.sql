-- ============================================================================
-- Migration: Create Offer Item Modifications Log
-- Date: 2025-10-25
-- Description: Anti-gaming audit trail for price modifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offer_item_modifications_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  offer_id UUID NOT NULL,
  item_id UUID,
  variant_id UUID,
  supplier_id UUID NOT NULL REFERENCES supplier_registry(supplier_id) ON DELETE CASCADE,
  user_id UUID REFERENCES supplier_users(user_id) ON DELETE SET NULL,

  -- Modification type
  modification_type TEXT NOT NULL CHECK (modification_type IN (
    'validate_item',
    'price_change',
    'quantity_change',
    'product_change',
    'unauthorized_access_attempt',
    'other'
  )),

  -- Values before/after
  old_values JSONB,
  new_values JSONB,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for anti-gaming queries
CREATE INDEX idx_offer_item_modifications_log_offer
ON offer_item_modifications_log(offer_id, created_at DESC);

CREATE INDEX idx_offer_item_modifications_log_supplier
ON offer_item_modifications_log(supplier_id, created_at DESC);

CREATE INDEX idx_offer_item_modifications_log_user
ON offer_item_modifications_log(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX idx_offer_item_modifications_log_item
ON offer_item_modifications_log(item_id, modification_type, created_at DESC)
WHERE item_id IS NOT NULL AND modification_type = 'price_change';

-- Enable RLS
ALTER TABLE offer_item_modifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_offer_item_modifications_log"
ON offer_item_modifications_log
USING (false);

COMMENT ON TABLE offer_item_modifications_log IS
  'Audit trail for item modifications. Used for anti-gaming detection.';

-- Function: Count recent modifications (anti-gaming)
CREATE OR REPLACE FUNCTION count_recent_price_modifications(
  p_user_id UUID,
  p_item_id UUID,
  p_window_minutes INT DEFAULT 15
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM offer_item_modifications_log
  WHERE user_id = p_user_id
    AND item_id = p_item_id
    AND modification_type = 'price_change'
    AND created_at >= (NOW() - (p_window_minutes || ' minutes')::INTERVAL);
$$;

GRANT EXECUTE ON FUNCTION count_recent_price_modifications TO anon, authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Table offer_item_modifications_log created for anti-gaming tracking';
END $$;

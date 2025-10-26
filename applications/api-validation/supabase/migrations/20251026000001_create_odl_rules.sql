-- ============================================================================
-- Migration: Create ODL Rules (Hierarchical Business Rules)
-- Date: 2025-10-26
-- Description: Flexible business rules with global/category/subcategory hierarchy
-- ============================================================================

-- Create odl_rules table
CREATE TABLE IF NOT EXISTS public.odl_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule scope (hierarchy)
  scope TEXT NOT NULL CHECK (scope IN ('global', 'category', 'subcategory')),
  category_name TEXT,          -- NULL for global, required for category/subcategory
  subcategory_name TEXT,       -- NULL for global/category, required for subcategory

  -- Rule name and description
  rule_name TEXT NOT NULL,
  description TEXT,

  -- Customer savings thresholds
  deal_min_eco_vs_msrp_percent NUMERIC DEFAULT 30,
  deal_min_eco_vs_street_price_percent NUMERIC DEFAULT 15,

  -- Margin thresholds
  target_gross_margin_percent NUMERIC DEFAULT 30,
  minimum_gross_margin_percent NUMERIC DEFAULT 20,
  maximum_gross_margin_percent NUMERIC DEFAULT 50,

  -- Currency safety coefficient (protection against rate fluctuations)
  currency_safety_coefficient NUMERIC DEFAULT 1.02,  -- 2% safety margin

  -- Payment processing fees
  payment_processing_fee_percent NUMERIC DEFAULT 2.9,
  payment_processing_fee_fixed_chf NUMERIC DEFAULT 0.30,

  -- Anti-gaming thresholds
  max_price_modifications_per_item INT DEFAULT 3,
  price_modification_time_window_minutes INT DEFAULT 15,

  -- Priority (lower = higher priority, used for conflict resolution)
  priority INT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints

-- Global scope: only one active global rule at a time
CREATE UNIQUE INDEX idx_odl_rules_one_active_global
ON odl_rules(scope)
WHERE scope = 'global' AND is_active = true;

-- Category scope: one active rule per category
CREATE UNIQUE INDEX idx_odl_rules_one_per_category
ON odl_rules(category_name)
WHERE scope = 'category' AND is_active = true;

-- Subcategory scope: one active rule per subcategory
CREATE UNIQUE INDEX idx_odl_rules_one_per_subcategory
ON odl_rules(category_name, subcategory_name)
WHERE scope = 'subcategory' AND is_active = true;

-- Ensure category_name is not null for category/subcategory rules
CREATE OR REPLACE FUNCTION validate_odl_rule_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scope = 'category' AND NEW.category_name IS NULL THEN
    RAISE EXCEPTION 'category_name is required for scope=category';
  END IF;

  IF NEW.scope = 'subcategory' AND (NEW.category_name IS NULL OR NEW.subcategory_name IS NULL) THEN
    RAISE EXCEPTION 'category_name and subcategory_name are required for scope=subcategory';
  END IF;

  IF NEW.scope = 'global' AND (NEW.category_name IS NOT NULL OR NEW.subcategory_name IS NOT NULL) THEN
    RAISE EXCEPTION 'category_name and subcategory_name must be NULL for scope=global';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_odl_rule_scope
BEFORE INSERT OR UPDATE ON odl_rules
FOR EACH ROW
EXECUTE FUNCTION validate_odl_rule_scope();

-- Prevent deletion of global rule
CREATE OR REPLACE FUNCTION prevent_global_rule_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.scope = 'global' THEN
    RAISE EXCEPTION 'Cannot delete global rule. Deactivate it instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_delete_global_rule
BEFORE DELETE ON odl_rules
FOR EACH ROW
EXECUTE FUNCTION prevent_global_rule_deletion();

-- Indexes
CREATE INDEX idx_odl_rules_scope ON odl_rules(scope);
CREATE INDEX idx_odl_rules_category ON odl_rules(category_name) WHERE category_name IS NOT NULL;
CREATE INDEX idx_odl_rules_subcategory ON odl_rules(category_name, subcategory_name) WHERE subcategory_name IS NOT NULL;
CREATE INDEX idx_odl_rules_active ON odl_rules(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE odl_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage rules (enforced via API with service role key)
CREATE POLICY "deny_all_odl_rules"
ON odl_rules
USING (false);

-- Comments
COMMENT ON TABLE odl_rules IS
  'Hierarchical business validation rules. Supports global, category, and subcategory-specific rules.';

COMMENT ON COLUMN odl_rules.scope IS
  'Rule scope: global (applies to all), category (specific category), subcategory (specific subcategory)';

COMMENT ON COLUMN odl_rules.priority IS
  'Priority for conflict resolution (lower = higher priority). Not currently used but reserved for future.';

-- ============================================================================
-- Function: Get applicable rules for a given category/subcategory
-- ============================================================================

CREATE OR REPLACE FUNCTION get_applicable_rules(
  p_category_name TEXT DEFAULT NULL,
  p_subcategory_name TEXT DEFAULT NULL
)
RETURNS odl_rules
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rules odl_rules;
BEGIN
  -- Priority 1: Try subcategory-specific rule (if both provided)
  IF p_category_name IS NOT NULL AND p_subcategory_name IS NOT NULL THEN
    SELECT * INTO v_rules
    FROM odl_rules
    WHERE scope = 'subcategory'
      AND category_name = p_category_name
      AND subcategory_name = p_subcategory_name
      AND is_active = true
      AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY priority ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_rules;
    END IF;
  END IF;

  -- Priority 2: Try category-specific rule (if category provided)
  IF p_category_name IS NOT NULL THEN
    SELECT * INTO v_rules
    FROM odl_rules
    WHERE scope = 'category'
      AND category_name = p_category_name
      AND is_active = true
      AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY priority ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_rules;
    END IF;
  END IF;

  -- Priority 3: Fallback to global rule
  SELECT * INTO v_rules
  FROM odl_rules
  WHERE scope = 'global'
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
  ORDER BY priority ASC
  LIMIT 1;

  RETURN v_rules;
END;
$$;

GRANT EXECUTE ON FUNCTION get_applicable_rules TO anon, authenticated;

COMMENT ON FUNCTION get_applicable_rules IS
  'Returns applicable rules based on hierarchy: subcategory > category > global';

-- ============================================================================
-- Insert default global rule (migrating from odeal_business_rules)
-- ============================================================================

INSERT INTO odl_rules (
  scope,
  category_name,
  subcategory_name,
  rule_name,
  description,
  deal_min_eco_vs_msrp_percent,
  deal_min_eco_vs_street_price_percent,
  target_gross_margin_percent,
  minimum_gross_margin_percent,
  maximum_gross_margin_percent,
  currency_safety_coefficient,
  payment_processing_fee_percent,
  payment_processing_fee_fixed_chf,
  max_price_modifications_per_item,
  price_modification_time_window_minutes,
  priority,
  is_active,
  notes
) VALUES (
  'global',
  NULL,
  NULL,
  'Global Default Rules',
  'Default validation rules applied to all deals unless overridden by category or subcategory rules',
  30,    -- Min 30% saving vs MSRP
  15,    -- Min 15% saving vs Street Price
  30,    -- Target 30% gross margin
  20,    -- Minimum 20% gross margin
  50,    -- Maximum 50% gross margin
  1.02,  -- 2% currency safety coefficient
  2.9,   -- Stripe fee 2.9%
  0.30,  -- Stripe fixed fee 0.30 CHF
  3,     -- Max 3 price modifications per item
  15,    -- Within 15 minutes window
  0,     -- Highest priority
  true,
  'Global default rules - Cannot be deleted, only modified'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Insert example category-specific rules
-- ============================================================================

-- Example: Electronics category (stricter margins)
INSERT INTO odl_rules (
  scope,
  category_name,
  subcategory_name,
  rule_name,
  description,
  deal_min_eco_vs_msrp_percent,
  deal_min_eco_vs_street_price_percent,
  target_gross_margin_percent,
  minimum_gross_margin_percent,
  maximum_gross_margin_percent,
  currency_safety_coefficient,
  payment_processing_fee_percent,
  payment_processing_fee_fixed_chf,
  max_price_modifications_per_item,
  price_modification_time_window_minutes,
  priority,
  is_active,
  notes
) VALUES (
  'category',
  'Electronics',
  NULL,
  'Electronics Category Rules',
  'Specific rules for Electronics - Higher margins required due to warranty costs and support',
  35,    -- Min 35% saving vs MSRP (higher)
  18,    -- Min 18% saving vs Street Price (higher)
  35,    -- Target 35% gross margin (higher)
  25,    -- Minimum 25% gross margin (higher)
  50,    -- Maximum 50% gross margin
  1.03,  -- 3% currency safety coefficient (higher for volatile electronics)
  2.9,   -- Stripe fee 2.9%
  0.30,  -- Stripe fixed fee 0.30 CHF
  3,     -- Max 3 price modifications per item
  15,    -- Within 15 minutes window
  10,    -- Lower priority than global
  false, -- Disabled by default - example only
  'Example: Electronics typically have higher competition and require better margins'
) ON CONFLICT DO NOTHING;

-- Verification
DO $$
DECLARE
  v_rules_count INT;
  v_global_count INT;
BEGIN
  SELECT COUNT(*) INTO v_rules_count FROM odl_rules;
  SELECT COUNT(*) INTO v_global_count FROM odl_rules WHERE scope = 'global' AND is_active = true;

  IF v_global_count = 1 THEN
    RAISE NOTICE '✓ ODL Rules created successfully (total: %, active global: %)', v_rules_count, v_global_count;
  ELSE
    RAISE EXCEPTION '✗ Expected 1 active global rule, got %', v_global_count;
  END IF;
END $$;

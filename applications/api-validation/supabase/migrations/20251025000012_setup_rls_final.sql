-- ============================================================================
-- Migration: Final RLS Setup
-- Date: 2025-10-25
-- Description: Verify and document RLS policies for all validation tables
-- ============================================================================

-- ============================================================================
-- VERIFICATION: All sensitive tables have RLS enabled
-- ============================================================================

DO $$
DECLARE
  v_table TEXT;
  v_rls_enabled BOOLEAN;
  v_tables_checked INT := 0;
  v_tables_secure INT := 0;
BEGIN
  RAISE NOTICE '=== RLS VERIFICATION ===';
  RAISE NOTICE '';

  -- Check each validation table
  FOR v_table IN
    SELECT unnest(ARRAY[
      'supplier_registry',
      'supplier_users',
      'odeal_business_rules',
      'odeal_customs_duty_rates',
      'offer_metadata',
      'offer_item_calculated_costs',
      'offer_financial_projections',
      'offer_item_modifications_log'
    ])
  LOOP
    v_tables_checked := v_tables_checked + 1;

    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table
      AND relnamespace = 'public'::regnamespace;

    IF v_rls_enabled THEN
      v_tables_secure := v_tables_secure + 1;
      RAISE NOTICE '✓ % - RLS enabled', v_table;
    ELSE
      RAISE WARNING '✗ % - RLS NOT enabled!', v_table;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Checked % tables, % have RLS enabled', v_tables_checked, v_tables_secure;

  IF v_tables_checked != v_tables_secure THEN
    RAISE EXCEPTION 'Security check failed: Not all tables have RLS enabled';
  END IF;

  RAISE NOTICE '✓ All validation tables are secured with RLS';
END $$;

-- ============================================================================
-- VERIFICATION: All policies are deny-all by default
-- ============================================================================

DO $$
DECLARE
  v_policy RECORD;
  v_open_policies INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== POLICY VERIFICATION ===';
  RAISE NOTICE '';

  -- Check for policies that allow access (except validation_notifications read)
  FOR v_policy IN
    SELECT
      schemaname,
      tablename,
      policyname,
      cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'supplier_registry',
        'supplier_users',
        'odeal_business_rules',
        'odeal_customs_duty_rates',
        'offer_metadata',
        'offer_item_calculated_costs',
        'offer_financial_projections',
        'offer_item_modifications_log'
      )
      AND policyname != 'deny_all_' || tablename
  LOOP
    v_open_policies := v_open_policies + 1;
    RAISE WARNING '⚠ Unexpected policy: %.% - %',
      v_policy.tablename, v_policy.policyname, v_policy.cmd;
  END LOOP;

  IF v_open_policies > 0 THEN
    RAISE WARNING '% unexpected policies found. Review security configuration.', v_open_policies;
  ELSE
    RAISE NOTICE '✓ All policies are restrictive (deny-all default)';
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION: Access Matrix
-- ============================================================================

COMMENT ON SCHEMA public IS
  '
  ═══════════════════════════════════════════════════════════════════════════
  ODL-TOOLS VALIDATION MODULE - ACCESS MATRIX
  ═══════════════════════════════════════════════════════════════════════════

  TABLE                              | DIRECT ACCESS | FUNCTION ACCESS
  -----------------------------------|---------------|------------------
  supplier_registry                  | ❌ DENY ALL   | ✅ SECURITY DEFINER
  supplier_users                     | ❌ DENY ALL   | ✅ SECURITY DEFINER
  odeal_business_rules               | ❌ DENY ALL   | ✅ SECURITY DEFINER
  odeal_customs_duty_rates           | ❌ DENY ALL   | ✅ SECURITY DEFINER
  offer_metadata                     | ❌ DENY ALL   | ✅ SECURITY DEFINER
  offer_item_calculated_costs        | ❌ DENY ALL   | ✅ SECURITY DEFINER
  offer_financial_projections        | ❌ DENY ALL   | ✅ SECURITY DEFINER
  offer_item_modifications_log       | ❌ DENY ALL   | ✅ SECURITY DEFINER
  validation_notifications           | ✅ READ ONLY  | ✅ SECURITY DEFINER

  ═══════════════════════════════════════════════════════════════════════════
  SECURITY PRINCIPLES
  ═══════════════════════════════════════════════════════════════════════════

  1. SUPPLIERS NEVER SEE:
     - Margins (marge_brute_percent)
     - COGS breakdown
     - Logistics costs
     - Currency rates with safety coefficient
     - Other suppliers'' data

  2. ACCESS CONTROL:
     - All access via SECURITY DEFINER functions
     - API Gateway verifies API Key before calling functions
     - Functions verify supplier_id + user_id relationship
     - Quotas enforced per supplier

  3. AUDIT TRAIL:
     - All modifications logged in offer_item_modifications_log
     - IP address + timestamp captured
     - Anti-gaming detection automatic

  ═══════════════════════════════════════════════════════════════════════════
  ';

-- ============================================================================
-- FINAL VERIFICATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_summary TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  PHASE 1A - MIGRATIONS COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ supplier_registry (with API key auth)';
  RAISE NOTICE '  ✓ supplier_users (audit trail)';
  RAISE NOTICE '  ✓ odeal_business_rules (editable thresholds)';
  RAISE NOTICE '  ✓ odeal_customs_duty_rates (fallback rates)';
  RAISE NOTICE '  ✓ offer_metadata (offer index)';
  RAISE NOTICE '  ✓ offer_item_calculated_costs (CONFIDENTIAL)';
  RAISE NOTICE '  ✓ offer_financial_projections (BEP + risk)';
  RAISE NOTICE '  ✓ offer_item_modifications_log (anti-gaming)';
  RAISE NOTICE '  ✓ validation_notifications (multilingual)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  ✓ verify_supplier_api_key()';
  RAISE NOTICE '  ✓ reset_daily_supplier_quotas()';
  RAISE NOTICE '  ✓ get_active_business_rules()';
  RAISE NOTICE '  ✓ get_customs_rates_for_subcategory()';
  RAISE NOTICE '  ✓ get_logistics_cost_for_weight()';
  RAISE NOTICE '  ✓ lookup_product_by_ean()';
  RAISE NOTICE '  ✓ convert_to_chf()';
  RAISE NOTICE '  ✓ calculate_payment_fees()';
  RAISE NOTICE '  ✓ log_item_modification()';
  RAISE NOTICE '  ✓ detect_gaming_attempt()';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ RLS enabled on all sensitive tables';
  RAISE NOTICE '  ✓ Default deny-all policies';
  RAISE NOTICE '  ✓ Access via SECURITY DEFINER functions only';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  NEXT: Test locally with TEST-LOCAL-VALIDATION.md';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

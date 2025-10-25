-- ============================================================================
-- SETUP PRODUCTION TEST DATA (temporary migration)
-- ============================================================================

-- 1. Create test supplier (only if not exists)
-- API Key: odl_sup_prod_test_xyz789
-- Hash (SHA256): 7597f3fe5c6aaf7b35701b37fe3d5bb60d7bf28673d5b430337629df61b85beb

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM supplier_registry WHERE api_key_prefix = 'odl_sup_prod') THEN
    INSERT INTO supplier_registry (
      supplier_id,
      company_name,
      api_key_hash,
      api_key_prefix,
      validation_status,
      is_active,
      max_daily_validations
    )
    VALUES (
      gen_random_uuid(),
      'Test Company SA - PRODUCTION',
      '7597f3fe5c6aaf7b35701b37fe3d5bb60d7bf28673d5b430337629df61b85beb',
      'odl_sup_prod',
      'approved',
      true,
      1000
    );
  ELSE
    UPDATE supplier_registry
    SET
      api_key_hash = '7597f3fe5c6aaf7b35701b37fe3d5bb60d7bf28673d5b430337629df61b85beb',
      updated_at = NOW()
    WHERE api_key_prefix = 'odl_sup_prod';
  END IF;
END $$;

-- 2. Insert currency rates (delete old, insert new for today)
DELETE FROM currency_change WHERE date = CURRENT_DATE;

INSERT INTO currency_change (date, base, quote, rate, fetched_at)
VALUES
  (CURRENT_DATE, 'EUR', 'CHF', 0.9248, NOW()),
  (CURRENT_DATE, 'USD', 'CHF', 0.7964, NOW()),
  (CURRENT_DATE, 'GBP', 'CHF', 1.0598, NOW());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_supplier_count INT;
  v_currency_count INT;
BEGIN
  SELECT COUNT(*) INTO v_supplier_count FROM supplier_registry WHERE api_key_prefix = 'odl_sup_prod';
  SELECT COUNT(*) INTO v_currency_count FROM currency_change WHERE date = CURRENT_DATE;

  RAISE NOTICE '✓ Test supplier created: % record(s)', v_supplier_count;
  RAISE NOTICE '✓ Currency rates inserted: % rate(s) for today', v_currency_count;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  PRODUCTION TEST DATA READY';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Test API Key: odl_sup_prod_test_xyz789';
  RAISE NOTICE 'Test Endpoint: https://xewnzetqvrovqjcvwkus.supabase.co';
  RAISE NOTICE '';
END $$;

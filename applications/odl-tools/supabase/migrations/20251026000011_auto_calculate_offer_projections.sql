-- ============================================================================
-- Migration: Auto-calculate offer financial projections
-- Date: 2025-10-26
-- Description: Trigger to automatically populate offer_financial_projections
--              after each item validation
-- ============================================================================

-- ============================================================================
-- FUNCTION: Recalculate offer projections from all validated items
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_offer_projections(p_offer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supplier_id UUID;

  -- Aggregations
  v_total_items_count INT;
  v_total_items_publishable INT;
  v_total_units_available INT;

  v_ca_max_ht NUMERIC;
  v_marge_brute_total_ht NUMERIC;
  v_marge_brute_avg_percent NUMERIC;

  -- BEP calculation
  v_fixed_costs_ht NUMERIC := 95;  -- Default PESA fee
  v_bep_ca_ht NUMERIC;
  v_bep_units INT;
  v_bep_sellthrough_percent NUMERIC;

  -- Risk assessment
  v_risk_score TEXT;
  v_risk_factors JSONB := '[]'::JSONB;
  v_alerts TEXT[] := ARRAY[]::TEXT[];
  v_bad_deals_count INT;
  v_almost_deals_count INT;

  -- Scenarios
  v_scenario_pessimistic_ca_ht NUMERIC;
  v_scenario_realistic_ca_ht NUMERIC;
  v_scenario_optimistic_ca_ht NUMERIC;

BEGIN

  -- ============================================================================
  -- STEP 1: Aggregate data from offer_item_calculated_costs
  -- ============================================================================

  SELECT
    supplier_id,
    COUNT(*) as items_count,
    COUNT(*) FILTER (WHERE is_valid = true) as publishable_count,
    COALESCE(SUM(quantity), 0) as units_available,

    -- Revenue potential (promo_price * quantity for all items)
    COALESCE(SUM(promo_price * quantity), 0) as ca_max,

    -- Total gross margin (sum of marge_brute_ht * quantity)
    COALESCE(SUM(marge_brute_ht * quantity), 0) as marge_total,

    -- Average margin (weighted by revenue)
    CASE
      WHEN SUM(promo_price * quantity) > 0
      THEN (SUM(marge_brute_ht * quantity) / SUM(promo_price * quantity)) * 100
      ELSE 0
    END as marge_avg,

    -- Risk factors
    COUNT(*) FILTER (WHERE deal_status = 'bad') as bad_count,
    COUNT(*) FILTER (WHERE deal_status = 'almost') as almost_count

  INTO
    v_supplier_id,
    v_total_items_count,
    v_total_items_publishable,
    v_total_units_available,
    v_ca_max_ht,
    v_marge_brute_total_ht,
    v_marge_brute_avg_percent,
    v_bad_deals_count,
    v_almost_deals_count

  FROM offer_item_calculated_costs
  WHERE offer_id = p_offer_id
  GROUP BY supplier_id;

  -- If no items found, delete projection and exit
  IF v_total_items_count IS NULL OR v_total_items_count = 0 THEN
    DELETE FROM offer_financial_projections WHERE offer_id = p_offer_id;
    RETURN;
  END IF;

  -- ============================================================================
  -- STEP 2: Calculate Break-Even Point (BEP)
  -- ============================================================================

  -- BEP Revenue = Fixed Costs / Avg Margin %
  IF v_marge_brute_avg_percent > 0 THEN
    v_bep_ca_ht := v_fixed_costs_ht / (v_marge_brute_avg_percent / 100);
  ELSE
    v_bep_ca_ht := v_ca_max_ht * 10;  -- If no margin, BEP is unreachable
  END IF;

  -- BEP Units = (BEP Revenue / Max Revenue) * Total Units
  IF v_ca_max_ht > 0 THEN
    v_bep_units := CEIL((v_bep_ca_ht / v_ca_max_ht) * v_total_units_available);
    v_bep_sellthrough_percent := (v_bep_ca_ht / v_ca_max_ht) * 100;
  ELSE
    v_bep_units := v_total_units_available;
    v_bep_sellthrough_percent := 100;
  END IF;

  -- ============================================================================
  -- STEP 3: Calculate Risk Score (A/B/C/D)
  -- ============================================================================

  -- Risk based on BEP sellthrough percentage
  IF v_bep_sellthrough_percent <= 10 THEN
    v_risk_score := 'A';  -- Very low risk
  ELSIF v_bep_sellthrough_percent <= 25 THEN
    v_risk_score := 'B';  -- Low risk
  ELSIF v_bep_sellthrough_percent <= 50 THEN
    v_risk_score := 'C';  -- Moderate risk
  ELSE
    v_risk_score := 'D';  -- High risk
  END IF;

  -- Add risk factors
  IF v_bad_deals_count > 0 THEN
    v_risk_factors := v_risk_factors || jsonb_build_object(
      'factor', 'bad_deals',
      'count', v_bad_deals_count,
      'severity', 'critical'
    );
    v_alerts := v_alerts || ARRAY[format('%s bad deals detected', v_bad_deals_count)];
  END IF;

  IF v_almost_deals_count > v_total_items_count / 2 THEN
    v_risk_factors := v_risk_factors || jsonb_build_object(
      'factor', 'many_marginal_deals',
      'count', v_almost_deals_count,
      'severity', 'warning'
    );
    v_alerts := v_alerts || ARRAY['Over 50% of items are marginal deals'];
  END IF;

  IF v_marge_brute_avg_percent < 20 THEN
    v_risk_factors := v_risk_factors || jsonb_build_object(
      'factor', 'low_average_margin',
      'margin', v_marge_brute_avg_percent,
      'severity', 'warning'
    );
    v_alerts := v_alerts || ARRAY[format('Low average margin: %s%%', ROUND(v_marge_brute_avg_percent, 1))];
  END IF;

  -- ============================================================================
  -- STEP 4: Calculate Scenarios (25%, 50%, 75% sellthrough)
  -- ============================================================================

  v_scenario_pessimistic_ca_ht := v_ca_max_ht * 0.25;
  v_scenario_realistic_ca_ht := v_ca_max_ht * 0.50;
  v_scenario_optimistic_ca_ht := v_ca_max_ht * 0.75;

  -- ============================================================================
  -- STEP 5: UPSERT into offer_financial_projections
  -- ============================================================================

  INSERT INTO offer_financial_projections (
    offer_id,
    supplier_id,
    total_items_count,
    total_items_publishable,
    total_units_available,
    ca_max_ht,
    marge_brute_total_ht,
    marge_brute_avg_percent,
    fixed_costs_ht,
    bep_ca_ht,
    bep_units,
    bep_sellthrough_percent,
    risk_score,
    risk_factors,
    alerts,
    scenario_pessimistic_ca_ht,
    scenario_realistic_ca_ht,
    scenario_optimistic_ca_ht
  ) VALUES (
    p_offer_id,
    v_supplier_id,
    v_total_items_count,
    v_total_items_publishable,
    v_total_units_available,
    v_ca_max_ht,
    v_marge_brute_total_ht,
    v_marge_brute_avg_percent,
    v_fixed_costs_ht,
    v_bep_ca_ht,
    v_bep_units,
    v_bep_sellthrough_percent,
    v_risk_score,
    v_risk_factors,
    v_alerts,
    v_scenario_pessimistic_ca_ht,
    v_scenario_realistic_ca_ht,
    v_scenario_optimistic_ca_ht
  )
  ON CONFLICT (offer_id)
  DO UPDATE SET
    supplier_id = EXCLUDED.supplier_id,
    total_items_count = EXCLUDED.total_items_count,
    total_items_publishable = EXCLUDED.total_items_publishable,
    total_units_available = EXCLUDED.total_units_available,
    ca_max_ht = EXCLUDED.ca_max_ht,
    marge_brute_total_ht = EXCLUDED.marge_brute_total_ht,
    marge_brute_avg_percent = EXCLUDED.marge_brute_avg_percent,
    fixed_costs_ht = EXCLUDED.fixed_costs_ht,
    bep_ca_ht = EXCLUDED.bep_ca_ht,
    bep_units = EXCLUDED.bep_units,
    bep_sellthrough_percent = EXCLUDED.bep_sellthrough_percent,
    risk_score = EXCLUDED.risk_score,
    risk_factors = EXCLUDED.risk_factors,
    alerts = EXCLUDED.alerts,
    scenario_pessimistic_ca_ht = EXCLUDED.scenario_pessimistic_ca_ht,
    scenario_realistic_ca_ht = EXCLUDED.scenario_realistic_ca_ht,
    scenario_optimistic_ca_ht = EXCLUDED.scenario_optimistic_ca_ht,
    calculated_at = NOW(),
    expires_at = NOW() + INTERVAL '7 days';

END;
$$;

COMMENT ON FUNCTION recalculate_offer_projections IS 'Recalculates offer financial projections by aggregating all items for given offer_id';

-- ============================================================================
-- TRIGGER: Auto-recalculate after item validation
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_offer_projections()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate for the NEW offer_id
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM recalculate_offer_projections(NEW.offer_id);
    RETURN NEW;
  END IF;

  -- On DELETE, recalculate for the OLD offer_id
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_offer_projections(OLD.offer_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS auto_recalculate_offer_projections ON offer_item_calculated_costs;

CREATE TRIGGER auto_recalculate_offer_projections
AFTER INSERT OR UPDATE OR DELETE ON offer_item_calculated_costs
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_offer_projections();

COMMENT ON TRIGGER auto_recalculate_offer_projections ON offer_item_calculated_costs IS 'Automatically recalculates offer financial projections after any item validation';

-- ============================================================================
-- BACKFILL: Recalculate projections for existing offers
-- ============================================================================

DO $$
DECLARE
  v_offer_id UUID;
BEGIN
  -- Recalculate for all existing offers
  FOR v_offer_id IN
    SELECT DISTINCT offer_id FROM offer_item_calculated_costs
  LOOP
    PERFORM recalculate_offer_projections(v_offer_id);
  END LOOP;

  RAISE NOTICE '✓ Recalculated projections for all existing offers';
END $$;

DO $$
BEGIN
  RAISE NOTICE '✓ Auto-calculation of offer_financial_projections enabled';
  RAISE NOTICE '  - Trigger: auto_recalculate_offer_projections';
  RAISE NOTICE '  - Function: recalculate_offer_projections(offer_id)';
  RAISE NOTICE '  - Updates after: INSERT, UPDATE, DELETE on offer_item_calculated_costs';
END $$;

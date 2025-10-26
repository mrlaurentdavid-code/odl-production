-- Migration: Smart Schema Alignment
-- Date: 2025-10-26
-- Purpose: Intelligently align table schema with function expectations,
--          detecting current state and only applying necessary changes

-- Function to check if column exists
CREATE OR REPLACE FUNCTION column_exists(p_table_name text, p_column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = p_column_name
    );
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Step 1: Rename purchase_price_ht to purchase_price_original if it exists
    IF column_exists('offer_item_calculated_costs', 'purchase_price_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            RENAME COLUMN purchase_price_ht TO purchase_price_original;
        RAISE NOTICE 'Renamed purchase_price_ht to purchase_price_original';
    END IF;

    -- Step 2: Add purchase_price_chf_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'purchase_price_chf_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN purchase_price_chf_ht NUMERIC;
        RAISE NOTICE 'Added purchase_price_chf_ht';
    END IF;

    -- Step 3: Add transport_cost_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'transport_cost_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN transport_cost_ht NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added transport_cost_ht';
    END IF;

    -- Step 4: Add logistics_cost_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'logistics_cost_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN logistics_cost_ht NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added logistics_cost_ht';
    END IF;

    -- Step 5: Add customs_value_chf if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'customs_value_chf') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN customs_value_chf NUMERIC;
        RAISE NOTICE 'Added customs_value_chf';
    END IF;

    -- Step 6: Add customs_duty_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'customs_duty_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN customs_duty_ht NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added customs_duty_ht';
    END IF;

    -- Step 7: Add customs_clearance_fee_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'customs_clearance_fee_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN customs_clearance_fee_ht NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added customs_clearance_fee_ht';
    END IF;

    -- Step 8: Add pesa_fee_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'pesa_fee_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN pesa_fee_ht NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added pesa_fee_ht';
    END IF;

    -- Step 9: Add tar_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'tar_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN tar_ht NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added tar_ht';
    END IF;

    -- Step 10: Add cogs_total_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'cogs_total_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN cogs_total_ht NUMERIC;
        RAISE NOTICE 'Added cogs_total_ht';
    END IF;

    -- Step 11: Add marge_brute_ht if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'marge_brute_ht') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN marge_brute_ht NUMERIC;
        RAISE NOTICE 'Added marge_brute_ht';
    END IF;

    -- Step 12: Add marge_brute_percent if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'marge_brute_percent') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN marge_brute_percent NUMERIC;
        RAISE NOTICE 'Added marge_brute_percent';
    END IF;

    -- Step 13: Add shipping_origin if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'shipping_origin') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN shipping_origin TEXT;
        RAISE NOTICE 'Added shipping_origin';
    END IF;

    -- Step 14: Add contain_electronic if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'contain_electronic') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN contain_electronic BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added contain_electronic';
    END IF;

    -- Step 15: Add has_battery if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'has_battery') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN has_battery BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added has_battery';
    END IF;

    -- Step 16: Add battery_type if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'battery_type') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN battery_type TEXT;
        RAISE NOTICE 'Added battery_type';
    END IF;

    -- Step 17: Add length_cm if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'length_cm') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN length_cm NUMERIC;
        RAISE NOTICE 'Added length_cm';
    END IF;

    -- Step 18: Add width_cm if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'width_cm') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN width_cm NUMERIC;
        RAISE NOTICE 'Added width_cm';
    END IF;

    -- Step 19: Add height_cm if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'height_cm') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN height_cm NUMERIC;
        RAISE NOTICE 'Added height_cm';
    END IF;

    -- Step 20: Add variant_id if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'variant_id') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN variant_id TEXT;
        RAISE NOTICE 'Added variant_id';
    END IF;

    -- Step 21: Add user_id if not exists
    IF NOT column_exists('offer_item_calculated_costs', 'user_id') THEN
        ALTER TABLE offer_item_calculated_costs
            ADD COLUMN user_id UUID;
        RAISE NOTICE 'Added user_id';
    END IF;

    -- Step 22: Convert category_id and subcategory_id to TEXT if they are UUID
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'offer_item_calculated_costs'
          AND column_name = 'category_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE offer_item_calculated_costs
            ALTER COLUMN category_id TYPE TEXT USING category_id::TEXT;
        RAISE NOTICE 'Converted category_id to TEXT';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'offer_item_calculated_costs'
          AND column_name = 'subcategory_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE offer_item_calculated_costs
            ALTER COLUMN subcategory_id TYPE TEXT USING subcategory_id::TEXT;
        RAISE NOTICE 'Converted subcategory_id to TEXT';
    END IF;

END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS column_exists(text, text);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Smart schema alignment completed';
END $$;

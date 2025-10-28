-- Migration: Fix Subcategory Type Mismatch
-- Date: 2025-10-27
-- Purpose: Change subcategory_id from UUID to TEXT to match odl_product_subcategories
--
-- Problem: offer_item_calculated_costs.subcategory_id is UUID
--          but odl_product_subcategories.subcategory_id is TEXT ("s22")
-- Solution: Alter column type to TEXT

ALTER TABLE offer_item_calculated_costs
  ALTER COLUMN subcategory_id TYPE TEXT USING subcategory_id::TEXT;

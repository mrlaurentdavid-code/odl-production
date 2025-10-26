-- Migration: Add category_name and subcategory_name columns
-- Date: 2025-10-26
-- Purpose: Store display names alongside IDs for better UX

-- Add missing name columns to offer_item_calculated_costs
ALTER TABLE offer_item_calculated_costs
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS subcategory_name TEXT;

-- Add comments to clarify purpose
COMMENT ON COLUMN offer_item_calculated_costs.category_id IS 'Category ID for relationships (multilingual-friendly)';
COMMENT ON COLUMN offer_item_calculated_costs.category_name IS 'Category name for display purposes';
COMMENT ON COLUMN offer_item_calculated_costs.subcategory_id IS 'Subcategory ID for relationships (multilingual-friendly)';
COMMENT ON COLUMN offer_item_calculated_costs.subcategory_name IS 'Subcategory name for display purposes';

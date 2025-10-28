-- Migration: Fix Demo API Key Hash
-- Date: 2025-10-26
-- Purpose: Correct the SHA256 hash for odl_sup_ohmex_demo_2025

UPDATE supplier_registry
SET api_key_hash = '7e27995614d9f2d1753c7157f551d8f6ce7eba4f57be9affc5788d295ec74058'
WHERE supplier_id = 'd16fca88-a978-4c0b-b10c-ca54e229495a';

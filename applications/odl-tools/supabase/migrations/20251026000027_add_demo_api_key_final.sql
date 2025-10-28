-- Migration: Add Demo API Key (Final)
-- Date: 2025-10-26
-- Purpose: Add demo API key odl_sup_ohmex_demo_2025 for testing TAR integration

-- Step 1: Insert supplier if not exists
INSERT INTO supplier_registry (
    supplier_id,
    company_name,
    api_key_hash,
    api_key_prefix,
    validation_status,
    is_active
)
VALUES (
    'd16fca88-a978-4c0b-b10c-ca54e229495a',
    'Ohmex Electronics (DEMO)',
    '7e27995614d9f2d1753c7157f551d8f6ce7eba4f57be9affc5788d295ec74058',  -- SHA256 of 'odl_sup_ohmex_demo_2025'
    'odl_sup_ohme',
    'approved',
    true
)
ON CONFLICT (supplier_id) DO UPDATE SET
    api_key_hash = EXCLUDED.api_key_hash,
    company_name = EXCLUDED.company_name,
    is_active = EXCLUDED.is_active;

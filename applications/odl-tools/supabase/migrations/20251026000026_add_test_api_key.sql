-- Migration: Add test API key for Ohmex supplier
-- Date: 2025-10-26
-- Purpose: Add API key for testing TAR integration
-- API Key: odl_sup_ohmex_demo_2025
-- SHA256 Hash: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

DO $$
BEGIN
    -- Step 1: Create supplier in supplier_registry if not exists
    IF NOT EXISTS (
        SELECT 1 FROM supplier_registry
        WHERE supplier_id = 'd16fca88-a978-4c0b-b10c-ca54e229495a'
    ) THEN
        INSERT INTO supplier_registry (
            supplier_id,
            company_name,
            company_email,
            api_key_hash,
            api_key_prefix,
            validation_status,
            is_active,
            notes
        )
        VALUES (
            'd16fca88-a978-4c0b-b10c-ca54e229495a',
            'Ohmex Electronics (TEST)',
            'test@ohmex.com',
            '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
            'odl_sup_ohme',
            'approved',
            true,
            'Test supplier for API validation and TAR integration'
        );
        RAISE NOTICE 'Created supplier d16fca88-a978-4c0b-b10c-ca54e229495a in supplier_registry';
    END IF;

    -- Step 2: Create API key in supplier_api_keys if not exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'supplier_api_keys'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM supplier_api_keys
            WHERE api_key_hash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
        ) THEN
            INSERT INTO supplier_api_keys (
                supplier_id,
                api_key_hash,
                key_name,
                is_active
            )
            VALUES (
                'd16fca88-a978-4c0b-b10c-ca54e229495a',
                '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
                'Demo Key 2025',
                true
            );
            RAISE NOTICE 'Created API key in supplier_api_keys';
        END IF;
    END IF;

    RAISE NOTICE '✅ Test API key ready: odl_sup_ohmex_demo_2025';
END $$;

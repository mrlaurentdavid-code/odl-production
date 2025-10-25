-- ============================================
-- LOGISTICS CALCULATOR - SEED DATA
-- Date: 23 Octobre 2025
-- Description: Données initiales pour le calculateur logistique
-- ============================================

-- ============================================
-- 1. LOGISTICS PROVIDERS
-- ============================================

INSERT INTO public.logistics_providers (provider_id, provider_name, is_active)
VALUES ('ohmex', 'Ohmex SA', true)
ON CONFLICT (provider_id) DO NOTHING;

-- ============================================
-- 2. CUSTOMS PROVIDERS
-- ============================================

INSERT INTO public.customs_providers (provider_id, provider_name, is_active)
VALUES ('pesa', 'PESA Global', true)
ON CONFLICT (provider_id) DO NOTHING;

-- ============================================
-- 3. CUSTOMS FEES
-- ============================================

INSERT INTO public.customs_fees (provider_id, fee_type, value, description, is_active)
VALUES
    ('pesa', 'admin_base', 80.00, 'Frais administratifs de base par envoi (Formalités 70 + E.dec 10)', true),
    ('pesa', 'position_supp', 8.00, 'Coût par position douanière supplémentaire (dès la 3ème)', true),
    ('pesa', 'gestion_droits_taux', 0.035, 'Taux de gestion sur les droits de douane (3.5%)', true),
    ('pesa', 'gestion_droits_min', 5.00, 'Minimum de perception pour la gestion des droits de douane (CHF)', true),
    ('pesa', 'gestion_tva_taux', 0.025, 'Taux de gestion sur la TVA d''import (2.5%)', true),
    ('pesa', 'gestion_tva_min', 5.00, 'Minimum de perception pour la gestion de la TVA (CHF)', true);

-- ============================================
-- 4. LOGISTICS RATES
-- ============================================

INSERT INTO public.logistics_rates (
    provider_id, format_label, carrier, mode,
    length_cm, width_cm, height_cm, weight_max_kg,
    price_transport, price_reception, price_prep,
    is_default, is_active
)
VALUES
    ('ohmex', '60x60x100 cm - Sans signature', 'Planzer', 'Sans signature', 60, 60, 100, NULL, 8.50, 0.50, 2.50, true, true),
    ('ohmex', '60x60x100 cm - Avec signature', 'Planzer', 'Avec signature', 60, 60, 100, NULL, 9.50, 0.50, 2.50, false, true),
    ('ohmex', 'B5 - 2 cm - Sans signature', 'La Poste', 'Sans signature', 25, 17.6, 2, 0.5, 3.00, 0.50, 2.50, false, true),
    ('ohmex', 'B5 - 2 cm - Avec suivi', 'La Poste', 'Avec suivi', 25, 17.6, 2, 0.5, 4.50, 0.50, 2.50, false, true),
    ('ohmex', 'B5 - 5 cm - Sans signature', 'La Poste', 'Sans signature', 25, 17.6, 5, 0.5, 5.00, 0.50, 2.50, false, true),
    ('ohmex', 'B5 - 5 cm - Avec suivi', 'La Poste', 'Avec suivi', 25, 17.6, 5, 0.5, 6.50, 0.50, 2.50, false, true)
ON CONFLICT (provider_id, format_label, carrier, mode) DO NOTHING;

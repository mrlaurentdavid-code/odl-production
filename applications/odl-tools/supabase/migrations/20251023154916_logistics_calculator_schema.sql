-- ============================================
-- LOGISTICS CALCULATOR - SCHEMA COMPLET
-- Date: 23 Octobre 2025
-- Description: Tables pour le calculateur de frais logistiques et douaniers
-- ============================================

-- ============================================
-- 1. LOGISTICS PROVIDERS (Prestataires logistiques)
-- ============================================

CREATE TABLE IF NOT EXISTS public.logistics_providers (
    provider_id TEXT PRIMARY KEY NOT NULL,
    provider_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.logistics_providers IS 'Liste des prestataires logistiques (Ohmex, Planzer, La Poste, etc.)';

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.handle_logistics_providers_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_logistics_providers_update
BEFORE UPDATE ON public.logistics_providers
FOR EACH ROW EXECUTE PROCEDURE public.handle_logistics_providers_update();

-- ============================================
-- 2. CUSTOMS PROVIDERS (Prestataires douane)
-- ============================================

CREATE TABLE IF NOT EXISTS public.customs_providers (
    provider_id TEXT PRIMARY KEY NOT NULL,
    provider_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customs_providers IS 'Liste des prestataires de services douaniers (PESA, etc.)';

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.handle_customs_providers_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_customs_providers_update
BEFORE UPDATE ON public.customs_providers
FOR EACH ROW EXECUTE PROCEDURE public.handle_customs_providers_update();

-- ============================================
-- 3. CUSTOMS FEES (Frais douaniers)
-- ============================================

CREATE TABLE IF NOT EXISTS public.customs_fees (
    fee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL REFERENCES public.customs_providers(provider_id) ON DELETE RESTRICT,
    fee_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customs_fees IS 'Grille tarifaire des frais douaniers par prestataire';
COMMENT ON COLUMN public.customs_fees.fee_type IS 'Type: admin_base, position_supp, gestion_droits_taux, gestion_droits_min, gestion_tva_taux, gestion_tva_min';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_customs_fees_provider ON public.customs_fees(provider_id);
CREATE INDEX IF NOT EXISTS idx_customs_fees_active ON public.customs_fees(is_active) WHERE is_active = TRUE;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.handle_customs_fees_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_customs_fees_update
BEFORE UPDATE ON public.customs_fees
FOR EACH ROW EXECUTE PROCEDURE public.handle_customs_fees_update();

-- ============================================
-- 4. LOGISTICS RATES (Tarifs de transport)
-- ============================================

CREATE TABLE IF NOT EXISTS public.logistics_rates (
    rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL REFERENCES public.logistics_providers(provider_id) ON DELETE RESTRICT,

    -- Identification du format
    format_label TEXT NOT NULL,
    carrier TEXT NOT NULL,
    mode TEXT NOT NULL,

    -- Dimensions et poids
    length_cm NUMERIC NOT NULL,
    width_cm NUMERIC NOT NULL,
    height_cm NUMERIC NOT NULL,
    weight_max_kg NUMERIC,

    -- Tarifs HT
    price_transport NUMERIC NOT NULL,
    price_reception NUMERIC NOT NULL DEFAULT 0.50,
    price_prep NUMERIC NOT NULL DEFAULT 2.50,

    -- Métadonnées
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contrainte unique
    CONSTRAINT unique_rate_format UNIQUE (provider_id, format_label, carrier, mode)
);

COMMENT ON TABLE public.logistics_rates IS 'Grille tarifaire complète des formats de colis avec dimensions et prix';
COMMENT ON COLUMN public.logistics_rates.format_label IS 'Label du format (ex: "B5 - 2 cm - Sans signature")';
COMMENT ON COLUMN public.logistics_rates.carrier IS 'Transporteur: La Poste, Planzer, etc.';
COMMENT ON COLUMN public.logistics_rates.mode IS 'Mode: Sans signature, Avec suivi, Avec signature';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_logistics_rates_provider ON public.logistics_rates(provider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_rates_active ON public.logistics_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_logistics_rates_dimensions ON public.logistics_rates(length_cm, width_cm, height_cm);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.handle_logistics_rates_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_logistics_rates_update
BEFORE UPDATE ON public.logistics_rates
FOR EACH ROW EXECUTE PROCEDURE public.handle_logistics_rates_update();

-- ============================================
-- 5. LOGISTICS CALCULATIONS CACHE (Optionnel)
-- ============================================

CREATE TABLE IF NOT EXISTS public.logistics_calculations (
    calculation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Input
    length_cm NUMERIC NOT NULL,
    width_cm NUMERIC NOT NULL,
    height_cm NUMERIC NOT NULL,
    weight_kg NUMERIC NOT NULL,
    is_imported BOOLEAN NOT NULL DEFAULT FALSE,
    nb_customs_positions INT,
    merchandise_value NUMERIC,

    -- Output
    rate_id UUID REFERENCES public.logistics_rates(rate_id),
    transport_cost NUMERIC NOT NULL,
    customs_cost NUMERIC NOT NULL DEFAULT 0,
    total_ht NUMERIC NOT NULL,
    total_ttc NUMERIC NOT NULL,

    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.logistics_calculations IS 'Historique des calculs de frais logistiques (optionnel)';

CREATE INDEX IF NOT EXISTS idx_logistics_calculations_date ON public.logistics_calculations(created_at DESC);

-- ============================================
-- 6. FONCTION DE CALCUL LOGISTIQUE
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_logistics_cost(
    p_length_cm NUMERIC,
    p_width_cm NUMERIC,
    p_height_cm NUMERIC,
    p_weight_kg NUMERIC,
    p_carrier TEXT DEFAULT NULL,
    p_mode TEXT DEFAULT NULL,
    p_is_imported BOOLEAN DEFAULT FALSE,
    p_nb_customs_positions INT DEFAULT 1,
    p_merchandise_value NUMERIC DEFAULT 0,
    p_provider_id TEXT DEFAULT 'ohmex'
)
RETURNS JSON AS $$
DECLARE
    v_rate RECORD;
    v_transport_cost NUMERIC;
    v_customs_cost NUMERIC := 0;
    v_customs_admin NUMERIC := 0;
    v_customs_positions NUMERIC := 0;
    v_customs_droits NUMERIC := 0;
    v_customs_tva NUMERIC := 0;
    v_margin_security NUMERIC;
    v_total_ht NUMERIC;
    v_total_ttc NUMERIC;
    v_tva_rate NUMERIC := 0.081;
BEGIN
    -- 1. Trouver le tarif correspondant
    SELECT * INTO v_rate
    FROM public.logistics_rates
    WHERE provider_id = p_provider_id
      AND is_active = TRUE
      AND p_length_cm <= length_cm
      AND p_width_cm <= width_cm
      AND p_height_cm <= height_cm
      AND (weight_max_kg IS NULL OR p_weight_kg <= weight_max_kg)
      AND (p_carrier IS NULL OR carrier = p_carrier)
      AND (p_mode IS NULL OR mode = p_mode)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- Si aucun tarif trouvé
    IF v_rate IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Aucun format de colis correspondant trouvé',
            'hint', format('Dimensions: %s×%s×%s cm, Poids: %s kg', p_length_cm, p_width_cm, p_height_cm, p_weight_kg)
        );
    END IF;

    -- 2. Calculer le coût de transport
    v_transport_cost := v_rate.price_transport + v_rate.price_reception + v_rate.price_prep;

    -- 3. Calculer les frais de douane si import
    IF p_is_imported THEN
        -- Frais admin de base
        SELECT value INTO v_customs_admin
        FROM public.customs_fees
        WHERE provider_id = 'pesa'
          AND fee_type = 'admin_base'
          AND is_active = TRUE;

        -- Positions supplémentaires (dès la 3ème)
        IF p_nb_customs_positions > 2 THEN
            SELECT value INTO v_customs_positions
            FROM public.customs_fees
            WHERE provider_id = 'pesa'
              AND fee_type = 'position_supp'
              AND is_active = TRUE;

            v_customs_positions := v_customs_positions * (p_nb_customs_positions - 2);
        ELSE
            v_customs_positions := 0;
        END IF;

        -- Gestion des droits de douane (3.5%, min CHF 5)
        DECLARE
            v_droits_taux NUMERIC;
            v_droits_min NUMERIC;
        BEGIN
            SELECT value INTO v_droits_taux
            FROM public.customs_fees
            WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_taux' AND is_active = TRUE;

            SELECT value INTO v_droits_min
            FROM public.customs_fees
            WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_min' AND is_active = TRUE;

            v_customs_droits := GREATEST(p_merchandise_value * v_droits_taux, v_droits_min);
        END;

        -- Gestion de la TVA (2.5%, min CHF 5)
        DECLARE
            v_tva_taux NUMERIC;
            v_tva_min NUMERIC;
        BEGIN
            SELECT value INTO v_tva_taux
            FROM public.customs_fees
            WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_taux' AND is_active = TRUE;

            SELECT value INTO v_tva_min
            FROM public.customs_fees
            WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_min' AND is_active = TRUE;

            v_customs_tva := GREATEST(p_merchandise_value * v_tva_taux, v_tva_min);
        END;

        -- Total douane
        v_customs_cost := v_customs_admin + v_customs_positions + v_customs_droits + v_customs_tva;
    END IF;

    -- 4. Marge de sécurité (10%)
    v_margin_security := (v_transport_cost + v_customs_cost) * 0.10;

    -- 5. Total HT
    v_total_ht := v_transport_cost + v_customs_cost + v_margin_security;

    -- 6. Total TTC
    v_total_ttc := v_total_ht * (1 + v_tva_rate);

    -- 7. Retourner le résultat
    RETURN json_build_object(
        'success', TRUE,
        'rate', json_build_object(
            'rate_id', v_rate.rate_id,
            'format_label', v_rate.format_label,
            'carrier', v_rate.carrier,
            'mode', v_rate.mode,
            'dimensions_cm', json_build_object(
                'length', v_rate.length_cm,
                'width', v_rate.width_cm,
                'height', v_rate.height_cm
            ),
            'weight_max_kg', v_rate.weight_max_kg
        ),
        'costs', json_build_object(
            'transport', json_build_object(
                'price_transport', v_rate.price_transport,
                'price_reception', v_rate.price_reception,
                'price_prep', v_rate.price_prep,
                'subtotal', v_transport_cost
            ),
            'customs', json_build_object(
                'admin_base', v_customs_admin,
                'positions_supp', v_customs_positions,
                'gestion_droits', v_customs_droits,
                'gestion_tva', v_customs_tva,
                'subtotal', v_customs_cost
            ),
            'margin_security', v_margin_security,
            'total_ht', v_total_ht,
            'tva_rate', v_tva_rate,
            'tva_amount', v_total_ttc - v_total_ht,
            'total_ttc', v_total_ttc
        )
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_logistics_cost IS 'Calcule les frais logistiques totaux (transport + douane + marges)';

-- Migration: Add orientation info to customer optimization
-- Description: Return which 3D orientation was chosen for each scenario
-- This matches the pallet calculation function behavior

CREATE OR REPLACE FUNCTION calculate_customer_transport_optimization(
    p_height_cm NUMERIC,  -- Dimension d'empilage (hauteur)
    p_length_cm NUMERIC,  -- Longueur de la base
    p_width_cm NUMERIC,   -- Largeur de la base
    p_weight_kg NUMERIC,  -- Poids unitaire du produit
    p_provider_id TEXT DEFAULT 'ohmex'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_quantity INT;
    v_container RECORD;
    v_scenarios JSON[] := ARRAY[]::JSON[];
    v_total_weight NUMERIC;
    v_best_container RECORD;
    v_best_cost NUMERIC;
    v_cost_base NUMERIC;
    v_cost_margin NUMERIC;
    v_cost_tva NUMERIC;
    v_cost_total NUMERIC;
    v_cost_unitaire NUMERIC;
    v_min_cost_unitaire NUMERIC := 999999;
    v_optimal_quantity INT;
    v_scenario_json JSON;
    v_fits_base BOOLEAN;
    v_products_per_layer INT;
    v_layers_needed INT;
    v_total_height_needed NUMERIC;
    v_max_layers INT;
    v_max_products INT;
    v_margin_rate NUMERIC := 0.10;
    v_tva_rate NUMERIC := 0.081;
    -- NEW: Track orientation used
    v_orientation_used INT := 1;
    v_base_length NUMERIC;
    v_base_width NUMERIC;
    v_stack_height NUMERIC;
BEGIN
    -- Boucle pour chaque quantité de 1 à 10
    FOR v_quantity IN 1..10 LOOP
        -- Étape 1: Calculer les besoins totaux
        v_total_weight := p_weight_kg * v_quantity;

        -- Étape 2: Trouver le meilleur contenant (coût le plus bas)
        v_best_container := NULL;
        v_best_cost := 999999;

        FOR v_container IN
            SELECT
                format_label,
                carrier,
                mode,
                length_cm,
                width_cm,
                height_cm,
                weight_max_kg,
                price_transport,
                price_reception,
                price_prep,
                (price_transport + price_reception + price_prep) as c_total
            FROM logistics_rates
            WHERE provider_id = p_provider_id
            ORDER BY (price_transport + price_reception + price_prep) ASC
        LOOP
            -- Condition Poids: Poids_Total <= weight_max_kg (ou NULL = illimité)
            IF v_container.weight_max_kg IS NOT NULL THEN
                IF v_total_weight > v_container.weight_max_kg THEN
                    CONTINUE;
                END IF;
            END IF;

            -- Tester toutes les orientations possibles du produit (3D)
            DECLARE
                v_orientation_capacity INT;
                v_orientation_per_layer INT;
                v_orientation_max_layers INT;
            BEGIN
                v_max_products := 0;

                -- Orientation 1: length×width en base, height empilé
                v_orientation_per_layer := GREATEST(
                    FLOOR(v_container.length_cm / p_length_cm) * FLOOR(v_container.width_cm / p_width_cm),
                    FLOOR(v_container.length_cm / p_width_cm) * FLOOR(v_container.width_cm / p_length_cm)
                );
                v_orientation_max_layers := FLOOR(v_container.height_cm / p_height_cm);
                v_orientation_capacity := v_orientation_per_layer * v_orientation_max_layers;

                IF v_orientation_capacity > v_max_products THEN
                    v_max_products := v_orientation_capacity;
                    v_products_per_layer := v_orientation_per_layer;
                    v_max_layers := v_orientation_max_layers;
                END IF;

                -- Orientation 2: length×height en base, width empilé
                v_orientation_per_layer := GREATEST(
                    FLOOR(v_container.length_cm / p_length_cm) * FLOOR(v_container.width_cm / p_height_cm),
                    FLOOR(v_container.length_cm / p_height_cm) * FLOOR(v_container.width_cm / p_length_cm)
                );
                v_orientation_max_layers := FLOOR(v_container.height_cm / p_width_cm);
                v_orientation_capacity := v_orientation_per_layer * v_orientation_max_layers;

                IF v_orientation_capacity > v_max_products THEN
                    v_max_products := v_orientation_capacity;
                    v_products_per_layer := v_orientation_per_layer;
                    v_max_layers := v_orientation_max_layers;
                END IF;

                -- Orientation 3: width×height en base, length empilé
                v_orientation_per_layer := GREATEST(
                    FLOOR(v_container.length_cm / p_width_cm) * FLOOR(v_container.width_cm / p_height_cm),
                    FLOOR(v_container.length_cm / p_height_cm) * FLOOR(v_container.width_cm / p_width_cm)
                );
                v_orientation_max_layers := FLOOR(v_container.height_cm / p_length_cm);
                v_orientation_capacity := v_orientation_per_layer * v_orientation_max_layers;

                IF v_orientation_capacity > v_max_products THEN
                    v_max_products := v_orientation_capacity;
                    v_products_per_layer := v_orientation_per_layer;
                    v_max_layers := v_orientation_max_layers;
                END IF;
            END;

            -- Si aucune orientation ne permet de mettre des produits, passer au suivant
            IF v_max_products = 0 THEN
                CONTINUE;
            END IF;

            -- Vérifier si la quantité demandée rentre dans le contenant
            IF v_quantity > v_max_products THEN
                CONTINUE;
            END IF;

            -- Calculer combien de couches sont nécessaires pour cette quantité
            v_layers_needed := CEIL(v_quantity::NUMERIC / v_products_per_layer);

            -- Calculer la hauteur totale utilisée
            v_total_height_needed := v_layers_needed * p_height_cm;

            -- Ce contenant convient! Si c'est le moins cher jusqu'à présent, on le garde
            IF v_container.c_total < v_best_cost THEN
                v_best_cost := v_container.c_total;
                v_best_container := v_container;
            END IF;
        END LOOP;

        -- Étape 3: Calculer le coût unitaire si un contenant a été trouvé
        IF v_best_container IS NOT NULL THEN
            -- Calculer avec marge et TVA
            v_cost_base := v_best_container.c_total;
            v_cost_margin := v_cost_base * v_margin_rate;
            v_cost_tva := (v_cost_base + v_cost_margin) * v_tva_rate;
            v_cost_total := v_cost_base + v_cost_margin + v_cost_tva;
            v_cost_unitaire := v_cost_total / v_quantity;

            -- Recalculer les détails d'arrangement pour ce scénario final
            -- ET tracker quelle orientation a été choisie
            DECLARE
                v_orientation_capacity INT;
                v_orientation_per_layer INT;
                v_orientation_max_layers INT;
            BEGIN
                v_max_products := 0;
                v_orientation_used := 1;  -- default

                -- Orientation 1: length×width en base, height empilé
                v_orientation_per_layer := GREATEST(
                    FLOOR(v_best_container.length_cm / p_length_cm) * FLOOR(v_best_container.width_cm / p_width_cm),
                    FLOOR(v_best_container.length_cm / p_width_cm) * FLOOR(v_best_container.width_cm / p_length_cm)
                );
                v_orientation_max_layers := FLOOR(v_best_container.height_cm / p_height_cm);
                v_orientation_capacity := v_orientation_per_layer * v_orientation_max_layers;

                IF v_orientation_capacity > v_max_products THEN
                    v_max_products := v_orientation_capacity;
                    v_products_per_layer := v_orientation_per_layer;
                    v_max_layers := v_orientation_max_layers;
                    v_orientation_used := 1;
                    v_base_length := p_length_cm;
                    v_base_width := p_width_cm;
                    v_stack_height := p_height_cm;
                END IF;

                -- Orientation 2: length×height en base, width empilé
                v_orientation_per_layer := GREATEST(
                    FLOOR(v_best_container.length_cm / p_length_cm) * FLOOR(v_best_container.width_cm / p_height_cm),
                    FLOOR(v_best_container.length_cm / p_height_cm) * FLOOR(v_best_container.width_cm / p_length_cm)
                );
                v_orientation_max_layers := FLOOR(v_best_container.height_cm / p_width_cm);
                v_orientation_capacity := v_orientation_per_layer * v_orientation_max_layers;

                IF v_orientation_capacity > v_max_products THEN
                    v_max_products := v_orientation_capacity;
                    v_products_per_layer := v_orientation_per_layer;
                    v_max_layers := v_orientation_max_layers;
                    v_orientation_used := 2;
                    v_base_length := p_length_cm;
                    v_base_width := p_height_cm;
                    v_stack_height := p_width_cm;
                END IF;

                -- Orientation 3: width×height en base, length empilé
                v_orientation_per_layer := GREATEST(
                    FLOOR(v_best_container.length_cm / p_width_cm) * FLOOR(v_best_container.width_cm / p_height_cm),
                    FLOOR(v_best_container.length_cm / p_height_cm) * FLOOR(v_best_container.width_cm / p_width_cm)
                );
                v_orientation_max_layers := FLOOR(v_best_container.height_cm / p_length_cm);
                v_orientation_capacity := v_orientation_per_layer * v_orientation_max_layers;

                IF v_orientation_capacity > v_max_products THEN
                    v_max_products := v_orientation_capacity;
                    v_products_per_layer := v_orientation_per_layer;
                    v_max_layers := v_orientation_max_layers;
                    v_orientation_used := 3;
                    v_base_length := p_width_cm;
                    v_base_width := p_height_cm;
                    v_stack_height := p_length_cm;
                END IF;
            END;

            v_layers_needed := CEIL(v_quantity::NUMERIC / v_products_per_layer);
            v_total_height_needed := v_layers_needed * v_stack_height;  -- Use stack height not p_height_cm

            -- Créer le scénario avec informations d'orientation
            v_scenario_json := json_build_object(
                'quantity', v_quantity,
                'container', json_build_object(
                    'format_label', v_best_container.format_label,
                    'carrier', v_best_container.carrier,
                    'mode', v_best_container.mode,
                    'dimensions', json_build_object(
                        'length_cm', v_best_container.length_cm,
                        'width_cm', v_best_container.width_cm,
                        'height_cm', v_best_container.height_cm,
                        'max_weight_kg', v_best_container.weight_max_kg
                    )
                ),
                'arrangement', json_build_object(
                    'products_per_layer', v_products_per_layer,
                    'max_layers', v_max_layers,
                    'max_products', v_max_products,
                    'layers_needed', v_layers_needed,
                    'total_height_used', v_total_height_needed,
                    -- NEW: Orientation information
                    'orientation_used', v_orientation_used,
                    'product_base_length', v_base_length,
                    'product_base_width', v_base_width,
                    'product_stack_height', v_stack_height
                ),
                'total_weight', v_total_weight,
                'costs', json_build_object(
                    'base', v_cost_base,
                    'margin', v_cost_margin,
                    'tva', v_cost_tva,
                    'total', v_cost_total,
                    'per_unit', v_cost_unitaire
                ),
                'cost_total', v_cost_total,
                'cost_unitaire', v_cost_unitaire,
                'is_optimal', false,  -- Sera mis à jour après
                'savings_vs_single', CASE
                    WHEN v_quantity = 1 THEN 0
                    ELSE NULL  -- Sera calculé après
                END
            );

            v_scenarios := array_append(v_scenarios, v_scenario_json);

            -- Suivre le coût unitaire minimum
            IF v_cost_unitaire < v_min_cost_unitaire THEN
                v_min_cost_unitaire := v_cost_unitaire;
                v_optimal_quantity := v_quantity;
            END IF;
        ELSE
            -- Aucun contenant ne convient pour cette quantité
            v_scenario_json := json_build_object(
                'quantity', v_quantity,
                'container', NULL,
                'arrangement', NULL,
                'total_weight', v_total_weight,
                'cost_total', NULL,
                'cost_unitaire', NULL,
                'is_optimal', false,
                'is_impossible', true,
                'reason', 'Aucun contenant disponible pour cette quantité'
            );

            v_scenarios := array_append(v_scenarios, v_scenario_json);
        END IF;
    END LOOP;

    -- Étape 4: Marquer le scénario optimal et calculer les économies
    DECLARE
        v_single_cost NUMERIC;
    BEGIN
        v_single_cost := (v_scenarios[1]->>'cost_unitaire')::NUMERIC;

        FOR i IN 1..array_length(v_scenarios, 1) LOOP
            v_scenario_json := v_scenarios[i];

            -- Marquer comme optimal si c'est le meilleur coût unitaire
            IF v_scenario_json->>'cost_unitaire' IS NOT NULL AND
               (v_scenario_json->>'cost_unitaire')::NUMERIC = v_min_cost_unitaire THEN
                v_scenario_json := jsonb_set(
                    v_scenario_json::JSONB,
                    '{is_optimal}',
                    'true'::JSONB
                )::JSON;
            END IF;

            -- Calculer les économies par rapport à Q=1
            IF (v_scenario_json->>'quantity')::INT > 1 AND
               v_scenario_json->>'cost_unitaire' IS NOT NULL THEN
                v_scenario_json := jsonb_set(
                    v_scenario_json::JSONB,
                    '{savings_vs_single}',
                    to_jsonb(v_single_cost - (v_scenario_json->>'cost_unitaire')::NUMERIC)
                )::JSON;
            END IF;

            v_scenarios[i] := v_scenario_json;
        END LOOP;
    END;

    RETURN json_build_object(
        'success', true,
        'scenarios', array_to_json(v_scenarios),
        'optimal_quantity', v_optimal_quantity,
        'min_cost_unitaire', v_min_cost_unitaire,
        'product_dimensions', json_build_object(
            'height_cm', p_height_cm,
            'length_cm', p_length_cm,
            'width_cm', p_width_cm,
            'weight_kg', p_weight_kg
        )
    );
END;
$$;

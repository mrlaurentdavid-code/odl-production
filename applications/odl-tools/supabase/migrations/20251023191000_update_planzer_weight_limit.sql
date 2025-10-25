-- Migration: Update Planzer 60x60x100 weight limit
-- Description: Set weight limit to 30kg for 60x60x100 containers

UPDATE logistics_rates
SET weight_max_kg = 30.0
WHERE format_label LIKE '60x60x100%'
AND provider_id = 'ohmex';

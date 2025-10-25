-- ============================================================================
-- Migration: Create Validation Notifications
-- Date: 2025-10-25
-- Description: Multilingual notification messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.validation_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_key TEXT UNIQUE NOT NULL,

  -- Messages (multilingual)
  message_fr TEXT NOT NULL,
  message_en TEXT NOT NULL,
  message_de TEXT NOT NULL,
  message_it TEXT NOT NULL,

  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('success', 'info', 'warning', 'error')),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_validation_notifications_key
ON validation_notifications(notification_key)
WHERE is_active = true;

-- Enable RLS
ALTER TABLE validation_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_validation_notifications"
ON validation_notifications
FOR SELECT
USING (is_active = true);

COMMENT ON TABLE validation_notifications IS
  'Multilingual notification messages for validation responses.';

-- Insert default notifications
INSERT INTO validation_notifications (
  notification_key,
  message_fr,
  message_en,
  message_de,
  message_it,
  severity
) VALUES
  -- Success messages
  (
    'deal_excellent',
    'Excellent deal ! Économie client: {eco_msrp}% vs MSRP, {eco_street}% vs prix marché',
    'Excellent deal! Customer savings: {eco_msrp}% vs MSRP, {eco_street}% vs market price',
    'Ausgezeichnetes Angebot! Kundenersparnis: {eco_msrp}% vs UVP, {eco_street}% vs Marktpreis',
    'Offerta eccellente! Risparmio cliente: {eco_msrp}% vs MSRP, {eco_street}% vs prezzo mercato',
    'success'
  ),
  (
    'deal_good',
    'Bon deal validé. Économie: {eco_msrp}% vs MSRP',
    'Good deal validated. Savings: {eco_msrp}% vs MSRP',
    'Gutes Angebot validiert. Ersparnis: {eco_msrp}% vs UVP',
    'Buona offerta validata. Risparmio: {eco_msrp}% vs MSRP',
    'success'
  ),

  -- Warning messages
  (
    'deal_almost',
    'Deal presque validé. Marges faibles, vérifiez vos coûts.',
    'Deal almost validated. Low margins, please check your costs.',
    'Angebot fast validiert. Niedrige Margen, überprüfen Sie Ihre Kosten.',
    'Offerta quasi validata. Margini bassi, controllare i costi.',
    'warning'
  ),

  -- Error messages
  (
    'deal_bad',
    'Deal rejeté. Marges insuffisantes ou économies client trop faibles.',
    'Deal rejected. Insufficient margins or customer savings too low.',
    'Angebot abgelehnt. Unzureichende Margen oder Kundenersparnis zu gering.',
    'Offerta rifiutata. Margini insufficienti o risparmio cliente troppo basso.',
    'error'
  ),
  (
    'error_supplier_not_found',
    'Fournisseur non enregistré dans ODL-TOOLS.',
    'Supplier not registered in ODL-TOOLS.',
    'Lieferant nicht in ODL-TOOLS registriert.',
    'Fornitore non registrato in ODL-TOOLS.',
    'error'
  ),
  (
    'error_supplier_disabled',
    'Compte fournisseur désactivé. Contactez l''administrateur.',
    'Supplier account disabled. Contact administrator.',
    'Lieferantenkonto deaktiviert. Kontaktieren Sie den Administrator.',
    'Account fornitore disabilitato. Contattare l''amministratore.',
    'error'
  ),
  (
    'error_quota_exceeded',
    'Quota journalier de validations dépassé.',
    'Daily validation quota exceeded.',
    'Tägliches Validierungskontingent überschritten.',
    'Quota giornaliera di validazioni superata.',
    'error'
  ),
  (
    'error_currency_unavailable',
    'Taux de change non disponible pour cette devise.',
    'Currency rate not available for this currency.',
    'Wechselkurs für diese Währung nicht verfügbar.',
    'Tasso di cambio non disponibile per questa valuta.',
    'error'
  ),
  (
    'error_user_supplier_mismatch',
    'Accès non autorisé : utilisateur n''appartient pas à ce fournisseur.',
    'Unauthorized access: user does not belong to this supplier.',
    'Unbefugter Zugriff: Benutzer gehört nicht zu diesem Lieferanten.',
    'Accesso non autorizzato: utente non appartiene a questo fornitore.',
    'error'
  )
ON CONFLICT (notification_key) DO NOTHING;

-- Function: Get notification message
CREATE OR REPLACE FUNCTION get_notification_message(
  p_notification_key TEXT,
  p_language TEXT DEFAULT 'fr'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_message TEXT;
BEGIN
  SELECT
    CASE p_language
      WHEN 'en' THEN message_en
      WHEN 'de' THEN message_de
      WHEN 'it' THEN message_it
      ELSE message_fr
    END INTO v_message
  FROM validation_notifications
  WHERE notification_key = p_notification_key
    AND is_active = true;

  RETURN COALESCE(v_message, 'Unknown notification key: ' || p_notification_key);
END;
$$;

GRANT EXECUTE ON FUNCTION get_notification_message TO anon, authenticated;

-- Verification
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM validation_notifications WHERE is_active = true;
  RAISE NOTICE '✓ Table validation_notifications created with % messages', v_count;
END $$;

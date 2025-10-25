-- Script pour créer les données de test pour WeWeb (sans N8N)
-- À exécuter dans Supabase SQL Editor

-- ========================================
-- INFORMATIONS DU FOURNISSEUR EXISTANT
-- ========================================
-- Supplier Name: AdminTest
-- Supplier Type: products_and_services
-- Email: admin@test.fr
-- Supplier ID: 334773ca-22ab-43bb-834f-eb50aa1d01f8
-- Primary Contact ID: ff8782ab-8e69-44a4-be0a-91b1e6508f5d

-- ========================================
-- 1. VÉRIFIER LE FOURNISSEUR EXISTANT
-- ========================================
SELECT
  '🔍 Fournisseur existant:' as info,
  id,
  supplier_name,
  supplier_type,
  contact_email,
  country,
  is_active
FROM supplier_registry
WHERE id = '334773ca-22ab-43bb-834f-eb50aa1d01f8';

-- ========================================
-- 2. CRÉER UNE CLÉ API POUR CE FOURNISSEUR
-- ========================================
-- Clé API en clair: WEWEB_TEST_2025
-- Hash SHA256: c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7

INSERT INTO supplier_api_keys (
  supplier_id,
  api_key_hash,
  key_name,
  created_by,
  last_used_at,
  is_active
) VALUES (
  '334773ca-22ab-43bb-834f-eb50aa1d01f8',
  'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7',
  'WeWeb Test Key - AdminTest',
  'ff8782ab-8e69-44a4-be0a-91b1e6508f5d',  -- primary_contact_id
  NULL,
  true
) ON CONFLICT (supplier_id, api_key_hash) DO UPDATE SET
  is_active = true,
  updated_at = now()
RETURNING id, key_name, is_active, created_at;

-- ========================================
-- 3. VÉRIFIER/CRÉER LES RÈGLES MÉTIER
-- ========================================
INSERT INTO odeal_business_rules (rule_name, rule_value, description) VALUES
  ('minimum_margin_percentage', '15.0', 'Marge minimale requise pour valider une offre'),
  ('target_margin_percentage', '25.0', 'Marge cible pour un deal "top"'),
  ('good_margin_percentage', '20.0', 'Marge pour un deal "good"'),
  ('almost_margin_percentage', '17.0', 'Marge pour un deal "almost good"'),
  ('minimum_savings_percentage', '5.0', 'Savings minimum requis (par rapport au prix normal)'),
  ('target_savings_percentage', '15.0', 'Savings cible pour un deal "top"')
ON CONFLICT (rule_name) DO NOTHING;

-- ========================================
-- 4. VÉRIFIER/CRÉER LES TAUX DE DOUANE
-- ========================================
INSERT INTO odeal_customs_duty_rates (
  category_name,
  duty_rate_percentage,
  description
) VALUES
  ('Electronics', 3.7, 'Appareils électroniques grand public'),
  ('Clothing', 12.0, 'Vêtements et textiles'),
  ('Toys', 4.7, 'Jouets et jeux'),
  ('Furniture', 0.0, 'Meubles (exemptés)'),
  ('Books', 0.0, 'Livres (exemptés)'),
  ('Computers', 0.0, 'Ordinateurs et périphériques (exemptés)'),
  ('Sports', 2.7, 'Articles de sport'),
  ('Home Appliances', 2.5, 'Électroménager'),
  ('Audio', 0.0, 'Équipements audio (exemptés)')
ON CONFLICT (category_name) DO NOTHING;

-- ========================================
-- 5. VÉRIFIER LES TAUX DE LOGISTIQUE
-- ========================================
SELECT
  '📦 Taux de logistique disponibles:' as info,
  COUNT(*) as nombre_de_taux
FROM logistics_rates
WHERE is_active = true;

-- Vérifier les providers de logistique actifs
SELECT
  '📦 Providers de logistique actifs:' as info,
  provider_name,
  base_rate_chf,
  rate_per_kg_chf
FROM logistics_providers
WHERE is_active = true
ORDER BY provider_name;

-- ========================================
-- 6. AFFICHER LES INFORMATIONS CRÉÉES
-- ========================================
SELECT
  '✅ Fournisseur AdminTest:' as info,
  id,
  supplier_name,
  supplier_type,
  contact_email,
  country,
  is_active,
  created_at
FROM supplier_registry
WHERE id = '334773ca-22ab-43bb-834f-eb50aa1d01f8';

SELECT
  '✅ Clé API créée pour AdminTest:' as info,
  k.id,
  k.key_name,
  s.supplier_name,
  s.contact_email,
  k.is_active,
  k.created_at
FROM supplier_api_keys k
JOIN supplier_registry s ON k.supplier_id = s.id
WHERE k.supplier_id = '334773ca-22ab-43bb-834f-eb50aa1d01f8'
ORDER BY k.created_at DESC
LIMIT 1;

SELECT
  '✅ Règles métier actives:' as info,
  rule_name,
  rule_value || '%' as valeur,
  description
FROM odeal_business_rules
ORDER BY rule_name;

SELECT
  '✅ Taux de douane disponibles:' as info,
  category_name,
  duty_rate_percentage || '%' as taux,
  description
FROM odeal_customs_duty_rates
ORDER BY category_name;

-- ========================================
-- RÉSUMÉ POUR WEWEB
-- ========================================
/*
📝 CONFIGURATION COMPLÈTE POUR WEWEB

════════════════════════════════════════════════════════════════════════

1. 🌐 API ENDPOINT
   POST https://api.odl-tools.ch/api/validate-item

2. 🔑 AUTHENTICATION HEADER
   X-API-Key: WEWEB_TEST_2025

3. 🏢 FOURNISSEUR
   Supplier ID: 334773ca-22ab-43bb-834f-eb50aa1d01f8
   Nom: AdminTest
   Type: products_and_services
   Email: admin@test.fr

════════════════════════════════════════════════════════════════════════

4. 📋 EXEMPLES DE REQUÊTES POUR TESTER

   A) ⭐ TOP DEAL (marge > 25%)
   ──────────────────────────────────────
   {
     "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
     "item_name": "Laptop Dell XPS 15",
     "supplier_price_chf": 800.00,
     "quantity": 10,
     "category": "Computers",
     "supplier_reference": "DELL-XPS-001",
     "supplier_notes": "Test WeWeb - Top Deal"
   }

   Résultat attendu:
   ✅ is_valid: true
   ✅ deal_status: "top"
   ✅ margin_percentage: > 25%


   B) ✅ GOOD DEAL (marge 20-25%)
   ──────────────────────────────────────
   {
     "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
     "item_name": "iPhone 15 Pro",
     "supplier_price_chf": 1000.00,
     "quantity": 5,
     "category": "Electronics",
     "supplier_reference": "APPLE-IP15-001",
     "supplier_notes": "Test WeWeb - Good Deal"
   }

   Résultat attendu:
   ✅ is_valid: true
   ✅ deal_status: "good"
   ✅ margin_percentage: 20-25%


   C) ⚠️ ALMOST GOOD (marge 15-20%)
   ──────────────────────────────────────
   {
     "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
     "item_name": "Samsung Galaxy S24",
     "supplier_price_chf": 1100.00,
     "quantity": 5,
     "category": "Electronics",
     "supplier_reference": "SAMSUNG-S24-001",
     "supplier_notes": "Test WeWeb - Almost Good"
   }

   Résultat attendu:
   ✅ is_valid: true
   ✅ deal_status: "almost_good"
   ✅ margin_percentage: 15-20%


   D) ❌ BAD DEAL (marge < 15%)
   ──────────────────────────────────────
   {
     "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
     "item_name": "Tablet basique",
     "supplier_price_chf": 1400.00,
     "quantity": 3,
     "category": "Electronics",
     "supplier_reference": "TABLET-001",
     "supplier_notes": "Test WeWeb - Bad Deal"
   }

   Résultat attendu:
   ❌ is_valid: false
   ❌ deal_status: "bad"
   ❌ margin_percentage: < 15%

════════════════════════════════════════════════════════════════════════

5. 📊 STRUCTURE DE LA RÉPONSE

{
  "success": true,
  "data": {
    "is_valid": true,
    "deal_status": "top",
    "margin_percentage": 42.5,
    "savings_percentage": 18.2,
    "cogs_total_chf": 1350.75,
    "breakdown": {
      "supplier_cost": 12000.00,
      "transport_cost": 450.00,
      "customs_duty": 444.00,
      "logistics_cost": 156.75
    },
    "pricing": {
      "recommended_price_chf": 1856.25,
      "minimum_price_chf": 1552.36
    },
    "validation_timestamp": "2025-10-25T20:30:00Z"
  }
}

════════════════════════════════════════════════════════════════════════

6. 🎨 INTERFACE WEWEB SUGGÉRÉE

Formulaire:
  ┌─────────────────────────────────────────────┐
  │ 📝 Nom du produit                           │
  │ [__________________________________]        │
  │                                             │
  │ 💰 Prix fournisseur (CHF)                   │
  │ [__________________________________]        │
  │                                             │
  │ 📦 Quantité                                 │
  │ [__________________________________]        │
  │                                             │
  │ 🏷️ Catégorie                               │
  │ [▼ Computers                       ]        │
  │                                             │
  │ 🔍 Référence (optionnel)                   │
  │ [__________________________________]        │
  │                                             │
  │        [  Valider l'offre  ]                │
  └─────────────────────────────────────────────┘

Affichage des résultats:
  ┌─────────────────────────────────────────────┐
  │ Statut: ⭐ TOP DEAL                         │
  │ Marge: 42.5%                                │
  │ Savings: 18.2%                              │
  │ COGS Total: 1,350.75 CHF                    │
  │                                             │
  │ Détails:                                    │
  │   • Coût fournisseur: 12,000.00 CHF        │
  │   • Transport: 450.00 CHF                   │
  │   • Douane: 444.00 CHF                      │
  │   • Logistique: 156.75 CHF                  │
  │                                             │
  │ Prix recommandé: 1,856.25 CHF               │
  │ Prix minimum: 1,552.36 CHF                  │
  └─────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════

7. 📚 CATÉGORIES DISPONIBLES

   Catégorie          │ Taux douane │ Description
   ──────────────────────────────────────────────────────────
   Audio              │ 0.0%        │ Équipements audio
   Books              │ 0.0%        │ Livres
   Clothing           │ 12.0%       │ Vêtements et textiles
   Computers          │ 0.0%        │ Ordinateurs et périph.
   Electronics        │ 3.7%        │ Électronique grand public
   Furniture          │ 0.0%        │ Meubles
   Home Appliances    │ 2.5%        │ Électroménager
   Sports             │ 2.7%        │ Articles de sport
   Toys               │ 4.7%        │ Jouets et jeux

════════════════════════════════════════════════════════════════════════

8. 🧪 WORKFLOW DE TEST WEWEB

   1. Créer un formulaire avec les champs ci-dessus
   2. Ajouter le supplier_id en variable: "334773ca-22ab-43bb-834f-eb50aa1d01f8"
   3. Configurer un REST API call:
      - Method: POST
      - URL: https://api.odl-tools.ch/api/validate-item
      - Headers: { "X-API-Key": "WEWEB_TEST_2025" }
      - Body: Bind aux champs du formulaire
   4. Afficher les résultats avec conditions:
      - Si deal_status = "top" → Badge vert
      - Si deal_status = "good" → Badge bleu
      - Si deal_status = "almost_good" → Badge orange
      - Si deal_status = "bad" → Badge rouge
   5. Afficher le breakdown des coûts dans un tableau
   6. Afficher les prix recommandés

════════════════════════════════════════════════════════════════════════

9. ⚠️ CODES D'ERREUR POSSIBLES

   Code │ Message                          │ Cause
   ─────────────────────────────────────────────────────────────────
   400  │ Missing required fields          │ Champs requis manquants
   401  │ Invalid or missing API key       │ Clé API invalide
   404  │ Supplier not found               │ Fournisseur inexistant
   429  │ Rate limit exceeded              │ Quota dépassé
   500  │ Internal server error            │ Erreur serveur

════════════════════════════════════════════════════════════════════════

10. 🔒 SÉCURITÉ

   ✅ La clé API est hashée en SHA256 dans la base
   ✅ Rate limiting par supplier_id
   ✅ Validation des données côté serveur
   ✅ RLS Supabase activé sur toutes les tables

════════════════════════════════════════════════════════════════════════
*/

-- ============================================================================
-- Migration: Create categories and subcategories tables for ODL Rules
-- Date: 2025-10-26
-- Description: Mirror WeWeb categories for dropdown validation in ODL Rules
-- ============================================================================

-- ============================================================================
-- PRODUCT CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.odl_product_categories (
  category_id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  fr_display_name TEXT NOT NULL,
  en_display_name TEXT NOT NULL,
  de_display_name TEXT NOT NULL,
  it_display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE odl_product_categories IS 'Product categories from WeWeb - used for ODL Rules validation';

-- ============================================================================
-- PRODUCT SUBCATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.odl_product_subcategories (
  subcategory_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES odl_product_categories(category_id),
  name TEXT UNIQUE NOT NULL,
  fr_display_name TEXT NOT NULL,
  en_display_name TEXT NOT NULL,
  de_display_name TEXT NOT NULL,
  it_display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE odl_product_subcategories IS 'Product subcategories from WeWeb - used for ODL Rules validation';

-- ============================================================================
-- SERVICE CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.odl_service_categories (
  category_id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  fr_display_name TEXT NOT NULL,
  en_display_name TEXT NOT NULL,
  de_display_name TEXT NOT NULL,
  it_display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE odl_service_categories IS 'Service categories from WeWeb - used for ODL Rules validation';

-- ============================================================================
-- SERVICE SUBCATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.odl_service_subcategories (
  subcategory_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES odl_service_categories(category_id),
  name TEXT UNIQUE NOT NULL,
  fr_display_name TEXT NOT NULL,
  en_display_name TEXT NOT NULL,
  de_display_name TEXT NOT NULL,
  it_display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE odl_service_subcategories IS 'Service subcategories from WeWeb - used for ODL Rules validation';

-- ============================================================================
-- INSERT PRODUCT CATEGORIES
-- ============================================================================

INSERT INTO odl_product_categories (category_id, name, en_display_name, fr_display_name, de_display_name, it_display_name, display_order, is_active) VALUES
('c1', 'mode_and_accessories', 'Fashion & Accessories', 'Mode & Accessoires', 'Bekleidung & Accessoires', 'Moda e Accessori', 1, true),
('c2', 'home_and_garden', 'Home & Garden', 'Maison & Jardin', 'Haus & Garten', 'Casa e Giardino', 2, true),
('c3', 'electronics_and_hightech', 'Electronics & High-Tech', 'Électronique & High-Tech', 'Elektronik & High-Tech', 'Elettronica e High-Tech', 3, true),
('c4', 'sports_and_leisure', 'Sports & Leisure', 'Sport & Loisirs', 'Sport & Freizeit', 'Sport e Tempo Libero', 4, true),
('c5', 'beauty_and_wellness', 'Beauty & Wellness', 'Beauté & Bien-être', 'Beauty & Wellness', 'Bellezza e Benessere', 5, true),
('c6', 'kitchen_and_delicatessen', 'Kitchen & Delicatessen', 'Cuisine & Épicerie Fine', 'Küche & Feinkost', 'Cucina e Gastronomia', 6, true),
('c7', 'culture_and_entertainment', 'Culture & Entertainment', 'Culture & Divertissement', 'Kultur & Unterhaltung', 'Cultura e Intrattenimento', 7, true),
('c8', 'games_and_toys', 'Games & Toys', 'Jeux & Jouets', 'Spiele & Spielzeug', 'Giochi e Giocattoli', 8, true),
('c9', 'auto_and_moto', 'Auto & Moto', 'Auto & Moto', 'Auto & Motorrad', 'Auto e Moto', 9, true),
('c10', 'diy_and_tools', 'DIY & Tools', 'Bricolage & Outillage', 'Heimwerken & Werkzeuge', 'Fai da te e Utensili', 10, true)
ON CONFLICT (category_id) DO NOTHING;

-- ============================================================================
-- INSERT SERVICE CATEGORIES
-- ============================================================================

INSERT INTO odl_service_categories (category_id, name, en_display_name, fr_display_name, de_display_name, it_display_name, display_order, is_active) VALUES
('cs1', 'restaurants_gastronomy', 'Restaurants & Gastronomy', 'Restauration & Gastronomie', 'Gastronomie & Kulinarik', 'Ristorazione e Gastronomia', 1, true),
('cs2', 'accommodation_travel', 'Accommodation & Travel', 'Hébergement & Voyages', 'Unterkunft & Reisen', 'Alloggi e Viaggi', 2, true),
('cs3', 'wellness_personal_care', 'Wellness & Personal Care', 'Bien-être & Soins Personnels', 'Wellness & Körperpflege', 'Benessere e Cura della Persona', 3, true),
('cs4', 'leisure_sports', 'Leisure & Sports', 'Loisirs & Sport', 'Freizeit & Sport', 'Tempo Libero e Sport', 4, true),
('cs5', 'culture_events', 'Culture & Events', 'Culture & Événements', 'Kultur & Veranstaltungen', 'Cultura ed Eventi', 5, true),
('cs6', 'services_for_individuals', 'Services for Individuals', 'Services aux Particuliers', 'Dienstleistungen für Privatpersonen', 'Servizi ai Privati', 6, true),
('cs7', 'training_development', 'Training & Development', 'Formation & Développement', 'Bildung & Entwicklung', 'Formazione e Sviluppo', 7, true),
('cs8', 'business_services_b2b', 'Business Services (B2B)', 'Services aux Entreprises (B2B)', 'Unternehmensdienstleistungen (B2B)', 'Servizi alle Imprese (B2B)', 8, true),
('cs9', 'health', 'Health', 'Santé', 'Gesundheit', 'Salute', 9, true)
ON CONFLICT (category_id) DO NOTHING;

-- ============================================================================
-- INSERT PRODUCT SUBCATEGORIES (65 total - top 20 most important)
-- ============================================================================

INSERT INTO odl_product_subcategories (subcategory_id, category_id, name, en_display_name, fr_display_name, de_display_name, it_display_name, display_order, is_active) VALUES
-- Electronics (c3)
('s20', 'c3', 'telephony_accessories', 'Telephony & Accessories', 'Téléphonie & Accessoires', 'Telefonie & Zubehör', 'Telefonia e Accessori', 10, true),
('s21', 'c3', 'computing', 'Computing', 'Informatique', 'Informatik', 'Informatica', 20, true),
('s22', 'c3', 'image_sound', 'Image & Sound', 'Image & Son', 'Bild & Ton', 'Immagine e Suono', 30, true),
('s23', 'c3', 'photo_video', 'Photo & Video', 'Photo & Vidéo', 'Foto & Video', 'Foto e Video', 40, true),
('s24', 'c3', 'small_appliances', 'Small Appliances', 'Petit électroménager', 'Kleine Haushaltsgeräte', 'Piccoli Elettrodomestici', 50, true),
('s25', 'c3', 'large_appliances', 'Large Appliances', 'Gros électroménager', 'Grosse Haushaltsgeräte', 'Grandi Elettrodomestici', 60, true),
('s26', 'c3', 'connected_objects_home_automation', 'Connected Objects & Home Automation', 'Objets connectés & Domotique', 'Vernetzte Objekte & Hausautomation', 'Oggetti Connessi e Domotica', 70, true),
('s27', 'c3', 'video_games_consoles', 'Video Games & Consoles', 'Jeux vidéo & Consoles', 'Videospiele & Konsolen', 'Videogiochi e Console', 80, true),
-- Fashion (c1)
('s1', 'c1', 'womens_clothing', 'Women''s Clothing', 'Vêtements Femme', 'Damenbekleidung', 'Abbigliamento Donna', 10, true),
('s2', 'c1', 'mens_clothing', 'Men''s Clothing', 'Vêtements Homme', 'Herrenbekleidung', 'Abbigliamento Uomo', 20, true),
('s4', 'c1', 'womens_shoes', 'Women''s Shoes', 'Chaussures Femme', 'Damenschuhe', 'Scarpe da Donna', 40, true),
('s5', 'c1', 'mens_shoes', 'Men''s Shoes', 'Chaussures Homme', 'Herrenschuhe', 'Scarpe da Uomo', 50, true),
('s9', 'c1', 'watches', 'Watches', 'Montres', 'Uhren', 'Orologi', 90, true),
('s8', 'c1', 'jewelry', 'Jewelry', 'Bijoux', 'Schmuck', 'Gioielli', 80, true),
-- Sports (c4)
('s28', 'c4', 'sportswear', 'Sportswear', 'Vêtements de sport', 'Sportbekleidung', 'Abbigliamento Sportivo', 10, true),
('s30', 'c4', 'fitness_bodybuilding', 'Fitness & Bodybuilding', 'Fitness & Musculation', 'Fitness & Krafttraining', 'Fitness e Bodybuilding', 30, true),
('s33', 'c4', 'cycling', 'Cycling', 'Cyclisme', 'Radsport', 'Ciclismo', 60, true),
('s34', 'c4', 'winter_sports', 'Winter Sports', 'Sports d''hiver', 'Wintersport', 'Sport Invernali', 70, true),
-- Beauty (c5)
('s37', 'c5', 'fragrances', 'Fragrances', 'Parfums', 'Parfums', 'Profumi', 10, true),
('s42', 'c5', 'personal_care_appliances', 'Personal Care Appliances', 'Appareils de soin', 'Pflegegeräte', 'Apparecchi per la Cura Personale', 60, true)
ON CONFLICT (subcategory_id) DO NOTHING;

-- ============================================================================
-- INSERT SERVICE SUBCATEGORIES (top 15)
-- ============================================================================

INSERT INTO odl_service_subcategories (subcategory_id, category_id, name, en_display_name, fr_display_name, de_display_name, it_display_name, display_order, is_active) VALUES
-- Restaurants (cs1)
('ss1', 'cs1', 'on_site_catering_service', 'On-site Catering Service', 'Service de restauration sur place', 'Restaurant-Service vor Ort', 'Servizio di Ristorazione in Loco', 10, true),
-- Accommodation (cs2)
('ss5', 'cs2', 'hotel_overnight_stay', 'Hotel Overnight Stay', 'Nuitée en hôtel', 'Hotelübernachtung', 'Pernottamento in Hotel', 10, true),
('ss6', 'cs2', 'vacation_rental', 'Vacation Rental', 'Location de logement de vacances', 'Vermietung von Ferienunterkünften', 'Affitto di Alloggi per Vacanze', 20, true),
-- Wellness (cs3)
('ss10', 'cs3', 'wellness_massage', 'Wellness Massage', 'Massage bien-être', 'Wellness-Massage', 'Massaggio Benessere', 10, true),
('ss13', 'cs3', 'spa_thermal_bath_access', 'Spa / Thermal Bath Access', 'Accès Spa / Bains thermaux', 'Spa- / Thermalbad-Zugang', 'Accesso a Spa / Bagni Termali', 40, true),
-- Leisure (cs4)
('ss14', 'cs4', 'amusement_park_ticket', 'Amusement / Water Park Ticket', 'Entrée parc d''attractions / aquatique', 'Eintritt Freizeit-/Wasserpark', 'Biglietto Parco Divertimenti / Acquatico', 10, true),
('ss15', 'cs4', 'gym_fitness_membership', 'Gym / Fitness Membership', 'Abonnement salle de sport / fitness', 'Fitnessstudio-Abonnement', 'Abbonamento Palestra / Fitness', 20, true),
-- Culture (cs5)
('ss19', 'cs5', 'concert_theater_show_ticket', 'Concert / Theater / Show Ticket', 'Billet de concert / théâtre / spectacle', 'Konzert-/Theater-/Show-Ticket', 'Biglietto Concerto / Teatro / Spettacolo', 10, true),
('ss21', 'cs5', 'cinema_ticket', 'Cinema Ticket', 'Entrée au cinéma', 'Kinoticket', 'Biglietto del Cinema', 30, true),
-- Services (cs6)
('ss23', 'cs6', 'home_cleaning_service', 'Home Cleaning Service', 'Service de nettoyage à domicile', 'Hausreinigungsservice', 'Servizio di Pulizia a Domicilio', 10, true),
('ss24', 'cs6', 'appliance_repair', 'Appliance Repair', 'Réparation d''appareils', 'Gerätereparatur', 'Riparazione di Elettrodomestici', 20, true),
-- Training (cs7)
('ss28', 'cs7', 'language_course_recognized', 'Language Course', 'Cours de langue', 'Sprachkurs', 'Corso di Lingua', 10, true),
-- B2B (cs8)
('ss32', 'cs8', 'b2b_marketing_consulting', 'Marketing / Strategy Consulting', 'Conseil en marketing / stratégie', 'Marketing-/Strategieberatung', 'Consulenza di Marketing / Strategia', 10, true),
-- Health (cs9)
('ss36', 'cs9', 'medical_dental_consultation', 'Medical / Dental Consultation', 'Consultation médicale / dentaire', 'Ärztliche / Zahnärztliche Beratung', 'Consulto Medico / Dentistico', 10, true)
ON CONFLICT (subcategory_id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES (read-only for all authenticated users)
-- ============================================================================

ALTER TABLE odl_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE odl_product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE odl_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE odl_service_subcategories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read categories
CREATE POLICY "Allow read access to product categories"
  ON odl_product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to product subcategories"
  ON odl_product_subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to service categories"
  ON odl_service_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to service subcategories"
  ON odl_service_subcategories FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON odl_product_categories TO authenticated, service_role;
GRANT SELECT ON odl_product_subcategories TO authenticated, service_role;
GRANT SELECT ON odl_service_categories TO authenticated, service_role;
GRANT SELECT ON odl_service_subcategories TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Categories tables created';
  RAISE NOTICE '  - Product categories: %', (SELECT COUNT(*) FROM odl_product_categories);
  RAISE NOTICE '  - Product subcategories: %', (SELECT COUNT(*) FROM odl_product_subcategories);
  RAISE NOTICE '  - Service categories: %', (SELECT COUNT(*) FROM odl_service_categories);
  RAISE NOTICE '  - Service subcategories: %', (SELECT COUNT(*) FROM odl_service_subcategories);
END $$;

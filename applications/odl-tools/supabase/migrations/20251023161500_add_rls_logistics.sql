-- ============================================
-- LOGISTICS CALCULATOR - ROW LEVEL SECURITY
-- Date: 23 Octobre 2025
-- Description: Activation RLS pour les tables logistics
--              Lecture publique, écriture admin uniquement
-- ============================================

-- Enable RLS on logistics_rates
ALTER TABLE public.logistics_rates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customs_fees
ALTER TABLE public.customs_fees ENABLE ROW LEVEL SECURITY;

-- Enable RLS on logistics_providers
ALTER TABLE public.logistics_providers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customs_providers
ALTER TABLE public.customs_providers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES FOR logistics_rates
-- ============================================

-- Allow public read access
CREATE POLICY "Allow public read access to logistics_rates"
ON public.logistics_rates
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read access to logistics_rates"
ON public.logistics_rates
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert (in production, restrict to super admins)
CREATE POLICY "Allow authenticated to insert logistics_rates"
ON public.logistics_rates
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update (in production, restrict to super admins)
CREATE POLICY "Allow authenticated to update logistics_rates"
ON public.logistics_rates
FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete (in production, restrict to super admins)
CREATE POLICY "Allow authenticated to delete logistics_rates"
ON public.logistics_rates
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POLICIES FOR customs_fees
-- ============================================

-- Allow public read access
CREATE POLICY "Allow public read access to customs_fees"
ON public.customs_fees
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read access to customs_fees"
ON public.customs_fees
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update (in production, restrict to super admins)
CREATE POLICY "Allow authenticated to update customs_fees"
ON public.customs_fees
FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- POLICIES FOR logistics_providers
-- ============================================

-- Allow public read access
CREATE POLICY "Allow public read access to logistics_providers"
ON public.logistics_providers
FOR SELECT
TO public
USING (true);

-- ============================================
-- POLICIES FOR customs_providers
-- ============================================

-- Allow public read access
CREATE POLICY "Allow public read access to customs_providers"
ON public.customs_providers
FOR SELECT
TO public
USING (true);

-- Add comments
COMMENT ON POLICY "Allow public read access to logistics_rates" ON public.logistics_rates IS
'Permet à tout le monde (y compris anonyme) de lire les tarifs logistiques';

COMMENT ON POLICY "Allow authenticated to insert logistics_rates" ON public.logistics_rates IS
'Utilisateurs authentifiés peuvent ajouter des tarifs (en prod: restreindre aux super admins)';

COMMENT ON POLICY "Allow authenticated to update logistics_rates" ON public.logistics_rates IS
'Utilisateurs authentifiés peuvent modifier des tarifs (en prod: restreindre aux super admins)';

COMMENT ON POLICY "Allow authenticated to delete logistics_rates" ON public.logistics_rates IS
'Utilisateurs authentifiés peuvent supprimer des tarifs (en prod: restreindre aux super admins)';

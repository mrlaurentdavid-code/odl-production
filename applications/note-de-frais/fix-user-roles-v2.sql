-- ==========================================
-- Script pour corriger TOUS les roles des utilisateurs
-- ==========================================

-- 1. Nettoyer tous les roles avec guillemets inclus
UPDATE public.profiles
SET role = REPLACE(REPLACE(role, '''', ''), '"', '')
WHERE role LIKE '%''%' OR role LIKE '%"%';

-- 2. Mettre admin@admin.fr en Administrateur
UPDATE public.profiles
SET role = 'Administrateur'
WHERE email = 'admin@admin.fr';

-- 3. Mettre tous les autres en Collaborateur
UPDATE public.profiles
SET role = 'Collaborateur'
WHERE email != 'admin@admin.fr'
  AND role != 'Collaborateur';

-- 4. Verification finale
SELECT
  email,
  role,
  full_name,
  LENGTH(role) as role_length
FROM public.profiles
ORDER BY
  CASE
    WHEN role = 'Administrateur' THEN 1
    WHEN role = 'Admin' THEN 2
    ELSE 3
  END,
  email;

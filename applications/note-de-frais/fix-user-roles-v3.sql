-- ==========================================
-- Script pour corriger les roles des utilisateurs
-/Applications- Roles valides: Admin ou Collaborateur
-- ==========================================

-- 1. Nettoyer tous les roles avec guillemets inclus
UPDATE public.profiles
SET role = REPLACE(REPLACE(role, '''', ''), '"', '')
WHERE role LIKE '%''%' OR role LIKE '%"%';

-- 2. S'assurer que admin@admin.fr a le role Admin
UPDATE public.profiles
SET role = 'Admin'
WHERE email = 'admin@admin.fr';

-- 3. Mettre tous les autres en Collaborateur (sauf ceux qui sont deja Collaborateur)
UPDATE public.profiles
SET role = 'Collaborateur'
WHERE email != 'admin@admin.fr'
  AND (role != 'Collaborateur' OR role IS NULL);

-- 4. Verification finale
SELECT
  email,
  role,
  full_name,
  LENGTH(role) as role_length,
  CASE
    WHEN role = 'Admin' THEN 'Administrateur du systeme'
    WHEN role = 'Collaborateur' THEN 'Utilisateur standard'
    ELSE 'Role inconnu'
  END as description
FROM public.profiles
ORDER BY
  CASE
    WHEN role = 'Admin' THEN 1
    ELSE 2
  END,
  email;

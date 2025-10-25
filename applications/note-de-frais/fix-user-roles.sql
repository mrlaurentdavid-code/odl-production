-- ==========================================
-- Script pour corriger les roles des utilisateurs
-- Tous les users deviennent Collaborateur sauf admin@admin.fr
-- ==========================================

-- Mettre a jour tous les utilisateurs pour avoir le role Collaborateur
UPDATE public.profiles
SET role = 'Collaborateur'
WHERE role = 'Admin'
   AND email != 'admin@admin.fr';

-- Verifier que admin@admin.fr a bien le role Administrateur
UPDATE public.profiles
SET role = 'Administrateur'
WHERE email = 'admin@admin.fr';

-- Afficher le resultat
SELECT email, role, full_name
FROM public.profiles
ORDER BY
  CASE
    WHEN role = 'Administrateur' THEN 1
    WHEN role = 'Admin' THEN 2
    ELSE 3
  END,
  email;

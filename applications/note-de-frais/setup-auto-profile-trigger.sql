-- ==========================================
-- Script pour créer automatiquement les profils
-- à chaque création d'utilisateur dans Supabase
-- ==========================================

-- 1. Créer la fonction qui sera appelée par le trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Collaborateur'),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 2. Créer le trigger qui appelle la fonction après chaque inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Créer manuellement le profil pour admin@admin.fr (récupérer l'ID depuis auth.users)
-- Note: Cette requête doit être exécutée après avoir vérifié l'ID de l'utilisateur
-- Vous devrez remplacer 'USER_ID_HERE' par l'ID réel

-- Pour trouver l'ID de l'utilisateur admin:
-- SELECT id FROM auth.users WHERE email = 'admin@admin.fr';

COMMENT ON FUNCTION public.handle_new_user() IS 'Crée automatiquement un profil dans la table profiles lors de l''inscription d''un nouvel utilisateur';

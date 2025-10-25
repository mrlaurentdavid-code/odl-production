


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."count_pending_profiles"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.profiles
    WHERE profile_status = 'pending_validation'
      AND onboarding_completed = true
  );
END;
$$;


ALTER FUNCTION "public"."count_pending_profiles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_pending_profiles"() IS 'Compte le nombre de profils en attente de validation';



CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "text" DEFAULT 'user'::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;

  -- Insert invitation
  INSERT INTO public.invitation_tokens (email, role, created_by)
  VALUES (p_email, p_role, auth.uid())
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_access"("p_user_id" "uuid", "p_app_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify that the calling user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only super administrators can manage user access';
  END IF;

  -- Delete the access record
  DELETE FROM public.user_app_access
  WHERE user_id = p_user_id AND app_id = p_app_id;
END;
$$;


ALTER FUNCTION "public"."delete_user_access"("p_user_id" "uuid", "p_app_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_access"("p_user_id" "uuid", "p_app_id" "text") IS 'Revokes user access to an application (super admin only)';



CREATE OR REPLACE FUNCTION "public"."get_all_accesses"() RETURNS TABLE("user_id" "uuid", "app_id" "text", "role" "text", "granted_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      ua.user_id,
      ua.app_id,
      ua.role,
      ua.granted_at
    FROM public.user_app_access ua
    WHERE ua.revoked_at IS NULL;
  END;
  $$;


ALTER FUNCTION "public"."get_all_accesses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_applications"() RETURNS TABLE("id" "text", "name" "text", "description" "text", "url" "text", "icon" "text", "requires_auth" boolean, "enabled" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      a.id,
      a.name,
      a.description,
      a.url,
      a.icon,
      a.requires_auth,
      a.enabled,
      a.created_at
    FROM public.applications a
    WHERE a.enabled = true
    ORDER BY a.name;
  END;
  $$;


ALTER FUNCTION "public"."get_all_applications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_profiles_admin"() RETURNS TABLE("id" "uuid", "email" "text", "full_name" "text", "first_name" "text", "last_name" "text", "birth_date" "date", "is_super_admin" boolean, "department" "text", "job_title" "text", "team" "text", "location" "text", "employee_type" "text", "phone" "text", "is_active" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.first_name,
      p.last_name,
      p.birth_date,
      p.is_super_admin,
      p.department,
      p.job_title,
      p.team,
      p.location,
      p.employee_type,
      p.phone,
      p.is_active,
      p.created_at
    FROM public.profiles p
    ORDER BY p.created_at DESC;
  END;
  $$;


ALTER FUNCTION "public"."get_all_profiles_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_profiles"() RETURNS TABLE("id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "full_name" "text", "department" "text", "job_title" "text", "location" "text", "phone" "text", "birth_date" "date", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.full_name,
    p.department,
    p.job_title,
    p.location,
    p.phone,
    p.birth_date,
    p.created_at
  FROM public.profiles p
  WHERE p.profile_status = 'pending_validation'
    AND p.onboarding_completed = true
  ORDER BY p.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_pending_profiles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_profiles"() IS 'Récupère les profils en attente de validation';



CREATE OR REPLACE FUNCTION "public"."get_profile_bypass_rls"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "full_name" "text", "is_super_admin" boolean, "department" "text", "job_title" "text", "is_active" boolean, "onboarding_completed" boolean, "profile_status" "text", "rejection_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.is_super_admin,
    p.department,
    p.job_title,
    p.is_active,
    p.onboarding_completed,
    p.profile_status,
    p.rejection_reason
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_profile_bypass_rls"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_apps"("p_user_id" "uuid") RETURNS TABLE("app_id" "text", "app_name" "text", "app_description" "text", "app_url" "text", "app_icon" "text", "user_role" "text", "is_super_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Vérifier si super admin
  SELECT profiles.is_super_admin INTO v_is_super_admin
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_super_admin THEN
    -- Super admin: retourner toutes les apps
    RETURN QUERY
    SELECT
      a.id,
      a.name,
      a.description,
      a.url,
      a.icon,
      'super_admin'::TEXT,
      true
    FROM public.applications a
    WHERE a.enabled = true;
  ELSE
    -- User normal: retourner uniquement les apps autorisées
    RETURN QUERY
    SELECT
      a.id,
      a.name,
      a.description,
      a.url,
      a.icon,
      uaa.role,
      false
    FROM public.applications a
    INNER JOIN public.user_app_access uaa ON a.id = uaa.app_id
    WHERE a.enabled = true
      AND uaa.user_id = p_user_id
      AND uaa.revoked_at IS NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_apps"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_apps"("p_user_id" "uuid") IS 'Retourne toutes les applications accessibles par un utilisateur';



CREATE OR REPLACE FUNCTION "public"."get_user_role_in_app"("p_user_id" "uuid", "p_app_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_role TEXT;
BEGIN
  -- Vérifier si super admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_super_admin THEN
    RETURN 'super_admin';
  END IF;

  -- Récupérer le rôle spécifique
  SELECT role INTO v_role
  FROM public.user_app_access
  WHERE user_id = p_user_id
    AND app_id = p_app_id
    AND revoked_at IS NULL;

  RETURN COALESCE(v_role, 'none');
END;
$$;


ALTER FUNCTION "public"."get_user_role_in_app"("p_user_id" "uuid", "p_app_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_role_in_app"("p_user_id" "uuid", "p_app_id" "text") IS 'Retourne le rôle d''un utilisateur dans une application spécifique';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;  -- Si le profil existe déjà, ne rien faire
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_app_access"("p_user_id" "uuid", "p_app_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_department TEXT;
  v_job_title TEXT;
  v_is_active BOOLEAN;
BEGIN
  -- Récupérer les informations du profil utilisateur
  SELECT is_super_admin, department, job_title, is_active
  INTO v_is_super_admin, v_department, v_job_title, v_is_active
  FROM public.profiles
  WHERE id = p_user_id;

  -- Utilisateur inactif = pas d'accès
  IF NOT v_is_active THEN
    RETURN false;
  END IF;

  -- Super admin = accès total
  IF v_is_super_admin THEN
    RETURN true;
  END IF;

  -- Vérifier l'accès individuel spécifique (priorité)
  IF EXISTS (
    SELECT 1 FROM public.user_app_access
    WHERE user_id = p_user_id
      AND app_id = p_app_id
      AND revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;

  -- Vérifier l'accès par département/fonction
  IF v_department IS NOT NULL THEN
    -- Recherche exacte: département + job_title
    IF EXISTS (
      SELECT 1 FROM public.department_app_access
      WHERE app_id = p_app_id
        AND department = v_department
        AND job_title = v_job_title
    ) THEN
      RETURN true;
    END IF;

    -- Recherche générique: département seulement (job_title = NULL)
    IF EXISTS (
      SELECT 1 FROM public.department_app_access
      WHERE app_id = p_app_id
        AND department = v_department
        AND job_title IS NULL
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;


ALTER FUNCTION "public"."has_app_access"("p_user_id" "uuid", "p_app_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_app_access"("p_user_id" "uuid", "p_app_id" "text") IS 'Vérifie si un utilisateur a accès à une application. Priorité: 1) Super admin, 2) Accès individuel, 3) Règle département/fonction';



CREATE OR REPLACE FUNCTION "public"."is_current_user_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT is_super_admin
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_current_user_super_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_current_user_super_admin"() IS 'Vérifie si l''utilisateur actuel est super admin (SECURITY DEFINER pour éviter récursion RLS)';



CREATE OR REPLACE FUNCTION "public"."update_last_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_access"("p_user_id" "uuid", "p_app_id" "text", "p_role" "text", "p_granted_by" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify that the calling user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only super administrators can manage user access';
  END IF;

  -- Upsert the access record
  INSERT INTO public.user_app_access (user_id, app_id, role, granted_by, granted_at)
  VALUES (p_user_id, p_app_id, p_role, p_granted_by, NOW())
  ON CONFLICT (user_id, app_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    granted_by = EXCLUDED.granted_by,
    granted_at = NOW(),
    revoked_at = NULL;
END;
$$;


ALTER FUNCTION "public"."upsert_user_access"("p_user_id" "uuid", "p_app_id" "text", "p_role" "text", "p_granted_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_user_access"("p_user_id" "uuid", "p_app_id" "text", "p_role" "text", "p_granted_by" "uuid") IS 'Grants or updates user access to an application (super admin only)';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Catégorie de dépense" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "Catégorie" "text"
);


ALTER TABLE "public"."Catégorie de dépense" OWNER TO "postgres";


ALTER TABLE "public"."Catégorie de dépense" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Catégorie de dépense_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "url" "text",
    "icon" "text",
    "requires_auth" boolean DEFAULT true,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."applications" IS 'Applications ODL disponibles dans l''écosystème';



CREATE TABLE IF NOT EXISTS "public"."currency_change" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "base" "text" NOT NULL,
    "quote" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "source" "text" DEFAULT 'frankfurter'::"text" NOT NULL,
    "fetched_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."currency_change" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."department_app_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_id" "text" NOT NULL,
    "department" "text",
    "job_title" "text",
    "default_role" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    CONSTRAINT "department_app_access_default_role_check" CHECK (("default_role" = ANY (ARRAY['viewer'::"text", 'user'::"text", 'editor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."department_app_access" OWNER TO "postgres";


COMMENT ON TABLE "public"."department_app_access" IS 'Règles d''accès par département/fonction (ex: tous les RH ont accès à Notes de Frais)';



CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."factures" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fournisseur" "text",
    "date" "date",
    "montant_ttc" numeric,
    "devise" "text",
    "categorie" "text",
    "source_paiement" "text",
    "lien_justificatif" "text",
    "montant_ht" numeric,
    "montant_tva" numeric,
    "taux_tva" numeric,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "status" "text" DEFAULT '''En attente de visa'' '::"text",
    "montant_ttc_chf" numeric,
    "taux_change" numeric(10,6)
);


ALTER TABLE "public"."factures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT '''Collaborateur'''::"text",
    "email" "text",
    "full_name" "text",
    "last_login_at" timestamp with time zone,
    "is_super_admin" boolean DEFAULT false,
    "job_title" "text",
    "department" "text",
    "team" "text",
    "location" "text",
    "employee_type" "text" DEFAULT 'employee'::"text",
    "phone" "text",
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "hire_date" "date",
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "birth_date" "date",
    "onboarding_completed" boolean DEFAULT false,
    "profile_status" "text" DEFAULT 'pending_validation'::"text",
    "validated_by" "uuid",
    "validated_at" timestamp with time zone,
    "rejection_reason" "text",
    CONSTRAINT "profiles_employee_type_check" CHECK (("employee_type" = ANY (ARRAY['employee'::"text", 'contractor'::"text", 'intern'::"text", 'manager'::"text", 'executive'::"text"]))),
    CONSTRAINT "profiles_profile_status_check" CHECK (("profile_status" = ANY (ARRAY['pending_validation'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Profils utilisateurs unifiés pour tous les outils ODL avec informations organisationnelles (département, fonction, localisation)';



COMMENT ON COLUMN "public"."profiles"."job_title" IS 'Titre du poste (ex: Responsable RH, Comptable, Développeur)';



COMMENT ON COLUMN "public"."profiles"."department" IS 'Département de l''utilisateur (ex: RH, Finance, IT, Commercial)';



COMMENT ON COLUMN "public"."profiles"."employee_type" IS 'Type d''employé: employee, contractor, intern, manager, executive';



COMMENT ON COLUMN "public"."profiles"."is_active" IS 'Utilisateur actif (true) ou désactivé (false). Les utilisateurs inactifs n''ont aucun accès.';



COMMENT ON COLUMN "public"."profiles"."first_name" IS 'Prénom de l''utilisateur';



COMMENT ON COLUMN "public"."profiles"."last_name" IS 'Nom de famille de l''utilisateur';



COMMENT ON COLUMN "public"."profiles"."birth_date" IS 'Date de naissance (pour anniversaires, statistiques RH, etc.)';



CREATE OR REPLACE VIEW "public"."factures_en_chf" WITH ("security_invoker"='on') AS
 SELECT "f"."id",
    "f"."created_at",
    "f"."fournisseur",
    "f"."date",
    "f"."devise",
    "f"."categorie",
    "f"."source_paiement",
    "f"."lien_justificatif",
    "f"."user_id",
    "f"."montant_ttc" AS "montant_original",
    (COALESCE(("f"."montant_ttc" * "rate"."rate"), "f"."montant_ttc"))::numeric(10,2) AS "montant_en_chf",
        CASE
            WHEN (("f"."devise" <> 'CHF'::"text") AND ("rate"."rate" IS NULL)) THEN true
            ELSE false
        END AS "conversion_echouee",
    "p"."full_name"
   FROM (("public"."factures" "f"
     LEFT JOIN "public"."currency_change" "rate" ON ((("f"."date" = "rate"."date") AND ("f"."devise" = "rate"."base") AND ("rate"."quote" = 'CHF'::"text"))))
     LEFT JOIN "public"."profiles" "p" ON (("f"."user_id" = "p"."id")));


ALTER VIEW "public"."factures_en_chf" OWNER TO "postgres";


ALTER TABLE "public"."factures" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."factures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."invitation_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "used_at" timestamp with time zone,
    "used" boolean DEFAULT false,
    CONSTRAINT "invitation_tokens_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."invitation_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_titles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "department_id" "uuid",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_titles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ean" character varying(13),
    "gtin" character varying(14),
    "upc" character varying(12),
    "product_name" "text",
    "brand" "text",
    "manufacturer" "text",
    "model_number" "text",
    "short_description" "text",
    "long_description" "text",
    "key_features" "jsonb",
    "technical_specs" "jsonb",
    "product_length_cm" numeric(10,2),
    "product_width_cm" numeric(10,2),
    "product_height_cm" numeric(10,2),
    "product_weight_kg" numeric(10,3),
    "package_weight_kg" numeric(10,3),
    "package_length_cm" numeric(10,2),
    "package_width_cm" numeric(10,2),
    "package_height_cm" numeric(10,2),
    "color" "text",
    "main_category" "text",
    "sub_category" "text",
    "product_type" "text",
    "tar_category" "text",
    "tar_organism" "text",
    "tar_rate_ht" numeric(10,2),
    "tar_rate_ttc" numeric(10,2),
    "tar_type_applied" "text",
    "vat_rate" numeric(5,2),
    "msrp_chf" numeric(10,2),
    "msrp_eur" numeric(10,2),
    "msrp_usd" numeric(10,2),
    "street_price_chf" numeric(10,2),
    "currency" character varying(3) DEFAULT 'CHF'::character varying,
    "availability_status" "text",
    "release_date" "date",
    "discontinuation_date" "date",
    "main_image_url" "text",
    "images_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "video_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "source_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "country_of_origin" "text",
    "manufacturer_part_number" "text",
    "certifications" "jsonb" DEFAULT '[]'::"jsonb",
    "energy_label" "text",
    "warranty_months" integer,
    "data_source" "text" DEFAULT 'serpapi'::"text",
    "data_quality_score" integer,
    "confidence_score" integer DEFAULT 80,
    "needs_review" boolean DEFAULT false,
    "verified" boolean DEFAULT false,
    "search_count" integer DEFAULT 1,
    "last_searched_at" timestamp with time zone DEFAULT "now"(),
    "view_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_verified_at" timestamp with time zone
);


ALTER TABLE "public"."products_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_qr_codes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "qr_token" "text" NOT NULL,
    "qr_data" "text",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "last_scanned_at" timestamp with time zone,
    "scan_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "max_scans" integer,
    CONSTRAINT "max_scans_positive" CHECK ((("max_scans" IS NULL) OR ("max_scans" > 0))),
    CONSTRAINT "qr_token_length" CHECK ((("char_length"("qr_token") >= 10) AND ("char_length"("qr_token") <= 200))),
    CONSTRAINT "scan_count_positive" CHECK (("scan_count" >= 0))
);


ALTER TABLE "public"."profile_qr_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."profile_qr_codes" IS 'QR codes pour scanner et ajouter des participants';



CREATE TABLE IF NOT EXISTS "public"."questionnaires" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "category" "text",
    "unlocks_practice_categories" "uuid"[],
    "order_index" integer DEFAULT 0,
    "is_required" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_text_length" CHECK ((("char_length"("question_text") >= 5) AND ("char_length"("question_text") <= 500))),
    CONSTRAINT "questionnaires_question_type_check" CHECK (("question_type" = ANY (ARRAY['multiple_choice'::"text", 'yes_no'::"text", 'scale'::"text"])))
);


ALTER TABLE "public"."questionnaires" OWNER TO "postgres";


COMMENT ON TABLE "public"."questionnaires" IS 'Questions du questionnaire de profil utilisateur';



COMMENT ON COLUMN "public"."questionnaires"."options" IS 'Format: [{"value": "yes", "label": "Oui", "unlocks": [...]}, ...]';



COMMENT ON COLUMN "public"."questionnaires"."unlocks_practice_categories" IS 'Catégories de pratiques débloquées selon la réponse';



CREATE TABLE IF NOT EXISTS "public"."sources_de_paiement" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nom" "text",
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "necessite_remboursement" boolean DEFAULT false
);


ALTER TABLE "public"."sources_de_paiement" OWNER TO "postgres";


ALTER TABLE "public"."sources_de_paiement" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sources_de_paiement_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_app_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "app_id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone,
    CONSTRAINT "user_app_access_role_check" CHECK (("role" = ANY (ARRAY['viewer'::"text", 'user'::"text", 'editor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_app_access" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_app_access" IS 'Gestion granulaire des accès utilisateur par application (niveau individuel, priorité haute)';



CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval)
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_invitations" IS 'Invitations en attente pour nouveaux utilisateurs';



CREATE TABLE IF NOT EXISTS "public"."user_questionnaire_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "questionnaire_id" "uuid" NOT NULL,
    "answer" "jsonb" NOT NULL,
    "unlocked_categories" "uuid"[],
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_questionnaire_responses" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_questionnaire_responses" IS 'Réponses au questionnaire de profil';



COMMENT ON COLUMN "public"."user_questionnaire_responses"."answer" IS 'Format: {"value": "yes"} ou {"values": ["option1", "option2"]} ou {"score": 3}';



ALTER TABLE ONLY "public"."Catégorie de dépense"
    ADD CONSTRAINT "Catégorie de dépense_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."currency_change"
    ADD CONSTRAINT "currency_change_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."department_app_access"
    ADD CONSTRAINT "department_app_access_app_id_department_job_title_key" UNIQUE ("app_id", "department", "job_title");



ALTER TABLE ONLY "public"."department_app_access"
    ADD CONSTRAINT "department_app_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."factures"
    ADD CONSTRAINT "factures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_title_key" UNIQUE ("title");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products_catalog"
    ADD CONSTRAINT "products_catalog_ean_key" UNIQUE ("ean");



ALTER TABLE ONLY "public"."products_catalog"
    ADD CONSTRAINT "products_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_qr_codes"
    ADD CONSTRAINT "profile_qr_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_qr_codes"
    ADD CONSTRAINT "profile_qr_codes_qr_token_key" UNIQUE ("qr_token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sources_de_paiement"
    ADD CONSTRAINT "sources_de_paiement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_app_access"
    ADD CONSTRAINT "user_app_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_app_access"
    ADD CONSTRAINT "user_app_access_user_id_app_id_key" UNIQUE ("user_id", "app_id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_questionnaire_responses"
    ADD CONSTRAINT "user_questionnaire_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_questionnaire_responses"
    ADD CONSTRAINT "user_questionnaire_unique" UNIQUE ("user_id", "questionnaire_id");



CREATE INDEX "idx_invitation_email" ON "public"."invitation_tokens" USING "btree" ("email");



CREATE INDEX "idx_invitation_token" ON "public"."invitation_tokens" USING "btree" ("token");



CREATE INDEX "idx_products_brand" ON "public"."products_catalog" USING "btree" ("brand");



CREATE INDEX "idx_products_created" ON "public"."products_catalog" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_products_ean" ON "public"."products_catalog" USING "btree" ("ean");



CREATE INDEX "idx_products_tar_category" ON "public"."products_catalog" USING "btree" ("tar_category");



CREATE INDEX "idx_products_tar_organism" ON "public"."products_catalog" USING "btree" ("tar_organism");



CREATE INDEX "idx_profile_qr_codes_expires_at" ON "public"."profile_qr_codes" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE UNIQUE INDEX "idx_profile_qr_codes_token" ON "public"."profile_qr_codes" USING "btree" ("qr_token");



CREATE UNIQUE INDEX "idx_profile_qr_codes_user_id" ON "public"."profile_qr_codes" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_questionnaires_category" ON "public"."questionnaires" USING "btree" ("category");



CREATE INDEX "idx_questionnaires_is_active" ON "public"."questionnaires" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_questionnaires_order" ON "public"."questionnaires" USING "btree" ("order_index");



CREATE INDEX "idx_user_questionnaire_question_id" ON "public"."user_questionnaire_responses" USING "btree" ("questionnaire_id");



CREATE INDEX "idx_user_questionnaire_user_id" ON "public"."user_questionnaire_responses" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_products_catalog_updated" BEFORE UPDATE ON "public"."products_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_profile_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."department_app_access"
    ADD CONSTRAINT "department_app_access_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."department_app_access"
    ADD CONSTRAINT "department_app_access_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."factures"
    ADD CONSTRAINT "factures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profile_qr_codes"
    ADD CONSTRAINT "profile_qr_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_app_access"
    ADD CONSTRAINT "user_app_access_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_app_access"
    ADD CONSTRAINT "user_app_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_app_access"
    ADD CONSTRAINT "user_app_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_questionnaire_responses"
    ADD CONSTRAINT "user_questionnaire_responses_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_questionnaire_responses"
    ADD CONSTRAINT "user_questionnaire_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage invitations" ON "public"."invitation_tokens" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "All authenticated users can read department access rules" ON "public"."department_app_access" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow public read access on products_catalog" ON "public"."products_catalog" FOR SELECT USING (true);



CREATE POLICY "Allow service role write access on products_catalog" ON "public"."products_catalog" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Anyone authenticated can read departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone authenticated can read enabled applications" ON "public"."applications" FOR SELECT USING (("enabled" = true));



CREATE POLICY "Anyone authenticated can read job titles" ON "public"."job_titles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone authenticated can read locations" ON "public"."locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can read their own invitation by token" ON "public"."invitation_tokens" FOR SELECT USING (true);



ALTER TABLE "public"."Catégorie de dépense" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable all access for all users" ON "public"."profiles" USING (true);



CREATE POLICY "Enable delete for users based on user_id" ON "public"."Catégorie de dépense" FOR DELETE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'Admin'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."Catégorie de dépense" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'Admin'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."factures" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."Catégorie de dépense" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."factures" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Les Admins peuvent modifier les factures" ON "public"."factures" FOR UPDATE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'Admin'::"text"));



CREATE POLICY "Les Admins peuvent supprimer les factures" ON "public"."factures" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['Admin'::"text", 'Administrateur'::"text"]))))));



CREATE POLICY "Les Admins voient toutes les factures" ON "public"."factures" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'Admin'::"text"));



CREATE POLICY "Les Admins voient toutes les sources" ON "public"."sources_de_paiement" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'Admin'::"text"));



CREATE POLICY "Les collaborateurs voient leurs sources + les sources" ON "public"."sources_de_paiement" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "Les utilisateurs peuvent supprimer leurs factures" ON "public"."factures" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Super admins can delete departments" ON "public"."departments" FOR DELETE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can delete invitations" ON "public"."invitation_tokens" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Super admins can delete job titles" ON "public"."job_titles" FOR DELETE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can delete locations" ON "public"."locations" FOR DELETE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can insert departments" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can insert invitations" ON "public"."invitation_tokens" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Super admins can insert job titles" ON "public"."job_titles" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can insert locations" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can manage applications" ON "public"."applications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Super admins can manage department access rules" ON "public"."department_app_access" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Super admins can manage invitations" ON "public"."user_invitations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Super admins can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can update all profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true)) WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can update departments" ON "public"."departments" FOR UPDATE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true)) WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can update invitations" ON "public"."invitation_tokens" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Super admins can update job titles" ON "public"."job_titles" FOR UPDATE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true)) WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can update locations" ON "public"."locations" FOR UPDATE TO "authenticated" USING (("public"."is_current_user_super_admin"() = true)) WITH CHECK (("public"."is_current_user_super_admin"() = true));



CREATE POLICY "Super admins can view invitations" ON "public"."invitation_tokens" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_super_admin" = true)))));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."department_app_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_titles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sources_de_paiement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."count_pending_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."count_pending_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_pending_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_access"("p_user_id" "uuid", "p_app_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_access"("p_user_id" "uuid", "p_app_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_access"("p_user_id" "uuid", "p_app_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_accesses"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_accesses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_accesses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_applications"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_applications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_applications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_profiles_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_profiles_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_profiles_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_bypass_rls"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_bypass_rls"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_bypass_rls"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_apps"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_apps"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_apps"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_in_app"("p_user_id" "uuid", "p_app_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_in_app"("p_user_id" "uuid", "p_app_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_in_app"("p_user_id" "uuid", "p_app_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_app_access"("p_user_id" "uuid", "p_app_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_app_access"("p_user_id" "uuid", "p_app_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_app_access"("p_user_id" "uuid", "p_app_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_access"("p_user_id" "uuid", "p_app_id" "text", "p_role" "text", "p_granted_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_access"("p_user_id" "uuid", "p_app_id" "text", "p_role" "text", "p_granted_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_access"("p_user_id" "uuid", "p_app_id" "text", "p_role" "text", "p_granted_by" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."Catégorie de dépense" TO "anon";
GRANT ALL ON TABLE "public"."Catégorie de dépense" TO "authenticated";
GRANT ALL ON TABLE "public"."Catégorie de dépense" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Catégorie de dépense_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Catégorie de dépense_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Catégorie de dépense_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."currency_change" TO "anon";
GRANT ALL ON TABLE "public"."currency_change" TO "authenticated";
GRANT ALL ON TABLE "public"."currency_change" TO "service_role";



GRANT ALL ON TABLE "public"."department_app_access" TO "anon";
GRANT ALL ON TABLE "public"."department_app_access" TO "authenticated";
GRANT ALL ON TABLE "public"."department_app_access" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."factures" TO "anon";
GRANT ALL ON TABLE "public"."factures" TO "authenticated";
GRANT ALL ON TABLE "public"."factures" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."factures_en_chf" TO "anon";
GRANT ALL ON TABLE "public"."factures_en_chf" TO "authenticated";
GRANT ALL ON TABLE "public"."factures_en_chf" TO "service_role";



GRANT ALL ON SEQUENCE "public"."factures_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."factures_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."factures_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_tokens" TO "anon";
GRANT ALL ON TABLE "public"."invitation_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."job_titles" TO "anon";
GRANT ALL ON TABLE "public"."job_titles" TO "authenticated";
GRANT ALL ON TABLE "public"."job_titles" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."products_catalog" TO "anon";
GRANT ALL ON TABLE "public"."products_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."products_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."profile_qr_codes" TO "anon";
GRANT ALL ON TABLE "public"."profile_qr_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_qr_codes" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaires" TO "anon";
GRANT ALL ON TABLE "public"."questionnaires" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaires" TO "service_role";



GRANT ALL ON TABLE "public"."sources_de_paiement" TO "anon";
GRANT ALL ON TABLE "public"."sources_de_paiement" TO "authenticated";
GRANT ALL ON TABLE "public"."sources_de_paiement" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sources_de_paiement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sources_de_paiement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sources_de_paiement_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_app_access" TO "anon";
GRANT ALL ON TABLE "public"."user_app_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_app_access" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_questionnaire_responses" TO "anon";
GRANT ALL ON TABLE "public"."user_questionnaire_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_questionnaire_responses" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_customer_transport_optimization"("p_height_cm" numeric, "p_length_cm" numeric, "p_width_cm" numeric, "p_weight_kg" numeric, "p_provider_id" "text" DEFAULT 'ohmex'::"text") RETURNS json
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."calculate_customer_transport_optimization"("p_height_cm" numeric, "p_length_cm" numeric, "p_width_cm" numeric, "p_weight_kg" numeric, "p_provider_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_customs_cost"("p_quantity" integer DEFAULT 1, "p_merchandise_value" numeric DEFAULT 0, "p_provider_id" "text" DEFAULT 'pesa'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_customs_admin NUMERIC := 0;
    v_customs_positions NUMERIC := 0;
    v_customs_droits NUMERIC := 0;
    v_customs_tva NUMERIC := 0;
    v_customs_subtotal NUMERIC := 0;
    v_customs_per_unit NUMERIC := 0;

    v_customs_fee_admin NUMERIC;
    v_customs_fee_droits_rate NUMERIC;
    v_customs_fee_droits_min NUMERIC;
    v_customs_fee_tva_rate NUMERIC;
    v_customs_fee_tva_min NUMERIC;
BEGIN
    -- Validation: quantity must be at least 1
    IF p_quantity < 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La quantité doit être au moins 1'
        );
    END IF;

    -- Validation: merchandise value required
    IF p_merchandise_value <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La valeur de la marchandise est requise'
        );
    END IF;

    -- Get customs fees from customs_fees table
    SELECT value INTO v_customs_fee_admin
    FROM customs_fees
    WHERE provider_id = p_provider_id AND fee_type = 'admin_base' AND is_active = TRUE;

    SELECT value INTO v_customs_fee_droits_rate
    FROM customs_fees
    WHERE provider_id = p_provider_id AND fee_type = 'gestion_droits_taux' AND is_active = TRUE;

    SELECT value INTO v_customs_fee_droits_min
    FROM customs_fees
    WHERE provider_id = p_provider_id AND fee_type = 'gestion_droits_min' AND is_active = TRUE;

    SELECT value INTO v_customs_fee_tva_rate
    FROM customs_fees
    WHERE provider_id = p_provider_id AND fee_type = 'gestion_tva_taux' AND is_active = TRUE;

    SELECT value INTO v_customs_fee_tva_min
    FROM customs_fees
    WHERE provider_id = p_provider_id AND fee_type = 'gestion_tva_min' AND is_active = TRUE;

    -- Admin base (always 1 position)
    v_customs_admin := COALESCE(v_customs_fee_admin, 80);

    -- No additional positions (always 1 position)
    v_customs_positions := 0;

    -- Gestion droits (with minimum)
    v_customs_droits := GREATEST(
        p_merchandise_value * COALESCE(v_customs_fee_droits_rate, 0.035),
        COALESCE(v_customs_fee_droits_min, 5)
    );

    -- Gestion TVA (with minimum)
    v_customs_tva := GREATEST(
        p_merchandise_value * COALESCE(v_customs_fee_tva_rate, 0.025),
        COALESCE(v_customs_fee_tva_min, 5)
    );

    -- Total customs for all items
    v_customs_subtotal := v_customs_admin + v_customs_positions + v_customs_droits + v_customs_tva;

    -- Customs cost per unit
    v_customs_per_unit := v_customs_subtotal / p_quantity;

    -- Return structured result
    RETURN json_build_object(
        'success', true,
        'costs', json_build_object(
            'customs', json_build_object(
                'admin_base', v_customs_admin,
                'positions_supp', v_customs_positions,
                'gestion_droits', v_customs_droits,
                'gestion_tva', v_customs_tva,
                'subtotal', v_customs_subtotal,
                'per_unit', v_customs_per_unit,
                'quantity', p_quantity
            ),
            'merchandise_value', p_merchandise_value,
            'total_per_unit', v_customs_per_unit
        )
    );
END;
$$;


ALTER FUNCTION "public"."calculate_customs_cost"("p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_customs_cost"("p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") IS 'Calcule uniquement les frais de douane (sans transport).
Paramètres: quantité, valeur marchandise.
Retourne: admin + droits + TVA / quantité';



CREATE OR REPLACE FUNCTION "public"."calculate_logistics_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text" DEFAULT NULL::"text", "p_mode" "text" DEFAULT NULL::"text", "p_is_imported" boolean DEFAULT false, "p_quantity" integer DEFAULT 1, "p_merchandise_value" numeric DEFAULT 0, "p_provider_id" "text" DEFAULT 'ohmex'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_rate RECORD;
    v_transport_cost NUMERIC;
    v_reception_cost NUMERIC;
    v_prep_cost NUMERIC;
    v_transport_subtotal NUMERIC;

    v_customs_admin NUMERIC := 0;
    v_customs_positions NUMERIC := 0;
    v_customs_droits NUMERIC := 0;
    v_customs_tva NUMERIC := 0;
    v_customs_subtotal NUMERIC := 0;
    v_customs_per_unit NUMERIC := 0;

    v_margin_security NUMERIC;
    v_total_ht NUMERIC;
    v_tva_rate NUMERIC := 0.081;
    v_tva_amount NUMERIC;
    v_total_ttc NUMERIC;

    v_customs_fee_admin NUMERIC;
    v_customs_fee_position NUMERIC;
    v_customs_fee_droits_rate NUMERIC;
    v_customs_fee_droits_min NUMERIC;
    v_customs_fee_tva_rate NUMERIC;
    v_customs_fee_tva_min NUMERIC;
BEGIN
    -- Validation: quantity must be at least 1
    IF p_quantity < 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La quantité doit être au moins 1'
        );
    END IF;

    -- 1. Find matching rate based on dimensions and weight
    SELECT *
    INTO v_rate
    FROM logistics_rates
    WHERE provider_id = p_provider_id
      AND is_active = TRUE
      AND length_cm >= p_length_cm
      AND width_cm >= p_width_cm
      AND height_cm >= p_height_cm
      AND (weight_max_kg IS NULL OR weight_max_kg >= p_weight_kg)
      AND (p_carrier IS NULL OR carrier = p_carrier)
      AND (p_mode IS NULL OR mode = p_mode)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- If no matching rate found
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Aucun format disponible pour ces dimensions/poids',
            'details', json_build_object(
                'length_cm', p_length_cm,
                'width_cm', p_width_cm,
                'height_cm', p_height_cm,
                'weight_kg', p_weight_kg,
                'carrier', p_carrier,
                'mode', p_mode
            )
        );
    END IF;

    -- 2. Calculate transport costs
    v_transport_cost := v_rate.price_transport;
    v_reception_cost := v_rate.price_reception;
    v_prep_cost := v_rate.price_prep;
    v_transport_subtotal := v_transport_cost + v_reception_cost + v_prep_cost;

    -- 3. Calculate customs costs (if imported)
    IF p_is_imported THEN
        -- Get customs fees from customs_fees table (provider = 'pesa')
        SELECT value INTO v_customs_fee_admin
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'admin_base' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_position
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'position_supp' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_droits_rate
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_taux' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_droits_min
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_droits_min' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_tva_rate
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_taux' AND is_active = TRUE;

        SELECT value INTO v_customs_fee_tva_min
        FROM customs_fees
        WHERE provider_id = 'pesa' AND fee_type = 'gestion_tva_min' AND is_active = TRUE;

        -- Admin base (always 1 position now)
        v_customs_admin := COALESCE(v_customs_fee_admin, 80);

        -- No additional positions (always 1 position)
        v_customs_positions := 0;

        -- Gestion droits (with minimum)
        v_customs_droits := GREATEST(
            p_merchandise_value * COALESCE(v_customs_fee_droits_rate, 0.035),
            COALESCE(v_customs_fee_droits_min, 5)
        );

        -- Gestion TVA (with minimum)
        v_customs_tva := GREATEST(
            p_merchandise_value * COALESCE(v_customs_fee_tva_rate, 0.025),
            COALESCE(v_customs_fee_tva_min, 5)
        );

        -- Total customs for all items
        v_customs_subtotal := v_customs_admin + v_customs_positions + v_customs_droits + v_customs_tva;

        -- Customs cost per unit
        v_customs_per_unit := v_customs_subtotal / p_quantity;
    END IF;

    -- 4. Calculate margin (10% on transport + customs per unit)
    v_margin_security := (v_transport_subtotal + v_customs_per_unit) * 0.10;

    -- 5. Calculate totals per unit
    v_total_ht := v_transport_subtotal + v_customs_per_unit + v_margin_security;
    v_tva_amount := v_total_ht * v_tva_rate;
    v_total_ttc := v_total_ht + v_tva_amount;

    -- 6. Return structured result
    RETURN json_build_object(
        'success', true,
        'rate', json_build_object(
            'rate_id', v_rate.rate_id,
            'format_label', v_rate.format_label,
            'carrier', v_rate.carrier,
            'mode', v_rate.mode,
            'dimensions_cm', json_build_object(
                'length', v_rate.length_cm,
                'width', v_rate.width_cm,
                'height', v_rate.height_cm
            ),
            'weight_max_kg', v_rate.weight_max_kg
        ),
        'costs', json_build_object(
            'transport', json_build_object(
                'price_transport', v_transport_cost,
                'price_reception', v_reception_cost,
                'price_prep', v_prep_cost,
                'subtotal', v_transport_subtotal
            ),
            'customs', json_build_object(
                'admin_base', v_customs_admin,
                'positions_supp', v_customs_positions,
                'gestion_droits', v_customs_droits,
                'gestion_tva', v_customs_tva,
                'subtotal', v_customs_subtotal,
                'per_unit', v_customs_per_unit,
                'quantity', p_quantity
            ),
            'margin_security', v_margin_security,
            'total_ht', v_total_ht,
            'tva_rate', v_tva_rate,
            'tva_amount', v_tva_amount,
            'total_ttc', v_total_ttc
        )
    );
END;
$$;


ALTER FUNCTION "public"."calculate_logistics_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_is_imported" boolean, "p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_logistics_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_is_imported" boolean, "p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") IS 'Calcule les coûts logistiques totaux par unité (transport + douane/quantité + marge + TVA).
Paramètres: dimensions, poids, transporteur, mode, import, quantité, valeur marchandise.
Les frais de douane sont toujours pour 1 position et divisés par la quantité.';



CREATE OR REPLACE FUNCTION "public"."calculate_pallet_requirements"("p_quantity" integer, "p_product_length_cm" numeric, "p_product_width_cm" numeric, "p_product_height_cm" numeric, "p_product_weight_kg" numeric, "p_pallet_format_id" "text" DEFAULT 'euro'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_pallet_length NUMERIC;
    v_pallet_width NUMERIC;
    v_pallet_height NUMERIC;
    v_pallet_physical_height NUMERIC;
    v_available_height NUMERIC;
    v_pallet_max_weight NUMERIC;
    v_products_per_layer INT;
    v_layers_per_pallet INT;
    v_products_per_pallet INT;
    v_pallets_needed INT;
    v_weight_limited_products INT;
    v_final_products_per_pallet INT;
    v_total_products_shipped INT;
    v_product_loss INT;
    v_pallet_format_name TEXT;
    -- Track orientation used
    v_orientation_used INT := 1;
    v_base_length NUMERIC;
    v_base_width NUMERIC;
    v_stack_height NUMERIC;
BEGIN
    -- Get pallet dimensions
    SELECT
        length_cm,
        width_cm,
        height_cm,
        COALESCE(pallet_height_cm, 15.2),
        max_weight_kg,
        format_name
    INTO
        v_pallet_length,
        v_pallet_width,
        v_pallet_height,
        v_pallet_physical_height,
        v_pallet_max_weight,
        v_pallet_format_name
    FROM pallet_formats
    WHERE pallet_format_id = p_pallet_format_id;

    -- If pallet format not found, use euro palette as default
    IF v_pallet_length IS NULL THEN
        SELECT
            length_cm,
            width_cm,
            height_cm,
            COALESCE(pallet_height_cm, 15.2),
            max_weight_kg,
            format_name
        INTO
            v_pallet_length,
            v_pallet_width,
            v_pallet_height,
            v_pallet_physical_height,
            v_pallet_max_weight,
            v_pallet_format_name
        FROM pallet_formats
        WHERE is_default = true
        LIMIT 1;
    END IF;

    -- Calculate available height for products (total height - pallet height)
    v_available_height := v_pallet_height - v_pallet_physical_height;

    -- Test all 3D orientations to maximize pallet capacity
    DECLARE
        v_orientation_capacity INT;
        v_orientation_per_layer INT;
        v_orientation_layers INT;
        v_best_capacity INT := 0;
    BEGIN
        -- Orientation 1: length×width base, height stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_length_cm) * FLOOR(v_pallet_width / p_product_width_cm),
            FLOOR(v_pallet_length / p_product_width_cm) * FLOOR(v_pallet_width / p_product_length_cm)
        );
        v_orientation_layers := FLOOR(v_available_height / p_product_height_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
            v_orientation_used := 1;
            v_base_length := p_product_length_cm;
            v_base_width := p_product_width_cm;
            v_stack_height := p_product_height_cm;
        END IF;

        -- Orientation 2: length×height base, width stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_length_cm) * FLOOR(v_pallet_width / p_product_height_cm),
            FLOOR(v_pallet_length / p_product_height_cm) * FLOOR(v_pallet_width / p_product_length_cm)
        );
        v_orientation_layers := FLOOR(v_available_height / p_product_width_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
            v_orientation_used := 2;
            v_base_length := p_product_length_cm;
            v_base_width := p_product_height_cm;
            v_stack_height := p_product_width_cm;
        END IF;

        -- Orientation 3: width×height base, length stacked
        v_orientation_per_layer := GREATEST(
            FLOOR(v_pallet_length / p_product_width_cm) * FLOOR(v_pallet_width / p_product_height_cm),
            FLOOR(v_pallet_length / p_product_height_cm) * FLOOR(v_pallet_width / p_product_width_cm)
        );
        v_orientation_layers := FLOOR(v_available_height / p_product_length_cm);
        v_orientation_capacity := v_orientation_per_layer * v_orientation_layers;

        IF v_orientation_capacity > v_best_capacity THEN
            v_best_capacity := v_orientation_capacity;
            v_products_per_layer := v_orientation_per_layer;
            v_layers_per_pallet := v_orientation_layers;
            v_orientation_used := 3;
            v_base_length := p_product_width_cm;
            v_base_width := p_product_height_cm;
            v_stack_height := p_product_length_cm;
        END IF;

        v_products_per_pallet := v_best_capacity;
    END;

    -- Calculate weight limit
    v_weight_limited_products := FLOOR(v_pallet_max_weight / p_product_weight_kg);

    -- Final products per pallet
    v_final_products_per_pallet := LEAST(v_products_per_pallet, v_weight_limited_products);

    -- If no products can fit at all, return error
    IF v_final_products_per_pallet = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Product dimensions or weight exceed pallet capacity'
        );
    END IF;

    -- Calculate number of pallets needed
    v_pallets_needed := CEIL(p_quantity::NUMERIC / v_final_products_per_pallet);

    -- Calculate actual products shipped and potential loss
    v_total_products_shipped := v_pallets_needed * v_final_products_per_pallet;
    v_product_loss := v_total_products_shipped - p_quantity;

    RETURN json_build_object(
        'success', true,
        'pallet_format', json_build_object(
            'id', p_pallet_format_id,
            'name', v_pallet_format_name,
            'dimensions', json_build_object(
                'length_cm', v_pallet_length,
                'width_cm', v_pallet_width,
                'height_cm', v_pallet_height,
                'pallet_height_cm', v_pallet_physical_height,
                'available_height_cm', v_available_height,
                'max_weight_kg', v_pallet_max_weight
            )
        ),
        'calculation', json_build_object(
            'products_per_layer', v_products_per_layer,
            'layers_per_pallet', v_layers_per_pallet,
            'products_per_pallet_dimension', v_products_per_pallet,
            'products_per_pallet_weight', v_weight_limited_products,
            'products_per_pallet_final', v_final_products_per_pallet,
            'pallets_needed', v_pallets_needed,
            'total_products_shipped', v_total_products_shipped,
            'product_loss', v_product_loss,
            'efficiency_percent', ROUND((p_quantity::NUMERIC / v_total_products_shipped * 100)::NUMERIC, 2),
            'orientation_used', v_orientation_used,
            'product_base_length', v_base_length,
            'product_base_width', v_base_width,
            'product_stack_height', v_stack_height
        )
    );
END;
$$;


ALTER FUNCTION "public"."calculate_pallet_requirements"("p_quantity" integer, "p_product_length_cm" numeric, "p_product_width_cm" numeric, "p_product_height_cm" numeric, "p_product_weight_kg" numeric, "p_pallet_format_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_transport_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text" DEFAULT NULL::"text", "p_mode" "text" DEFAULT NULL::"text", "p_provider_id" "text" DEFAULT 'ohmex'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_rate RECORD;
    v_transport_cost NUMERIC;
    v_reception_cost NUMERIC;
    v_prep_cost NUMERIC;
    v_transport_subtotal NUMERIC;
    v_margin_security NUMERIC;
    v_total_ht NUMERIC;
    v_tva_rate NUMERIC := 0.081;
    v_tva_amount NUMERIC;
    v_total_ttc NUMERIC;
BEGIN
    -- Find matching rate based on dimensions and weight
    SELECT *
    INTO v_rate
    FROM logistics_rates
    WHERE provider_id = p_provider_id
      AND is_active = TRUE
      AND length_cm >= p_length_cm
      AND width_cm >= p_width_cm
      AND height_cm >= p_height_cm
      AND (weight_max_kg IS NULL OR weight_max_kg >= p_weight_kg)
      AND (p_carrier IS NULL OR carrier = p_carrier)
      AND (p_mode IS NULL OR mode = p_mode)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- If no matching rate found
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Aucun format disponible pour ces dimensions/poids'
        );
    END IF;

    -- Calculate transport costs
    v_transport_cost := v_rate.price_transport;
    v_reception_cost := v_rate.price_reception;
    v_prep_cost := v_rate.price_prep;
    v_transport_subtotal := v_transport_cost + v_reception_cost + v_prep_cost;

    -- Calculate margin (10% on transport only)
    v_margin_security := v_transport_subtotal * 0.10;

    -- Calculate totals
    v_total_ht := v_transport_subtotal + v_margin_security;
    v_tva_amount := v_total_ht * v_tva_rate;
    v_total_ttc := v_total_ht + v_tva_amount;

    -- Return structured result
    RETURN json_build_object(
        'success', true,
        'rate', json_build_object(
            'rate_id', v_rate.rate_id,
            'format_label', v_rate.format_label,
            'carrier', v_rate.carrier,
            'mode', v_rate.mode,
            'dimensions_cm', json_build_object(
                'length', v_rate.length_cm,
                'width', v_rate.width_cm,
                'height', v_rate.height_cm
            ),
            'weight_max_kg', v_rate.weight_max_kg
        ),
        'costs', json_build_object(
            'transport', json_build_object(
                'price_transport', v_transport_cost,
                'price_reception', v_reception_cost,
                'price_prep', v_prep_cost,
                'subtotal', v_transport_subtotal
            ),
            'margin_security', v_margin_security,
            'total_ht', v_total_ht,
            'tva_rate', v_tva_rate,
            'tva_amount', v_tva_amount,
            'total_ttc', v_total_ttc
        )
    );
END;
$$;


ALTER FUNCTION "public"."calculate_transport_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_transport_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text") IS 'Calcule uniquement les coûts de transport (sans douane).
Paramètres: dimensions, poids, transporteur, mode.
Retourne: transport + réception + préparation + marge 10% + TVA 8.1%';



CREATE OR REPLACE FUNCTION "public"."calculate_transport_cost_with_optimization"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text" DEFAULT 'dhl'::"text", "p_mode" "text" DEFAULT 'standard'::"text", "p_provider_id" "text" DEFAULT 'ohmex'::"text", "p_quantity" integer DEFAULT 1, "p_pallet_format_id" "text" DEFAULT 'euro'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_price_transport NUMERIC := 0;
    v_price_reception NUMERIC := 0;
    v_price_prep NUMERIC := 0;
    v_transport_subtotal NUMERIC := 0;
    v_margin_rate NUMERIC := 0.10;
    v_tva_rate NUMERIC := 0.081;
    v_transport_margin NUMERIC := 0;
    v_transport_tva NUMERIC := 0;
    v_transport_total NUMERIC := 0;
    v_transport_per_unit NUMERIC := 0;
    v_pallet_calc JSON;
    v_optimization JSON;
    v_pallets_needed INT := 0;
    v_carrier TEXT;
    v_mode TEXT;
    v_format_label TEXT;
    v_container_length NUMERIC;
    v_container_width NUMERIC;
    v_container_height NUMERIC;
    v_delivery_options JSON[];
    v_option_record RECORD;
BEGIN
    -- Find the best matching rate
    SELECT
        price_transport,
        price_reception,
        price_prep,
        carrier,
        mode,
        format_label,
        length_cm,
        width_cm,
        height_cm
    INTO
        v_price_transport,
        v_price_reception,
        v_price_prep,
        v_carrier,
        v_mode,
        v_format_label,
        v_container_length,
        v_container_width,
        v_container_height
    FROM logistics_rates
    WHERE provider_id = p_provider_id
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_mode IS NULL OR mode = p_mode)
    AND p_length_cm <= length_cm
    AND p_width_cm <= width_cm
    AND p_height_cm <= height_cm
    AND (weight_max_kg IS NULL OR p_weight_kg <= weight_max_kg)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- Default prices if no rate found
    IF v_price_transport IS NULL THEN
        v_price_transport := 50;
        v_price_reception := 0.50;
        v_price_prep := 2.50;
        v_carrier := COALESCE(p_carrier, 'default');
        v_mode := COALESCE(p_mode, 'standard');
        v_format_label := 'Format par défaut';
        v_container_length := NULL;
        v_container_width := NULL;
        v_container_height := NULL;
        v_delivery_options := ARRAY[]::JSON[];
    ELSE
        -- Find all delivery options for the same container dimensions
        v_delivery_options := ARRAY[]::JSON[];
        FOR v_option_record IN
            SELECT
                carrier,
                mode,
                format_label as option_format_label,
                price_transport,
                price_reception,
                price_prep,
                (price_transport + price_reception + price_prep) as base_cost
            FROM logistics_rates
            WHERE provider_id = p_provider_id
            AND length_cm = v_container_length
            AND width_cm = v_container_width
            AND height_cm = v_container_height
            ORDER BY (price_transport + price_reception + price_prep) ASC
        LOOP
            DECLARE
                v_opt_base NUMERIC;
                v_opt_margin NUMERIC;
                v_opt_tva NUMERIC;
                v_opt_total NUMERIC;
            BEGIN
                v_opt_base := v_option_record.base_cost;
                v_opt_margin := v_opt_base * v_margin_rate;
                v_opt_tva := (v_opt_base + v_opt_margin) * v_tva_rate;
                v_opt_total := v_opt_base + v_opt_margin + v_opt_tva;

                v_delivery_options := array_append(v_delivery_options, json_build_object(
                    'carrier', v_option_record.carrier,
                    'mode', v_option_record.mode,
                    'format_label', v_option_record.option_format_label,
                    'base', v_opt_base,
                    'margin', v_opt_margin,
                    'tva', v_opt_tva,
                    'total', v_opt_total,
                    'per_unit', v_opt_total / p_quantity,
                    'is_selected', v_option_record.carrier = v_carrier AND v_option_record.mode = v_mode
                ));
            END;
        END LOOP;
    END IF;

    -- Calculate pallet requirements (for supplier quantity)
    v_pallet_calc := calculate_pallet_requirements(
        p_quantity,
        p_length_cm,
        p_width_cm,
        p_height_cm,
        p_weight_kg,
        p_pallet_format_id
    );

    -- Extract pallets needed
    IF (v_pallet_calc->>'success')::BOOLEAN THEN
        v_pallets_needed := (v_pallet_calc->'calculation'->>'pallets_needed')::INT;
    END IF;

    -- Calculate transport cost for supplier quantity
    v_transport_subtotal := v_price_transport + v_price_reception + v_price_prep;
    v_transport_margin := v_transport_subtotal * v_margin_rate;
    v_transport_tva := (v_transport_subtotal + v_transport_margin) * v_tva_rate;
    v_transport_total := v_transport_subtotal + v_transport_margin + v_transport_tva;
    v_transport_per_unit := v_transport_total / p_quantity;

    -- Calculate customer transport optimization (for small quantities 1-10)
    BEGIN
        v_optimization := calculate_customer_transport_optimization(
            p_height_cm,
            p_length_cm,
            p_width_cm,
            p_weight_kg,
            p_provider_id
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_optimization := NULL;
    END;

    RETURN json_build_object(
        'success', true,
        'costs', json_build_object(
            'transport', json_build_object(
                'base', v_transport_subtotal,
                'margin', v_transport_margin,
                'tva', v_transport_tva,
                'subtotal', v_transport_total,
                'per_unit', v_transport_per_unit,
                'carrier', v_carrier,
                'mode', v_mode,
                'format_label', v_format_label,
                'container_dimensions', json_build_object(
                    'length_cm', v_container_length,
                    'width_cm', v_container_width,
                    'height_cm', v_container_height
                )
            ),
            'total_per_unit', v_transport_per_unit,
            'delivery_options', array_to_json(v_delivery_options)
        ),
        'pallet_info', v_pallet_calc,
        'customer_optimization', v_optimization,
        'quantity', p_quantity,
        'provider_id', p_provider_id
    );
END;
$$;


ALTER FUNCTION "public"."calculate_transport_cost_with_optimization"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_transport_cost_with_pallets"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text" DEFAULT 'dhl'::"text", "p_mode" "text" DEFAULT 'standard'::"text", "p_provider_id" "text" DEFAULT 'ohmex'::"text", "p_quantity" integer DEFAULT 1, "p_pallet_format_id" "text" DEFAULT 'euro'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_price_transport NUMERIC := 0;
    v_price_reception NUMERIC := 0;
    v_price_prep NUMERIC := 0;
    v_transport_subtotal NUMERIC := 0;
    v_margin_rate NUMERIC := 0.10;
    v_tva_rate NUMERIC := 0.081;
    v_transport_margin NUMERIC := 0;
    v_transport_tva NUMERIC := 0;
    v_transport_total NUMERIC := 0;
    v_transport_per_unit NUMERIC := 0;
    v_pallet_calc JSON;
    v_pallets_needed INT := 0;
    v_carrier TEXT;
    v_mode TEXT;
BEGIN
    -- Find the best matching rate
    SELECT
        price_transport,
        price_reception,
        price_prep,
        carrier,
        mode
    INTO
        v_price_transport,
        v_price_reception,
        v_price_prep,
        v_carrier,
        v_mode
    FROM logistics_rates
    WHERE provider_id = p_provider_id
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_mode IS NULL OR mode = p_mode)
    AND p_length_cm <= length_cm
    AND p_width_cm <= width_cm
    AND p_height_cm <= height_cm
    AND (weight_max_kg IS NULL OR p_weight_kg <= weight_max_kg)
    ORDER BY
        (length_cm * width_cm * height_cm) ASC,
        price_transport ASC
    LIMIT 1;

    -- Default prices if no rate found
    IF v_price_transport IS NULL THEN
        v_price_transport := 50;
        v_price_reception := 0.50;
        v_price_prep := 2.50;
        v_carrier := COALESCE(p_carrier, 'default');
        v_mode := COALESCE(p_mode, 'standard');
    END IF;

    -- Calculate pallet requirements
    v_pallet_calc := calculate_pallet_requirements(
        p_quantity,
        p_length_cm,
        p_width_cm,
        p_height_cm,
        p_weight_kg,
        p_pallet_format_id
    );

    -- Extract pallets needed
    IF (v_pallet_calc->>'success')::BOOLEAN THEN
        v_pallets_needed := (v_pallet_calc->'calculation'->>'pallets_needed')::INT;
    ELSE
        -- If pallet calculation failed, return the error
        RETURN v_pallet_calc;
    END IF;

    -- Calculate transport cost (total for all pallets/shipment)
    v_transport_subtotal := v_price_transport + v_price_reception + v_price_prep;
    v_transport_margin := v_transport_subtotal * v_margin_rate;
    v_transport_tva := (v_transport_subtotal + v_transport_margin) * v_tva_rate;
    v_transport_total := v_transport_subtotal + v_transport_margin + v_transport_tva;

    -- Per unit cost based on actual quantity ordered
    v_transport_per_unit := v_transport_total / p_quantity;

    RETURN json_build_object(
        'success', true,
        'costs', json_build_object(
            'transport', json_build_object(
                'base', v_transport_subtotal,
                'margin', v_transport_margin,
                'tva', v_transport_tva,
                'subtotal', v_transport_total,
                'per_unit', v_transport_per_unit,
                'carrier', v_carrier,
                'mode', v_mode
            ),
            'total_per_unit', v_transport_per_unit
        ),
        'pallet_info', v_pallet_calc,
        'quantity', p_quantity,
        'provider_id', p_provider_id
    );
END;
$$;


ALTER FUNCTION "public"."calculate_transport_cost_with_pallets"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_customs_fees_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_customs_fees_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_customs_providers_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_customs_providers_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_logistics_providers_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_logistics_providers_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_logistics_rates_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_logistics_rates_update"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customs_fees" (
    "fee_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "fee_type" "text" NOT NULL,
    "value" numeric NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customs_fees" OWNER TO "postgres";


COMMENT ON TABLE "public"."customs_fees" IS 'Grille tarifaire des frais douaniers par prestataire';



COMMENT ON COLUMN "public"."customs_fees"."fee_type" IS 'Type: admin_base, position_supp, gestion_droits_taux, gestion_droits_min, gestion_tva_taux, gestion_tva_min';



CREATE TABLE IF NOT EXISTS "public"."customs_providers" (
    "provider_id" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customs_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customs_providers" IS 'Liste des prestataires de services douaniers (PESA, etc.)';



CREATE TABLE IF NOT EXISTS "public"."logistics_calculations" (
    "calculation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "length_cm" numeric NOT NULL,
    "width_cm" numeric NOT NULL,
    "height_cm" numeric NOT NULL,
    "weight_kg" numeric NOT NULL,
    "is_imported" boolean DEFAULT false NOT NULL,
    "nb_customs_positions" integer,
    "merchandise_value" numeric,
    "rate_id" "uuid",
    "transport_cost" numeric NOT NULL,
    "customs_cost" numeric DEFAULT 0 NOT NULL,
    "total_ht" numeric NOT NULL,
    "total_ttc" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logistics_calculations" OWNER TO "postgres";


COMMENT ON TABLE "public"."logistics_calculations" IS 'Historique des calculs de frais logistiques (optionnel)';



CREATE TABLE IF NOT EXISTS "public"."logistics_providers" (
    "provider_id" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logistics_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."logistics_providers" IS 'Liste des prestataires logistiques (Ohmex, Planzer, La Poste, etc.)';



CREATE TABLE IF NOT EXISTS "public"."logistics_rates" (
    "rate_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "text" NOT NULL,
    "format_label" "text" NOT NULL,
    "carrier" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "length_cm" numeric NOT NULL,
    "width_cm" numeric NOT NULL,
    "height_cm" numeric NOT NULL,
    "weight_max_kg" numeric,
    "price_transport" numeric NOT NULL,
    "price_reception" numeric DEFAULT 0.50 NOT NULL,
    "price_prep" numeric DEFAULT 2.50 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logistics_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."logistics_rates" IS 'Grille tarifaire complète des formats de colis avec dimensions et prix';



COMMENT ON COLUMN "public"."logistics_rates"."format_label" IS 'Label du format (ex: "B5 - 2 cm - Sans signature")';



COMMENT ON COLUMN "public"."logistics_rates"."carrier" IS 'Transporteur: La Poste, Planzer, etc.';



COMMENT ON COLUMN "public"."logistics_rates"."mode" IS 'Mode: Sans signature, Avec suivi, Avec signature';



CREATE TABLE IF NOT EXISTS "public"."pallet_formats" (
    "pallet_format_id" "text" NOT NULL,
    "format_name" "text" NOT NULL,
    "length_cm" numeric NOT NULL,
    "width_cm" numeric NOT NULL,
    "height_cm" numeric NOT NULL,
    "max_weight_kg" numeric NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pallet_height_cm" numeric DEFAULT 15.2,
    CONSTRAINT "pallet_formats_height_cm_check" CHECK (("height_cm" > (0)::numeric)),
    CONSTRAINT "pallet_formats_length_cm_check" CHECK (("length_cm" > (0)::numeric)),
    CONSTRAINT "pallet_formats_max_weight_kg_check" CHECK (("max_weight_kg" > (0)::numeric)),
    CONSTRAINT "pallet_formats_width_cm_check" CHECK (("width_cm" > (0)::numeric))
);


ALTER TABLE "public"."pallet_formats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_formats" (
    "shipping_format_id" "text" NOT NULL,
    "provider_id" "text" NOT NULL,
    "pallet_format_id" "text" NOT NULL,
    "format_name" "text" NOT NULL,
    "max_pallets" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shipping_formats_max_pallets_check" CHECK (("max_pallets" > 0))
);


ALTER TABLE "public"."shipping_formats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."customs_fees"
    ADD CONSTRAINT "customs_fees_pkey" PRIMARY KEY ("fee_id");



ALTER TABLE ONLY "public"."customs_providers"
    ADD CONSTRAINT "customs_providers_pkey" PRIMARY KEY ("provider_id");



ALTER TABLE ONLY "public"."logistics_calculations"
    ADD CONSTRAINT "logistics_calculations_pkey" PRIMARY KEY ("calculation_id");



ALTER TABLE ONLY "public"."logistics_providers"
    ADD CONSTRAINT "logistics_providers_pkey" PRIMARY KEY ("provider_id");



ALTER TABLE ONLY "public"."logistics_rates"
    ADD CONSTRAINT "logistics_rates_pkey" PRIMARY KEY ("rate_id");



ALTER TABLE ONLY "public"."pallet_formats"
    ADD CONSTRAINT "pallet_formats_pkey" PRIMARY KEY ("pallet_format_id");



ALTER TABLE ONLY "public"."shipping_formats"
    ADD CONSTRAINT "shipping_formats_pkey" PRIMARY KEY ("shipping_format_id");



ALTER TABLE ONLY "public"."logistics_rates"
    ADD CONSTRAINT "unique_rate_format" UNIQUE ("provider_id", "format_label", "carrier", "mode");



CREATE INDEX "idx_customs_fees_active" ON "public"."customs_fees" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_customs_fees_provider" ON "public"."customs_fees" USING "btree" ("provider_id");



CREATE INDEX "idx_logistics_calculations_date" ON "public"."logistics_calculations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_logistics_rates_active" ON "public"."logistics_rates" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_logistics_rates_dimensions" ON "public"."logistics_rates" USING "btree" ("length_cm", "width_cm", "height_cm");



CREATE INDEX "idx_logistics_rates_provider" ON "public"."logistics_rates" USING "btree" ("provider_id");



CREATE INDEX "idx_pallet_formats_default" ON "public"."pallet_formats" USING "btree" ("is_default");



CREATE INDEX "idx_shipping_formats_pallet" ON "public"."shipping_formats" USING "btree" ("pallet_format_id");



CREATE INDEX "idx_shipping_formats_provider" ON "public"."shipping_formats" USING "btree" ("provider_id");



CREATE OR REPLACE TRIGGER "on_customs_fees_update" BEFORE UPDATE ON "public"."customs_fees" FOR EACH ROW EXECUTE FUNCTION "public"."handle_customs_fees_update"();



CREATE OR REPLACE TRIGGER "on_customs_providers_update" BEFORE UPDATE ON "public"."customs_providers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_customs_providers_update"();



CREATE OR REPLACE TRIGGER "on_logistics_providers_update" BEFORE UPDATE ON "public"."logistics_providers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_logistics_providers_update"();



CREATE OR REPLACE TRIGGER "on_logistics_rates_update" BEFORE UPDATE ON "public"."logistics_rates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_logistics_rates_update"();



ALTER TABLE ONLY "public"."customs_fees"
    ADD CONSTRAINT "customs_fees_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."customs_providers"("provider_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."logistics_calculations"
    ADD CONSTRAINT "logistics_calculations_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "public"."logistics_rates"("rate_id");



ALTER TABLE ONLY "public"."logistics_rates"
    ADD CONSTRAINT "logistics_rates_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."logistics_providers"("provider_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipping_formats"
    ADD CONSTRAINT "shipping_formats_pallet_format_id_fkey" FOREIGN KEY ("pallet_format_id") REFERENCES "public"."pallet_formats"("pallet_format_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipping_formats"
    ADD CONSTRAINT "shipping_formats_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."logistics_providers"("provider_id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated read access to customs_fees" ON "public"."customs_fees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read access to logistics_rates" ON "public"."logistics_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to delete logistics_rates" ON "public"."logistics_rates" FOR DELETE TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated to delete logistics_rates" ON "public"."logistics_rates" IS 'Utilisateurs authentifiés peuvent supprimer des tarifs (en prod: restreindre aux super admins)';



CREATE POLICY "Allow authenticated to insert logistics_rates" ON "public"."logistics_rates" FOR INSERT TO "authenticated" WITH CHECK (true);



COMMENT ON POLICY "Allow authenticated to insert logistics_rates" ON "public"."logistics_rates" IS 'Utilisateurs authentifiés peuvent ajouter des tarifs (en prod: restreindre aux super admins)';



CREATE POLICY "Allow authenticated to update customs_fees" ON "public"."customs_fees" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to update logistics_rates" ON "public"."logistics_rates" FOR UPDATE TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated to update logistics_rates" ON "public"."logistics_rates" IS 'Utilisateurs authentifiés peuvent modifier des tarifs (en prod: restreindre aux super admins)';



CREATE POLICY "Allow public read access to customs_fees" ON "public"."customs_fees" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to customs_providers" ON "public"."customs_providers" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to logistics_providers" ON "public"."logistics_providers" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to logistics_rates" ON "public"."logistics_rates" FOR SELECT USING (true);



COMMENT ON POLICY "Allow public read access to logistics_rates" ON "public"."logistics_rates" IS 'Permet à tout le monde (y compris anonyme) de lire les tarifs logistiques';



CREATE POLICY "Authenticated users can delete pallet_formats" ON "public"."pallet_formats" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete shipping_formats" ON "public"."shipping_formats" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert pallet_formats" ON "public"."pallet_formats" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert shipping_formats" ON "public"."shipping_formats" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update pallet_formats" ON "public"."pallet_formats" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update shipping_formats" ON "public"."shipping_formats" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Public read access to pallet_formats" ON "public"."pallet_formats" FOR SELECT USING (true);



CREATE POLICY "Public read access to shipping_formats" ON "public"."shipping_formats" FOR SELECT USING (true);



ALTER TABLE "public"."customs_fees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customs_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logistics_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logistics_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pallet_formats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_formats" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."calculate_customer_transport_optimization"("p_height_cm" numeric, "p_length_cm" numeric, "p_width_cm" numeric, "p_weight_kg" numeric, "p_provider_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_customer_transport_optimization"("p_height_cm" numeric, "p_length_cm" numeric, "p_width_cm" numeric, "p_weight_kg" numeric, "p_provider_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_customer_transport_optimization"("p_height_cm" numeric, "p_length_cm" numeric, "p_width_cm" numeric, "p_weight_kg" numeric, "p_provider_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_customs_cost"("p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_customs_cost"("p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_customs_cost"("p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_logistics_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_is_imported" boolean, "p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_logistics_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_is_imported" boolean, "p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_logistics_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_is_imported" boolean, "p_quantity" integer, "p_merchandise_value" numeric, "p_provider_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_pallet_requirements"("p_quantity" integer, "p_product_length_cm" numeric, "p_product_width_cm" numeric, "p_product_height_cm" numeric, "p_product_weight_kg" numeric, "p_pallet_format_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_pallet_requirements"("p_quantity" integer, "p_product_length_cm" numeric, "p_product_width_cm" numeric, "p_product_height_cm" numeric, "p_product_weight_kg" numeric, "p_pallet_format_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_pallet_requirements"("p_quantity" integer, "p_product_length_cm" numeric, "p_product_width_cm" numeric, "p_product_height_cm" numeric, "p_product_weight_kg" numeric, "p_pallet_format_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_transport_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_transport_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_transport_cost"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_transport_cost_with_optimization"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_transport_cost_with_optimization"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_transport_cost_with_optimization"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_transport_cost_with_pallets"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_transport_cost_with_pallets"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_transport_cost_with_pallets"("p_length_cm" numeric, "p_width_cm" numeric, "p_height_cm" numeric, "p_weight_kg" numeric, "p_carrier" "text", "p_mode" "text", "p_provider_id" "text", "p_quantity" integer, "p_pallet_format_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_customs_fees_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_customs_fees_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_customs_fees_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_customs_providers_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_customs_providers_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_customs_providers_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_logistics_providers_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_logistics_providers_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_logistics_providers_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_logistics_rates_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_logistics_rates_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_logistics_rates_update"() TO "service_role";


















GRANT ALL ON TABLE "public"."customs_fees" TO "anon";
GRANT ALL ON TABLE "public"."customs_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_fees" TO "service_role";



GRANT ALL ON TABLE "public"."customs_providers" TO "anon";
GRANT ALL ON TABLE "public"."customs_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_providers" TO "service_role";



GRANT ALL ON TABLE "public"."logistics_calculations" TO "anon";
GRANT ALL ON TABLE "public"."logistics_calculations" TO "authenticated";
GRANT ALL ON TABLE "public"."logistics_calculations" TO "service_role";



GRANT ALL ON TABLE "public"."logistics_providers" TO "anon";
GRANT ALL ON TABLE "public"."logistics_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."logistics_providers" TO "service_role";



GRANT ALL ON TABLE "public"."logistics_rates" TO "anon";
GRANT ALL ON TABLE "public"."logistics_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."logistics_rates" TO "service_role";



GRANT ALL ON TABLE "public"."pallet_formats" TO "anon";
GRANT ALL ON TABLE "public"."pallet_formats" TO "authenticated";
GRANT ALL ON TABLE "public"."pallet_formats" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_formats" TO "anon";
GRANT ALL ON TABLE "public"."shipping_formats" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_formats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict eyVu08hg8aO3ONseegrUHrE6QXjhHrp8InEf5IWehiIEybJ5XZ83H8bSjG7pxcJ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: customs_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customs_providers" ("provider_id", "provider_name", "is_active", "created_at", "updated_at") VALUES
	('pesa', 'PESA Global', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00');


--
-- Data for Name: customs_fees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customs_fees" ("fee_id", "provider_id", "fee_type", "value", "description", "is_active", "created_at", "updated_at") VALUES
	('762ea917-7435-49b2-bba9-e714427e2922', 'pesa', 'admin_base', 80.00, 'Frais administratifs de base par envoi (Formalités 70 + E.dec 10)', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('b435b52d-1b61-4905-9742-d0401b2d627f', 'pesa', 'position_supp', 8.00, 'Coût par position douanière supplémentaire (dès la 3ème)', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('9639f3d4-625d-47f0-b20e-2f028faaa098', 'pesa', 'gestion_droits_taux', 0.035, 'Taux de gestion sur les droits de douane (3.5%)', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('756b08b7-cf43-4ce2-89d5-ab8f65620f01', 'pesa', 'gestion_droits_min', 5.00, 'Minimum de perception pour la gestion des droits de douane (CHF)', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('4ada0e94-ded7-4200-a935-26a954a30336', 'pesa', 'gestion_tva_taux', 0.025, 'Taux de gestion sur la TVA d''import (2.5%)', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('28ca5a55-3102-4574-9947-d9b56472d2e2', 'pesa', 'gestion_tva_min', 5.00, 'Minimum de perception pour la gestion de la TVA (CHF)', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00');


--
-- Data for Name: logistics_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."logistics_providers" ("provider_id", "provider_name", "is_active", "created_at", "updated_at") VALUES
	('ohmex', 'Ohmex SA', true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00');


--
-- Data for Name: logistics_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."logistics_rates" ("rate_id", "provider_id", "format_label", "carrier", "mode", "length_cm", "width_cm", "height_cm", "weight_max_kg", "price_transport", "price_reception", "price_prep", "is_default", "is_active", "created_at", "updated_at") VALUES
	('48b44e37-f24a-4bee-9744-09f52cb44aa5', 'ohmex', 'B5 - 2 cm - Sans signature', 'La Poste', 'Sans signature', 25, 17.6, 2, 0.5, 3.00, 0.50, 2.50, false, true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('6a49af2f-5103-4b62-9aec-c7c01dc6c37e', 'ohmex', 'B5 - 2 cm - Avec suivi', 'La Poste', 'Avec suivi', 25, 17.6, 2, 0.5, 4.50, 0.50, 2.50, false, true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('9f6c3e33-2d56-4385-b554-f8d920bb4ed4', 'ohmex', 'B5 - 5 cm - Sans signature', 'La Poste', 'Sans signature', 25, 17.6, 5, 0.5, 5.00, 0.50, 2.50, false, true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('8e6ed163-5457-441e-bd48-530907faaf7a', 'ohmex', 'B5 - 5 cm - Avec suivi', 'La Poste', 'Avec suivi', 25, 17.6, 5, 0.5, 6.50, 0.50, 2.50, false, true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.112505+00'),
	('9efba5b4-f8cf-4f24-9ec5-1e1cf464c5bf', 'ohmex', '60x60x100 cm - Sans signature', 'Planzer', 'Sans signature', 60, 60, 100, 30.0, 8.50, 0.50, 2.50, true, true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.135583+00'),
	('39ef60aa-3242-408f-83b2-f9fa7f998210', 'ohmex', '60x60x100 cm - Avec signature', 'Planzer', 'Avec signature', 60, 60, 100, 30.0, 9.50, 0.50, 2.50, false, true, '2025-10-24 15:45:09.112505+00', '2025-10-24 15:45:09.135583+00');


--
-- Data for Name: logistics_calculations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pallet_formats; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pallet_formats" ("pallet_format_id", "format_name", "length_cm", "width_cm", "height_cm", "max_weight_kg", "is_default", "created_at", "updated_at", "pallet_height_cm") VALUES
	('euro', 'Euro Palette', 120, 80, 200, 1000, true, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00', 15.2);


--
-- Data for Name: shipping_formats; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."shipping_formats" ("shipping_format_id", "provider_id", "pallet_format_id", "format_name", "max_pallets", "created_at", "updated_at") VALUES
	('ohmex_half_pallet', 'ohmex', 'euro', 'Demi Palette', 1, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00'),
	('ohmex_1_pallet', 'ohmex', 'euro', '1 Palette', 1, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00'),
	('ohmex_2_pallets', 'ohmex', 'euro', '2 Palettes', 2, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00'),
	('ohmex_groupage', 'ohmex', 'euro', 'Groupage', 6, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00'),
	('ohmex_full_truck', 'ohmex', 'euro', 'Full Truck', 33, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00'),
	('ohmex_full_truck_xl', 'ohmex', 'euro', 'Full Truck XL', 66, '2025-10-24 15:45:09.123443+00', '2025-10-24 15:45:09.123443+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict eyVu08hg8aO3ONseegrUHrE6QXjhHrp8InEf5IWehiIEybJ5XZ83H8bSjG7pxcJ

RESET ALL;

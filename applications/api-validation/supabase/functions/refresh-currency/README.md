# 💱 Currency Refresh Edge Function

Rafraîchit automatiquement les taux de change **EUR/USD/GBP → CHF** une fois par jour à **2h du matin**.

## 📋 Résumé

| Paramètre | Valeur |
|-----------|--------|
| **Source** | Frankfurter API (Taux BCE gratuits) |
| **Paires** | EUR→CHF, USD→CHF, GBP→CHF |
| **Fréquence** | 1x par jour à 2:00 AM UTC |
| **Scheduler** | pg_cron (Supabase Pro) |
| **Table** | `currency_change` |

---

## 🚀 Déploiement

### 1️⃣ Déployer l'Edge Function

```bash
# Depuis le dossier odl-tools
cd ~/Desktop/odl-projects/odl-tools

# Login Supabase CLI
supabase login

# Link au projet
supabase link --project-ref xewnzetqvrovqjcvwkus

# Déployer la fonction
supabase functions deploy refresh-currency

# Vérifier le déploiement
supabase functions list
```

### 2️⃣ Appliquer la Migration pg_cron

```bash
# Via Supabase CLI
supabase db push

# OU via SQL Editor (Dashboard Supabase)
# Copier/coller le contenu de:
# supabase/migrations/20251025000000_setup_currency_refresh_cron.sql
```

### 3️⃣ Tester l'Edge Function

```bash
# Test manuel via curl
curl -X POST \
  https://xewnzetqvrovqjcvwkus.supabase.co/functions/v1/refresh-currency \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Retour attendu:
{
  "success": true,
  "timestamp": "2025-10-25T14:30:00Z",
  "rates": {
    "EUR→CHF": 1.075,
    "USD→CHF": 0.912,
    "GBP→CHF": 1.251
  }
}
```

### 4️⃣ Tester via SQL

```sql
-- Déclencher refresh manuellement
SELECT trigger_currency_refresh();

-- Vérifier derniers taux
SELECT * FROM get_last_currency_refresh();

-- Résultat:
-- base | quote | rate  | fetched_at           | age_hours
-- EUR  | CHF   | 1.075 | 2025-10-25 02:00:00  | 0.5
-- USD  | CHF   | 0.912 | 2025-10-25 02:00:00  | 0.5
-- GBP  | CHF   | 1.251 | 2025-10-25 02:00:00  | 0.5
```

---

## 🔍 Vérification Cron Job

```sql
-- Voir tous les cron jobs
SELECT * FROM cron.job;

-- Voir historique d'exécution
SELECT
  jobid,
  runid,
  job_name,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- Voir prochaine exécution
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname = 'refresh-currency-daily';
```

---

## 🛠️ Maintenance

### Désactiver le Cron

```sql
SELECT cron.unschedule('refresh-currency-daily');
```

### Réactiver le Cron

```sql
SELECT cron.schedule(
  'refresh-currency-daily',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url := 'https://xewnzetqvrovqjcvwkus.supabase.co/functions/v1/refresh-currency',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
      )
    );
  $$
);
```

### Changer l'heure d'exécution

```sql
-- Exemple: exécuter à 3h du matin au lieu de 2h
SELECT cron.unschedule('refresh-currency-daily');
SELECT cron.schedule(
  'refresh-currency-daily',
  '0 3 * * *',  -- Minute Hour Day Month Weekday
  $$ ... $$
);
```

---

## 📊 Usage dans les Fonctions SQL

```sql
-- Exemple: Conversion EUR → CHF
CREATE OR REPLACE FUNCTION convert_to_chf(
  p_amount NUMERIC,
  p_currency TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  IF p_currency = 'CHF' THEN
    RETURN p_amount;
  END IF;

  -- Récupère le taux le plus récent
  SELECT rate INTO v_rate
  FROM currency_change
  WHERE base = p_currency
    AND quote = 'CHF'
  ORDER BY fetched_at DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Currency rate not available for %', p_currency;
  END IF;

  RETURN p_amount * v_rate;
END;
$$;

-- Test
SELECT convert_to_chf(100, 'EUR');  -- Retourne ~107.50 CHF
```

---

## ⚠️ Prérequis

- **Supabase Pro Plan** (pg_cron uniquement disponible sur Pro)
- **Extension pg_cron** activée (fait automatiquement par migration)
- **Accès internet** depuis Supabase (pour API Frankfurter)

---

## 🆘 Troubleshooting

### Problème: Cron ne s'exécute pas

```sql
-- Vérifier si pg_cron est activé
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Vérifier les logs cron
SELECT * FROM cron.job_run_details
WHERE job_name = 'refresh-currency-daily'
ORDER BY start_time DESC
LIMIT 5;
```

### Problème: Rates trop anciens

```sql
-- Vérifier l'âge des taux
SELECT * FROM get_last_currency_refresh();

-- Si age_hours > 24, déclencher refresh manuel
SELECT trigger_currency_refresh();
```

### Problème: Edge Function timeout

La fonction Frankfurter API peut parfois être lente. Le timeout par défaut est 10s.
Si nécessaire, augmenter dans les settings Supabase Dashboard.

---

## 📚 Liens Utiles

- [Frankfurter API Docs](https://www.frankfurter.app/docs/)
- [Supabase pg_cron Guide](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Dernière mise à jour:** 25 octobre 2025

# Migration Interdependencies - API Validation

## Session Context (2025-10-27)

Cette session a corrigé plusieurs problèmes critiques liés aux migrations de l'API de validation, notamment :
- Filtrage des réponses pour masquer les coûts internes aux fournisseurs
- Intégration du calculateur de transport dynamique
- Correction du type de données pour `subcategory_id`
- Restauration de l'INSERT en base de données

## 🔗 Chaîne de Dépendances des Migrations

### Phase 1: Migrations de Base (Déjà en Production)
- **Migration 07**: `offer_item_calculated_costs` table (subcategory_id défini comme UUID - **ERREUR**)
- **Migration 13**: `validate_and_calculate_item()` function initiale
- **Migration 26-005**: `odl_product_subcategories` table (subcategory_id défini comme TEXT "s22")

### Phase 2: Corrections PESA et Currency (Cette Session)

#### Migration 33: `20251027000033_fix_pesa_and_tar_logic.sql`
**But**: Corriger la logique PESA et TAR
**Changements**:
- Ajout de variables pour PESA fees détaillées
- Correction du calcul TAR
- Lecture correcte des champs `has_battery` au lieu de `contain_battery`

**Dépendances**:
- ✅ Dépend de: Migration 13 (fonction de base)
- ✅ Utilisé par: Toutes les migrations suivantes

**Impact**: 🟢 Fonction fonctionnelle mais hardcoded logistics (12.50 CHF)

---

#### Migration 34: `20251027000034_fix_currency_lookup_critical.sql`
**But**: Corriger la recherche de taux de change
**Changements**:
- Correction de la requête SQL pour `currency_rates`
- Utilisation de `from_currency` et `to_currency` au lieu de `currency_pair`

**Dépendances**:
- ✅ Dépend de: Migration 33
- ⚠️ Suppose que: `currency_rates` a les colonnes correctes

**Impact**: 🟢 Conversion de devises corrigée

---

### Phase 3: Intégration Transport Dynamique

#### Migration 35: `20251027000035_integrate_transport_calculator.sql`
**But**: Remplacer les coûts de logistique hardcodés par le calculateur dynamique
**Changements**:
- Appel de `calculate_transport_cost_with_optimization()`
- Calcul dynamique basé sur dimensions/poids/quantité
- Fallback à 12.50 CHF en cas d'erreur

**Dépendances**:
- ✅ Dépend de: Migration 34
- ✅ Dépend de: `calculate_transport_cost_with_optimization()` function (doit exister)
- ✅ Dépend de: `logistics_rates` table avec données

**Impact**: 🟢 Coûts de transport dynamiques mais **PAS D'INSERT EN BASE**

**⚠️ PROBLÈME INTRODUIT**: L'INSERT INTO `offer_item_calculated_costs` a été supprimé

---

### Phase 4: Tentative de Restauration INSERT

#### Migration 36: `20251027000036_save_calculation_results.sql`
**But**: Restaurer l'INSERT en base de données
**Changements**:
- Ajout de l'INSERT INTO `offer_item_calculated_costs`
- Calcul de `v_logistics_inbound_ht` et `v_logistics_outbound_ht`

**Dépendances**:
- ✅ Dépend de: Migration 35
- ❌ **ERREUR CRITIQUE**: Cast `v_subcategory_id::UUID` à la ligne 337
- ❌ Suppose que: `subcategory_id` est UUID dans la table

**Impact**: 🔴 **BLOQUE L'INSERT** - La fonction plante lors de l'INSERT

**Symptômes**:
- API répond après 2+ minutes (timeout PostgreSQL)
- Aucune donnée insérée dans `offer_item_calculated_costs`
- Utilisateur signale: "cela fonctionnait avant, chaque fois qu'on faisait un envoi de formulaire via WeWeb, ça remplissait une row!!!"

---

### Phase 5: Correction du Type de Données

#### Migration 37: `20251027000037_fix_subcategory_type_cast.sql`
**But**: Corriger le type de `subcategory_id` dans la table
**Changements**:
```sql
ALTER TABLE offer_item_calculated_costs
  ALTER COLUMN subcategory_id TYPE TEXT USING subcategory_id::TEXT;
```

**Dépendances**:
- ✅ Dépend de: Migration 36
- ✅ Corrige: Incompatibilité entre `offer_item_calculated_costs.subcategory_id` (UUID) et `odl_product_subcategories.subcategory_id` (TEXT)

**Impact**: 🟡 Schema corrigé mais fonction toujours avec cast UUID

---

#### Migration 38: `20251027000038_restore_insert_with_text_subcategory.sql`
**But**: Restaurer l'INSERT avec le bon type TEXT
**Changements**:
- Ligne 337: `v_subcategory_id` au lieu de `v_subcategory_id::UUID`
- Fonction complète avec transport dynamique + INSERT fonctionnel

**Dépendances**:
- ✅ Dépend de: Migration 37 (schema corrigé)
- ✅ Dépend de: Migration 35 (transport calculator)
- ✅ Dépend de: `calculate_transport_cost_with_optimization()` function

**Impact**: 🟢 **DEVRAIT FONCTIONNER** - INSERT avec bon type

**⚠️ STATUT ACTUEL**: Appliqué en production mais "internal server error" rapporté

---

## 📊 Matrice de Dépendances

| Migration | Dépend de | Tables Utilisées | Functions Appelées |
|-----------|-----------|------------------|-------------------|
| 33 | 13 | `customs_fees`, `currency_rates` | - |
| 34 | 33 | `currency_rates` | - |
| 35 | 34 | `logistics_rates` | `calculate_transport_cost_with_optimization()` |
| 36 | 35 | `offer_item_calculated_costs` | `calculate_transport_cost_with_optimization()` |
| 37 | 36 | `offer_item_calculated_costs` | - |
| 38 | 37, 35 | `offer_item_calculated_costs`, `logistics_rates` | `calculate_transport_cost_with_optimization()` |

## 🔍 Vérifications Requises

### Avant d'appliquer Migration 38 en production:

1. **Vérifier que `calculate_transport_cost_with_optimization()` existe:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'calculate_transport_cost_with_optimization';
   ```

2. **Vérifier que `logistics_rates` a des données:**
   ```sql
   SELECT COUNT(*) FROM logistics_rates WHERE provider_id = 'ohmex';
   ```

3. **Vérifier le type de `subcategory_id`:**
   ```sql
   SELECT data_type FROM information_schema.columns
   WHERE table_name = 'offer_item_calculated_costs'
   AND column_name = 'subcategory_id';
   ```
   Devrait retourner: `text`

### Après avoir appliqué Migration 38:

4. **Tester l'INSERT avec WeWeb:**
   ```bash
   curl -X POST https://api.odl-tools.ch/api/validate-item \
     -H "Content-Type: application/json" \
     -H "X-API-Key: [VALID_KEY]" \
     -d '{"subcategory_id":"s22", ...}'
   ```

5. **Vérifier les données insérées:**
   ```sql
   SELECT cost_id, product_name, subcategory_id, deal_status, created_at
   FROM offer_item_calculated_costs
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## 🐛 Problèmes Connus

### 1. Internal Server Error (En cours)
**Statut**: 🔴 NON RÉSOLU
**Symptôme**: `curl` retourne "internal server error" après application de Migration 38
**Cause Possible**:
- La fonction `calculate_transport_cost_with_optimization()` pourrait ne pas exister en production
- Timeout lors de l'appel à la fonction de transport
- Problème de permissions RLS

**Action Requise**:
- Vérifier les logs Docker: `docker logs api-validation --tail 100`
- Vérifier que la fonction de transport existe
- Tester avec des valeurs par défaut (sans transport calculator)

### 2. Performance Lente
**Statut**: ⚠️ OBSERVÉ
**Symptôme**: API prend 2+ minutes à répondre avant Migration 37
**Cause**: Cast `v_subcategory_id::UUID` échoue et cause un rollback PostgreSQL
**Résolution**: ✅ Migration 37 devrait corriger cela

## 📝 Notes pour la Prochaine Session

1. **Investiguer l'erreur "internal server error"**
   - Vérifier les logs en production
   - Confirmer que `calculate_transport_cost_with_optimization()` existe
   - Tester avec un payload minimal

2. **Valider l'INSERT fonctionne**
   - Utiliser une vraie clé API depuis WeWeb
   - Vérifier qu'un `cost_id` est retourné dans la réponse
   - Confirmer que la ligne existe dans `offer_item_calculated_costs`

3. **Considérer un fallback gracieux**
   - Si transport calculator échoue, utiliser valeurs par défaut
   - Ne pas bloquer l'INSERT si le calcul de transport échoue

## 🔧 Rollback Plan

Si Migration 38 cause des problèmes critiques:

```sql
-- Option 1: Revenir à la version sans INSERT (Migration 35)
-- Désavantage: Perd la fonctionnalité d'historique

-- Option 2: Désactiver temporairement le transport calculator
-- Modifier la fonction pour toujours utiliser 12.50 CHF par défaut

-- Option 3: Créer Migration 39 avec gestion d'erreur améliorée
CREATE OR REPLACE FUNCTION validate_and_calculate_item(...)
BEGIN
  BEGIN
    v_transport_result := calculate_transport_cost_with_optimization(...);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Transport calculation failed: %', SQLERRM;
    v_logistics_total_ht := 12.50;
  END;
  -- Continue avec INSERT même si transport échoue
END;
```

## 📚 Références

- **Migration Files**: `/supabase/migrations/2025102700003[3-8]_*.sql`
- **API Route**: `/app/api/validate-item/route.ts`
- **Transport Function**: `calculate_transport_cost_with_optimization()`
- **Table Schema**: `/supabase/migrations/20251025000007_create_offer_item_calculated_costs.sql`
- **Categories Schema**: `/supabase/migrations/20251026000005_create_categories_for_rules.sql`

---

**Document créé**: 2025-10-27
**Dernière mise à jour**: 2025-10-27 17:15 CET
**Statut**: 🔴 Problème en cours - "internal server error" à investiguer

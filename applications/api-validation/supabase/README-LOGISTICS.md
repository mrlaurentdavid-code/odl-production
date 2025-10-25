# 📦 Logistics Calculator - Guide d'installation

## Vue d'ensemble

Le **Logistics Calculator** calcule automatiquement les frais logistiques totaux :
- 🚚 **Transport** (selon dimensions, poids, transporteur)
- 🏢 **Réception** et **Préparation**
- 🛃 **Douane** (frais administratifs + gestion droits/TVA)
- 💰 **Marges de sécurité** (10%)

---

## 🚀 Installation rapide

### 1. Créer les tables

Exécute le script SQL dans l'éditeur Supabase :

```bash
# Fichier
supabase/migrations/logistics_calculator_schema.sql
```

Ce script crée :
- ✅ `logistics_providers` (Ohmex, etc.)
- ✅ `customs_providers` (PESA, etc.)
- ✅ `customs_fees` (grille tarifaire douane)
- ✅ `logistics_rates` (tarifs transport avec dimensions)
- ✅ `logistics_calculations` (historique - optionnel)
- ✅ Fonction `calculate_logistics_cost()` pour le calcul

### 2. Importer les données

Dans l'interface Supabase, importer les CSV dans cet ordre :

| Table | Fichier CSV | Description |
|-------|------------|-------------|
| `logistics_providers` | `logistics_providers.csv` | Ohmex SA |
| `customs_providers` | `customs_providers.csv` | PESA Global |
| `customs_fees` | `customs_fees.csv` | 6 types de frais douaniers |
| `logistics_rates` | `logistics_rates.csv` | 6 formats de colis |

**Comment importer :**
1. Ouvrir la table dans Supabase
2. Cliquer sur "Insert" → "Import data from CSV"
3. Uploader le fichier CSV
4. Valider

---

## 🧪 Test de la fonction SQL

### Test 1 : Petit colis La Poste (national)

```sql
SELECT calculate_logistics_cost(
    p_length_cm := 20,
    p_width_cm := 15,
    p_height_cm := 2,
    p_weight_kg := 0.3,
    p_carrier := 'La Poste',
    p_mode := 'Sans signature',
    p_is_imported := FALSE
);
```

**Résultat attendu :**
```json
{
  "success": true,
  "rate": {
    "format_label": "B5 - 2 cm - Sans signature",
    "carrier": "La Poste",
    "mode": "Sans signature"
  },
  "costs": {
    "transport": {
      "price_transport": 3.00,
      "price_reception": 0.50,
      "price_prep": 2.50,
      "subtotal": 6.00
    },
    "customs": {
      "subtotal": 0
    },
    "margin_security": 0.60,
    "total_ht": 6.60,
    "total_ttc": 7.13
  }
}
```

### Test 2 : Gros colis Planzer (import avec quantité)

```sql
SELECT calculate_logistics_cost(
    p_length_cm := 50,
    p_width_cm := 50,
    p_height_cm := 80,
    p_weight_kg := 15,
    p_carrier := 'Planzer',
    p_mode := 'Avec signature',
    p_is_imported := TRUE,
    p_quantity := 10,
    p_merchandise_value := 10000
);
```

**Résultat attendu :**
```json
{
  "success": true,
  "rate": {
    "format_label": "60x60x100 cm - Avec signature",
    "carrier": "Planzer"
  },
  "costs": {
    "transport": {
      "subtotal": 12.50
    },
    "customs": {
      "admin_base": 80.00,
      "positions_supp": 0,        // Toujours 1 position
      "gestion_droits": 350.00,   // 10000 × 3.5%
      "gestion_tva": 250.00,      // 10000 × 2.5%
      "subtotal": 680.00,         // Total pour 10 unités
      "per_unit": 68.00,          // Douane par unité (680 / 10)
      "quantity": 10
    },
    "margin_security": 8.05,      // 10% de (12.50 + 68)
    "total_ht": 88.55,            // Par unité
    "total_ttc": 95.72            // Par unité
  }
}
```

---

## 📊 Structure des données

### Table `logistics_rates`

| Colonne | Type | Description |
|---------|------|-------------|
| `rate_id` | UUID | ID unique |
| `provider_id` | TEXT | Référence vers `logistics_providers` |
| `format_label` | TEXT | Label du format (ex: "B5 - 2 cm - Sans signature") |
| `carrier` | TEXT | Transporteur (La Poste, Planzer) |
| `mode` | TEXT | Mode (Sans signature, Avec suivi, Avec signature) |
| `length_cm` | NUMERIC | Longueur max en cm |
| `width_cm` | NUMERIC | Largeur max en cm |
| `height_cm` | NUMERIC | Hauteur max en cm |
| `weight_max_kg` | NUMERIC | Poids max en kg (NULL = illimité) |
| `price_transport` | NUMERIC | Prix transport HT |
| `price_reception` | NUMERIC | Prix réception HT (défaut 0.50) |
| `price_prep` | NUMERIC | Prix préparation HT (défaut 2.50) |
| `is_default` | BOOLEAN | Format par défaut |
| `is_active` | BOOLEAN | Actif/Inactif |

### Table `customs_fees`

| `fee_type` | Description | Valeur PESA |
|------------|-------------|-------------|
| `admin_base` | Frais admin de base | CHF 80 |
| `position_supp` | Par position dès la 3ème | CHF 8 |
| `gestion_droits_taux` | % gestion droits | 3.5% |
| `gestion_droits_min` | Minimum droits | CHF 5 |
| `gestion_tva_taux` | % gestion TVA | 2.5% |
| `gestion_tva_min` | Minimum TVA | CHF 5 |

---

## 🔧 Fonction SQL `calculate_logistics_cost()`

### Paramètres

```sql
calculate_logistics_cost(
    p_length_cm NUMERIC,              -- Longueur en cm (requis)
    p_width_cm NUMERIC,               -- Largeur en cm (requis)
    p_height_cm NUMERIC,              -- Hauteur en cm (requis)
    p_weight_kg NUMERIC,              -- Poids en kg (requis)
    p_carrier TEXT DEFAULT NULL,      -- Transporteur (optionnel)
    p_mode TEXT DEFAULT NULL,         -- Mode livraison (optionnel)
    p_is_imported BOOLEAN DEFAULT FALSE,  -- Import ou national
    p_quantity INT DEFAULT 1,         -- Quantité (divise frais douane)
    p_merchandise_value NUMERIC DEFAULT 0, -- Valeur marchandise totale
    p_provider_id TEXT DEFAULT 'ohmex'    -- Provider logistique
)
```

### Logique de calcul

1. **Matching du format** :
   - Trouve le format le plus petit qui peut contenir le colis
   - Filtre par transporteur et mode si spécifiés
   - Trie par volume croissant puis prix croissant

2. **Coût transport** :
   - Transport + Réception + Préparation

3. **Coût douane** (si `p_is_imported = TRUE`) :
   - Admin base : CHF 80 (toujours 1 position)
   - Gestion droits : MAX(valeur × 3.5%, CHF 5)
   - Gestion TVA : MAX(valeur × 2.5%, CHF 5)
   - **Total divisé par quantité pour obtenir coût par unité**

4. **Marge sécurité** :
   - 10% sur (transport + douane)

5. **TVA** :
   - 8.1% sur total HT

---

## 📝 Prochaines étapes

Une fois les tables créées et testées :

1. ✅ Créer l'API REST `/api/calculate-logistics`
2. ✅ Créer l'interface dashboard
3. ✅ Ajouter la documentation API
4. ✅ Intégration Weweb/N8N

---

## 🔗 Ressources

- **Schema SQL** : `supabase/migrations/logistics_calculator_schema.sql`
- **Seed data** : `supabase/seed-data/logistics_*.csv`
- **Tests** : Voir section "Test de la fonction SQL" ci-dessus

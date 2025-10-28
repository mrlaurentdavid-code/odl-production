# Mapping Subcategories → TAR

Ce document explique comment les `subcategory_id` sont mappés aux tarifs TAR (Taxe Anticipée de Recyclage) en Suisse.

## 🎯 Comment ça fonctionne

L'API `/api/validate-item` appelle automatiquement l'API TAR (https://tar.odl-tools.ch/api/calculate-tar-odeal) si :
- `contain_electronic = true`
- `has_battery = true` (optionnel mais recommandé)
- `subcategory_id` fourni (requis)

Le mapping complet est géré par le TAR Calculator dans le fichier `../tar-calculator/subcategory-tar-mapping.js`.

## 📋 Subcategories Électroniques (Catégorie c3)

### Téléphonie & Communication

| ID | Nom | Organisme | TAR HT | Notes |
|----|-----|-----------|---------|-------|
| **s20** | Téléphonie & Accessoires | SWICO | **CHF 0.19** | Smartphones, téléphones fixes |
| **s26** | Objets connectés & Domotique | SWICO | **CHF 0.19** | Montres connectées, assistants vocaux |

### Informatique

| ID | Nom | Organisme | TAR HT | Notes |
|----|-----|-----------|---------|-------|
| **s21** | Informatique | SWICO | Variable | Ordinateurs, tablettes, écrans<br/>⚠️ **Requis**: `weight_kg` + `screen_size` |
| **s23** | Photo & Vidéo | SWICO | **CHF 0.46** | Appareils photo, caméras |

### Audio & Vidéo

| ID | Nom | Organisme | TAR HT | Notes |
|----|-----|-----------|---------|-------|
| **s22** | Image & Son | SWICO | Variable | TV, enceintes, casques<br/>⚠️ **Requis**: `weight_kg` |
| **s27** | Jeux vidéo & Consoles | SWICO | **CHF 2.31** | Consoles de jeux |

### Électroménager

| ID | Nom | Organisme | TAR HT | Notes |
|----|-----|-----------|---------|-------|
| **s24** | Petit électroménager | SENS | Variable | Cafetière, grille-pain, mixeur<br/>⚠️ **Requis**: `weight_kg` |
| **s25** | Gros électroménager | SENS | Variable | Réfrigérateur, lave-linge, four<br/>⚠️ **Requis**: `weight_kg` |

### Autres

| ID | Nom | Organisme | TAR HT | Notes |
|----|-----|-----------|---------|-------|
| **s42** | Appareils de soin | SWICO | **CHF 0.46** | Sèche-cheveux, lisseurs, épilateurs |
| **s63** | Outillage électroportatif | SWICO | **CHF 0.46** | Perceuses, scies électriques |

## ⚠️ Champs Requis pour le Calcul TAR

### Obligatoires
```json
{
  "subcategory_id": "s20",        // ✅ OBLIGATOIRE
  "item_name": "iPhone 15 Pro",    // ✅ OBLIGATOIRE
  "contain_electronic": true       // ✅ OBLIGATOIRE pour déclencher le calcul
}
```

### Fortement Recommandés
```json
{
  "has_battery": true,             // 🔋 Active les règles batterie
  "battery_type": "Li-ion",        // 📝 Type de batterie
  "weight_kg": 0.5                 // ⚖️ Requis pour s21, s22, s24, s25
}
```

### Optionnels
```json
{
  "length_cm": 15,                 // Pour calcul volumétrique
  "width_cm": 8,
  "height_cm": 1,
  "ean": "0194253700784"           // Pour cache et tracking
}
```

## 📝 Exemples de Tests

### Smartphone (s20)
```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_ohmex_demo_2025" \
  -d '{
    "offer_id": "test-001",
    "msrp": 1299.00,
    "street_price": 1199.00,
    "promo_price": 999.00,
    "purchase_price_ht": 750.00,
    "purchase_currency": "EUR",
    "product_name": "Apple iPhone 15 Pro",
    "subcategory_id": "s20",
    "category_id": "c3",
    "contain_electronic": true,
    "has_battery": true,
    "battery_type": "Li-ion",
    "package_weight_kg": 0.5
  }'
```

**Résultat attendu**: `"tar_ht": 0.19`

### Ordinateur portable (s21)
```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key": odl_sup_ohmex_demo_2025" \
  -d '{
    "offer_id": "test-002",
    "msrp": 1599.00,
    "street_price": 1499.00,
    "promo_price": 1299.00,
    "purchase_price_ht": 900.00,
    "product_name": "Dell XPS 15",
    "subcategory_id": "s21",
    "category_id": "c3",
    "contain_electronic": true,
    "has_battery": true,
    "battery_type": "Li-ion",
    "package_weight_kg": 2.5,
    "length_cm": 40,
    "width_cm": 30,
    "height_cm": 5
  }'
```

**Résultat attendu**: `"tar_ht": X.XX` (dépend du poids/écran)

### Console de jeux (s27)
```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: odl_sup_ohmex_demo_2025" \
  -d '{
    "offer_id": "test-003",
    "msrp": 549.00,
    "street_price": 499.00,
    "promo_price": 449.00,
    "purchase_price_ht": 350.00,
    "product_name": "PlayStation 5",
    "subcategory_id": "s27",
    "category_id": "c3",
    "contain_electronic": true,
    "has_battery": false,
    "package_weight_kg": 4.5
  }'
```

**Résultat attendu**: `"tar_ht": 2.31`

## 🚫 Subcategories NON Électroniques (TAR = 0)

Les subcategories suivantes retournent **TAR = 0 CHF** :

### Mode & Accessoires (c1)
- `s1` - Vêtements Femme
- `s2` - Vêtements Homme
- `s4` - Chaussures Femme
- `s5` - Chaussures Homme
- `s8` - Bijoux
- `s9` - Montres (sauf si `has_battery = true` → devient SWICO CHF 0.19)

### Maison & Jardin (c2)
- `s12` - Mobilier d'intérieur
- `s13` - Décoration
- `s14` - Linge de maison

### Sport & Loisirs (c4)
- `s28` - Vêtements de sport
- `s30` - Fitness & Musculation
- `s33` - Cyclisme (sauf vélo électrique avec `has_battery = true`)

### Beauté & Santé (c5)
- `s37` - Parfums
- `s38` - Maquillage
- `s39` - Soins du visage

## 🔧 Troubleshooting

### TAR retourne 0 alors que c'est électronique

**Causes possibles**:
1. ❌ `contain_electronic = false` ou absent → Ajouter `"contain_electronic": true`
2. ❌ `subcategory_id` est non-électronique (s1-s19) → Utiliser s20-s27 pour électronique
3. ❌ `subcategory_id` manquant ou invalide → Vérifier le format (s20, s21, etc.)

### Erreur 400 "subcategory_id obligatoire"

**Solution**: L'endpoint `/api/calculate-tar-odeal` requiert absolument un `subcategory_id` valide. Si vous n'avez pas de subcategory, utilisez `/api/calculate-tar-v2` (détection IA) à la place.

### TAR semble incorrect

**Solution**: Vérifiez que :
- Le bon `subcategory_id` est utilisé (s20 pour smartphone, pas s1)
- Le `weight_kg` est fourni pour s21, s22, s24, s25
- Les champs `has_battery` et `battery_type` sont corrects

## 📚 Ressources

- **API TAR Calculator**: https://tar.odl-tools.ch/api/calculate-tar-odeal
- **Mapping complet**: `../tar-calculator/subcategory-tar-mapping.js`
- **Documentation API**: https://app.odl-tools.ch/api-docs
- **Barèmes officiels**:
  - SWICO: https://www.swico.ch
  - SENS: https://www.erecycling.ch
  - INOBAT: https://www.inobat.ch

## 📅 Dernière mise à jour

**Date**: 2025-10-26
**Version**: 1.0
**Statut**: ✅ Intégration TAR fonctionnelle en production

# Confirmation Officielle Subcategories - Base de Données

## 📌 Source

Données extraites directement de la table `subcategories` en production (2025-10-26)

---

## s20 - Téléphonie & Accessoires

### Métadonnées
```
subcategory_id: s20
category_id: c3 (Electronics & High-Tech)
name: telephony_accessories
fr_display_name: Téléphonie & Accessoires
slug: telephonie-accessoires
display_order: 10
taux_tva: 0.081 (8.1%)
is_refurbishable: true
```

### Description Officielle
> "Smartphones, téléphones fixes, coques, chargeurs et câbles."

### Produits Inclus
- ✅ Smartphones
- ✅ Téléphones fixes
- ✅ Coques de téléphone
- ✅ Chargeurs
- ✅ Câbles

### Produits EXCLUS
- ❌ Écouteurs (→ s22)
- ❌ Casques audio (→ s22)
- ❌ Enceintes (→ s22)

### TAR
**SWICO - CHF 0.19 HT**

### Exemples de Produits
- Apple iPhone 15 Pro
- Samsung Galaxy S24
- Google Pixel 8
- Chargeur USB-C
- Coque de protection iPhone

---

## s22 - Image & Son

### Métadonnées
```
subcategory_id: s22
category_id: c3 (Electronics & High-Tech)
name: image_sound
fr_display_name: Image & Son
slug: image-son
display_order: 30
taux_tva: 0.081 (8.1%)
is_refurbishable: true
```

### Description Officielle
> "Téléviseurs, vidéoprojecteurs, casques audio, écouteurs et enceintes."

### Produits Inclus
- ✅ Téléviseurs
- ✅ Vidéoprojecteurs
- ✅ **Casques audio**
- ✅ **Écouteurs**
- ✅ Enceintes
- ✅ Barres de son
- ✅ Amplificateurs audio

### Produits EXCLUS
- ❌ Smartphones (→ s20)
- ❌ Téléphones (→ s20)

### TAR
**SWICO - Variable selon poids**
- Poids < 1.5 kg : **CHF 0.46 HT**
- Poids ≥ 1.5 kg : **CHF 2.31 HT**

### Exemples de Produits
- Samsung Galaxy Buds3 Pro (0.3 kg) → CHF 0.46
- Apple AirPods Pro (0.06 kg) → CHF 0.46
- Sony WH-1000XM5 (0.25 kg) → CHF 0.46
- Bose QuietComfort Ultra (0.3 kg) → CHF 0.46
- Samsung TV 55" (15 kg) → CHF 2.31

---

## 🚨 Erreur Fréquente à Éviter

### ❌ INCORRECT
```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s20"  // ❌ MAUVAIS
}
```

**Pourquoi c'est faux** :
- s20 = "Smartphones, téléphones fixes, coques, chargeurs et câbles"
- Les écouteurs ne sont PAS mentionnés dans s20
- Confusion possible : "accessoires" dans le nom ne signifie pas tous les accessoires

**Résultat** :
- TAR = CHF 0.19 au lieu de CHF 0.46
- Sous-déclaration de CHF 0.27 par unité
- Non-conformité légale SWICO

---

### ✅ CORRECT
```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s22"  // ✅ CORRECT
}
```

**Pourquoi c'est juste** :
- s22 = "Téléviseurs, vidéoprojecteurs, casques audio, **écouteurs** et enceintes"
- Les écouteurs sont explicitement mentionnés

**Résultat** :
- TAR = CHF 0.46 (correct)
- Conformité légale SWICO

---

## 📊 Tableau de Décision Rapide

| Produit | s20 ? | s22 ? | Subcategory Correcte |
|---------|-------|-------|---------------------|
| iPhone 15 Pro | ✅ Oui | ❌ Non | **s20** |
| Samsung Galaxy S24 | ✅ Oui | ❌ Non | **s20** |
| Chargeur USB-C | ✅ Oui | ❌ Non | **s20** |
| Coque iPhone | ✅ Oui | ❌ Non | **s20** |
| **Samsung Galaxy Buds3 Pro** | ❌ Non | ✅ Oui | **s22** |
| **Apple AirPods Pro** | ❌ Non | ✅ Oui | **s22** |
| **Sony WH-1000XM5** | ❌ Non | ✅ Oui | **s22** |
| **Bose QuietComfort** | ❌ Non | ✅ Oui | **s22** |
| Enceinte Bluetooth | ❌ Non | ✅ Oui | **s22** |
| TV Samsung 55" | ❌ Non | ✅ Oui | **s22** |
| Barre de son | ❌ Non | ✅ Oui | **s22** |

---

## 🔑 Règle Mnémotechnique

### Pour s20 (Téléphonie)
**"Est-ce que je peux TÉLÉPHONER avec ?"**
- iPhone → Oui → s20 ✅
- Écouteurs → Non → s22 ❌

### Pour s22 (Image & Son)
**"Est-ce que ça produit du SON ou de l'IMAGE ?"**
- Écouteurs → Oui (son) → s22 ✅
- iPhone → Non (c'est un téléphone) → s20 ❌

---

## 🧪 Tests de Validation

### Test 1: Samsung Galaxy Buds3 Pro
```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s22",
  "package_weight_kg": 0.3
}
```

**Résultat attendu** :
```json
{
  "subcategory_name": "image_sound",
  "tar_ht": 0.46
}
```

### Test 2: Apple iPhone 15 Pro
```json
{
  "product_name": "Apple iPhone 15 Pro",
  "subcategory_id": "s20",
  "package_weight_kg": 0.5
}
```

**Résultat attendu** :
```json
{
  "subcategory_name": "telephony_accessories",
  "tar_ht": 0.19
}
```

---

## 📅 Informations

**Date de création** : 2025-10-26
**Source** : Table `subcategories` (Production Supabase)
**Statut** : ✅ Données officielles confirmées
**Validation** : Base de données + Tests API réussis

---

## 🔗 Documents Associés

- `WEWEB_CORRECTIONS_URGENTES.md` - Actions immédiates
- `WEWEB_SUBCATEGORY_GUIDE.md` - Guide complet
- `SUBCATEGORY_TAR_MAPPING.md` - Mapping TAR technique

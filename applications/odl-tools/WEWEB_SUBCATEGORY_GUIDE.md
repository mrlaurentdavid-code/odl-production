# Guide des Subcategories pour WeWeb

## 🎯 Objectif

Ce document aide à choisir la **bonne `subcategory_id`** dans le formulaire WeWeb pour que le calcul TAR soit correct.

## ⚠️ Erreur Fréquente

**Erreur** : Envoyer `subcategory_id: "s64"` (Quincaillerie) pour des écouteurs Bluetooth
**Résultat** : TAR = 0 CHF au lieu de 0.46 CHF → **Non-conformité légale**

**Solution** : Utiliser `subcategory_id: "s22"` (Image & Son)

---

## 📋 Mapping Complet des Subcategories Électroniques

### Catégorie c3 - Électronique & High-Tech

| ID | Nom | Produits Exemples | Organisme | TAR | Champs Requis |
|----|-----|-------------------|-----------|-----|---------------|
| **s20** | Téléphonie & Accessoires | Smartphones, téléphones fixes, cables | SWICO | **CHF 0.19** | - |
| **s21** | Informatique | Ordinateurs portables, tablettes, écrans PC, claviers, souris | SWICO | **Variable** | `weight_kg`, `screen_size` |
| **s22** | Image & Son | TV, enceintes, casques, **écouteurs**, amplificateurs | SWICO | **Variable** | `weight_kg` |
| **s23** | Photo & Vidéo | Appareils photo, caméras, objectifs | SWICO | **CHF 0.46** | - |
| **s24** | Petit électroménager | Cafetière, grille-pain, mixeur, bouilloire | SENS | **Variable** | `weight_kg` |
| **s25** | Gros électroménager | Réfrigérateur, lave-linge, four, sèche-linge | SENS | **Variable** | `weight_kg` |
| **s26** | Objets connectés & Domotique | Montres connectées, assistants vocaux, caméras sécurité | SWICO | **CHF 0.19** | - |
| **s27** | Jeux vidéo & Consoles | PlayStation, Xbox, Nintendo Switch | SWICO | **CHF 2.31** | - |

### Catégorie c5 - Beauté & Santé

| ID | Nom | Produits Exemples | Organisme | TAR | Champs Requis |
|----|-----|-------------------|-----------|-----|---------------|
| **s42** | Appareils de soin | Sèche-cheveux, lisseurs, épilateurs électriques | SWICO | **CHF 0.46** | - |

### Catégorie c10 - Bricolage & Jardin

| ID | Nom | Produits Exemples | Organisme | TAR | Champs Requis |
|----|-----|-------------------|-----------|-----|---------------|
| **s63** | Outillage électroportatif | Perceuses, scies électriques, ponceuses | SWICO | **CHF 0.46** | - |
| **s64** | Quincaillerie | Vis, clous, outils à main (**NON électronique**) | **AUCUN** | **CHF 0** | - |

---

## 🔍 Cas Spécifiques

### Écouteurs & Casques Audio

**⚠️ ATTENTION : Les écouteurs ne sont PAS des téléphones !**

**Tous les types d'écouteurs/casques → s22** :
- Écouteurs Bluetooth (AirPods, Galaxy Buds, etc.)
- Casques sans fil (Sony, Bose, etc.)
- Casques gaming (HyperX, Logitech, etc.)
- Enceintes Bluetooth

```json
{
  "subcategory_id": "s22",  // ✅ CORRECT - Image & Son
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable",
  "package_weight_kg": 0.3
}
```

**TAR attendu** : CHF 0.46 (poids < 1.5 kg)

**❌ NE PAS utiliser s20 (Téléphonie)** :
```json
{
  "subcategory_id": "s20",  // ❌ MAUVAIS - Uniquement pour smartphones/téléphones
  // TAR = 0.19 au lieu de 0.46 → Non-conformité légale
}
```

---

### Montres

**Montres classiques (non électroniques)** :
```json
{
  "subcategory_id": "s9",
  "category_id": "c1",
  "contain_electronic": false,
  "has_battery": false
}
```
**TAR** : CHF 0

**Montres connectées (Apple Watch, Samsung Galaxy Watch, etc.)** :
```json
{
  "subcategory_id": "s26",
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable"
}
```
**TAR** : CHF 0.19

---

### Claviers & Souris

**Claviers/souris USB ou Bluetooth** :
```json
{
  "subcategory_id": "s21",
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": false,  // Sauf si sans fil
  "package_weight_kg": 0.5
}
```
**TAR attendu** : Variable selon poids

---

### Consoles de Jeux

**PlayStation 5, Xbox Series X, Nintendo Switch** :
```json
{
  "subcategory_id": "s27",
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": false,  // Sauf Switch portable
  "package_weight_kg": 4.5
}
```
**TAR** : CHF 2.31

---

## ⚙️ Flags Électroniques Obligatoires

### contain_electronic

**Mettre `true` pour** :
- Tous les produits avec composants électroniques
- Tous les produits avec prise électrique
- Tous les produits avec batterie/pile

**Exemples** :
- ✅ Smartphone → `true`
- ✅ Écouteurs Bluetooth → `true`
- ✅ Montre connectée → `true`
- ✅ Sèche-cheveux → `true`
- ❌ T-shirt → `false`
- ❌ Chaussures → `false`
- ❌ Livre → `false`

### has_battery

**⚠️ ATTENTION : Le champ s'appelle `has_battery`, PAS `contain_battery` !**

```javascript
// ❌ MAUVAIS NOM DE CHAMP
{
  contain_battery: true  // L'API ne reconnaît pas ce champ
}

// ✅ CORRECT
{
  has_battery: true  // L'API reconnaît ce champ
}
```

**Mettre `true` pour** :
- Produits avec batterie rechargeable intégrée
- Produits fonctionnant à piles

**Exemples** :
- ✅ Smartphone → `true`
- ✅ Écouteurs sans fil → `true`
- ✅ Ordinateur portable → `true`
- ❌ Écran PC (branché secteur) → `false`
- ❌ Console de salon → `false`

### battery_type

**Valeurs possibles** :
- `"lithium_ion_rechargeable"` - Li-ion rechargeable (la plupart des appareils modernes)
- `"alkaline_disposable"` - Piles alcalines jetables (AA, AAA, etc.)
- `"nimh_rechargeable"` - NiMH rechargeable (anciens appareils)
- `"lithium_polymer"` - Li-Po (drones, certains smartphones)

**Exemple** :
```json
{
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable"
}
```

---

## 🚨 Erreurs Fréquentes à Éviter

### ❌ Erreur 1: Mauvaise Subcategory

```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s64"  // ❌ MAUVAIS (Quincaillerie)
}
```

**Impact** :
- TAR = 0 au lieu de 0.46 CHF
- Non-conformité légale
- Erreur de catégorisation

**Solution** :
```json
{
  "subcategory_id": "s22"  // ✅ CORRECT (Image & Son)
}
```

---

### ❌ Erreur 2: Mauvais Nom de Champ `contain_battery`

```json
{
  "contain_electronic": true,
  "contain_battery": true,  // ❌ MAUVAIS NOM
  "battery_type": "lithium_ion_rechargeable"
}
```

**Impact** :
- L'API ne reconnaît pas `contain_battery`
- Le champ est ignoré → `has_battery` reste `false`
- TAR calculé sans tenir compte de la batterie

**Solution** :
```json
{
  "contain_electronic": true,
  "has_battery": true,  // ✅ CORRECT
  "battery_type": "lithium_ion_rechargeable"
}
```

---

### ❌ Erreur 3: Flags Incohérents

```json
{
  "contain_electronic": false,  // ❌
  "has_battery": false,         // ❌
  "battery_type": "lithium_ion_rechargeable"  // Contradictoire !
}
```

**Impact** :
- TAR API ne sera pas appelée
- Calcul TAR ignoré

**Solution** :
```json
{
  "contain_electronic": true,   // ✅
  "has_battery": true,          // ✅
  "battery_type": "lithium_ion_rechargeable"
}
```

---

### ❌ Erreur 4: Poids Manquant

```json
{
  "subcategory_id": "s22",  // Image & Son → BESOIN du poids
  "package_weight_kg": null  // ❌ MANQUANT
}
```

**Impact** :
- TAR calculé sur valeur par défaut
- Risque de TAR incorrect

**Solution** :
```json
{
  "subcategory_id": "s22",
  "package_weight_kg": 1.0  // ✅ Poids réel du colis
}
```

---

## 📚 Ressources

- **Mapping complet TAR** : `SUBCATEGORY_TAR_MAPPING.md`
- **API Documentation** : https://app.odl-tools.ch/api-docs
- **Barèmes officiels** :
  - SWICO : https://www.swico.ch
  - SENS : https://www.erecycling.ch
  - INOBAT : https://www.inobat.ch

---

## 🧪 Tests Recommandés

Avant de mettre en production, tester avec ces payloads :

### Test 1: Écouteurs Bluetooth
```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s22",
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable",
  "package_weight_kg": 1.0
}
```
**TAR attendu** : CHF 0.46

### Test 2: Smartphone
```json
{
  "product_name": "iPhone 15 Pro",
  "subcategory_id": "s20",
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable",
  "package_weight_kg": 0.5
}
```
**TAR attendu** : CHF 0.19

### Test 3: Ordinateur Portable
```json
{
  "product_name": "Dell XPS 15",
  "subcategory_id": "s21",
  "category_id": "c3",
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable",
  "package_weight_kg": 2.5,
  "length_cm": 40,
  "width_cm": 30,
  "height_cm": 5
}
```
**TAR attendu** : Variable selon poids + taille écran

---

## 📅 Dernière Mise à Jour

**Date** : 2025-10-26
**Version** : 1.0
**Statut** : ✅ Document de référence pour intégration WeWeb

# ⚠️ Corrections URGENTES WeWeb - Intégration TAR

## 🔴 2 Corrections CRITIQUES à Faire IMMÉDIATEMENT

---

## Correction 1: Subcategory Écouteurs/Casques

### ❌ Problème Actuel

Les écouteurs Samsung Galaxy Buds3 Pro sont catégorisés comme **Téléphonie (s20)** au lieu de **Image & Son (s22)**

```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s20"  // ❌ MAUVAIS
}
```

**Résultat** :
- TAR = CHF 0.19 (tarif smartphone)
- **Sous-déclaration TAR** : -CHF 0.27 par unité
- **Non-conformité légale** avec SWICO

### ✅ Solution

```json
{
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s22"  // ✅ CORRECT
}
```

**Résultat** :
- TAR = CHF 0.46 (tarif écouteurs)
- Conformité légale SWICO

### 📋 Règle de Catégorisation

| Produit | ❌ Mauvaise Subcategory | ✅ Bonne Subcategory |
|---------|------------------------|---------------------|
| Smartphone, téléphone | s22 (Image & Son) | **s20** (Téléphonie) |
| Écouteurs Bluetooth | s20 (Téléphonie) | **s22** (Image & Son) |
| Casque audio | s20 (Téléphonie) | **s22** (Image & Son) |
| Enceinte Bluetooth | s20 (Téléphonie) | **s22** (Image & Son) |
| Barre de son | s20 (Téléphonie) | **s22** (Image & Son) |

### 💰 Impact Financier

**Exemple : 1000 unités Samsung Galaxy Buds3 Pro**

| Version | TAR unitaire | TAR total | Différence |
|---------|--------------|-----------|------------|
| ❌ Actuel (s20) | CHF 0.19 | CHF 190 | Sous-déclaration |
| ✅ Correct (s22) | CHF 0.46 | **CHF 460** | **+CHF 270** |

**Risque** : Pénalités SWICO pour sous-déclaration

---

## Correction 2: Nom du Champ Batterie

### ❌ Problème Actuel

Le formulaire envoie `contain_battery` au lieu de `has_battery`

```json
{
  "contain_electronic": true,
  "contain_battery": true,  // ❌ MAUVAIS NOM
  "battery_type": "lithium_ion_rechargeable"
}
```

**Résultat** :
- L'API ne reconnaît pas `contain_battery`
- Le champ est ignoré silencieusement
- `has_battery` reste à `false` dans la base

### ✅ Solution

```json
{
  "contain_electronic": true,
  "has_battery": true,  // ✅ CORRECT
  "battery_type": "lithium_ion_rechargeable"
}
```

### 📝 Champs API Attendus

| Champ WeWeb (actuel) | Champ API (attendu) | Status |
|---------------------|---------------------|--------|
| `contain_electronic` | `contain_electronic` | ✅ OK |
| `contain_battery` | `has_battery` | ❌ MAUVAIS |
| `battery_type` | `battery_type` | ✅ OK |

---

## 🔧 Actions à Réaliser dans WeWeb

### Étape 1: Mapping des Subcategories

**Fichier/Module concerné** : Logique de sélection de subcategory

```javascript
// ❌ AVANT
function getSubcategoryForProduct(product) {
  if (product.type === 'écouteurs' || product.type === 'casque') {
    return 's20'  // MAUVAIS
  }
  // ...
}

// ✅ APRÈS
function getSubcategoryForProduct(product) {
  // Smartphones et téléphones → s20
  if (product.type === 'smartphone' || product.type === 'téléphone') {
    return 's20'
  }

  // Écouteurs, casques, enceintes → s22
  if (product.type === 'écouteurs' || product.type === 'casque' ||
      product.type === 'enceinte' || product.type === 'audio') {
    return 's22'
  }

  // ...
}
```

### Étape 2: Renommer le Champ Batterie

**Fichier/Module concerné** : Payload de l'API validation

```javascript
// ❌ AVANT
const payload = {
  // ... autres champs
  contain_electronic: product.isElectronic,
  contain_battery: product.hasBattery,  // MAUVAIS NOM
  battery_type: product.batteryType
}

// ✅ APRÈS
const payload = {
  // ... autres champs
  contain_electronic: product.isElectronic,
  has_battery: product.hasBattery,  // CORRECT
  battery_type: product.batteryType
}
```

---

## 🧪 Tests de Validation

### Test 1: Écouteurs Samsung Galaxy Buds3 Pro

**Payload à envoyer** :
```json
{
  "offer_id": "test-001",
  "ean": "8806095651675",
  "product_name": "Samsung Galaxy Buds3 Pro",
  "subcategory_id": "s22",
  "category_id": "c3",
  "msrp": 210,
  "street_price": 190,
  "promo_price": 150,
  "purchase_price_ht": 100,
  "purchase_currency": "EUR",
  "package_weight_kg": 0.3,
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable",
  "shipping_origin": "HR"
}
```

**Résultat attendu** :
```json
{
  "success": true,
  "costs": {
    "tar_ht": 0.46  // ✅ Correct pour s22 avec 0.3kg
  },
  "item_details": {
    "subcategory_id": "s22",
    "subcategory_name": "image_sound"
  }
}
```

### Test 2: Smartphone iPhone 15 Pro

**Payload à envoyer** :
```json
{
  "offer_id": "test-002",
  "ean": "0194253700784",
  "product_name": "Apple iPhone 15 Pro 256GB",
  "subcategory_id": "s20",
  "category_id": "c3",
  "msrp": 1299,
  "street_price": 1199,
  "promo_price": 999,
  "purchase_price_ht": 750,
  "purchase_currency": "EUR",
  "package_weight_kg": 0.5,
  "contain_electronic": true,
  "has_battery": true,
  "battery_type": "lithium_ion_rechargeable"
}
```

**Résultat attendu** :
```json
{
  "success": true,
  "costs": {
    "tar_ht": 0.19  // ✅ Correct pour s20
  },
  "item_details": {
    "subcategory_id": "s20",
    "subcategory_name": "telephony_accessories"
  }
}
```

---

## 📊 Checklist de Validation

- [ ] **Subcategory Écouteurs** : Vérifier que tous les écouteurs/casques utilisent `s22`
- [ ] **Subcategory Smartphones** : Vérifier que les smartphones utilisent `s20`
- [ ] **Champ Batterie** : Renommer `contain_battery` → `has_battery`
- [ ] **Test Galaxy Buds** : TAR = 0.46 CHF (pas 0.19)
- [ ] **Test iPhone** : TAR = 0.19 CHF
- [ ] **Logs API** : Vérifier `has_battery = true` dans la réponse
- [ ] **Documentation** : Informer l'équipe du changement

---

## 🔗 Documents de Référence

- **Guide Subcategories** : `WEWEB_SUBCATEGORY_GUIDE.md`
- **Mapping TAR** : `SUBCATEGORY_TAR_MAPPING.md`
- **API Docs** : https://app.odl-tools.ch/api-docs
- **Endpoint** : `POST https://api.odl-tools.ch/api/validate-item`

---

## 💡 Rappel Important

**La subcategory détermine directement le tarif TAR.**

Une erreur de catégorisation entraîne :
1. ❌ Non-conformité légale (SWICO/SENS/INOBAT)
2. ❌ Calcul COGS incorrect
3. ❌ Marges faussées
4. ❌ Risque de pénalités

**Ces 2 corrections sont CRITIQUES pour la conformité légale.**

---

## 📅 Dernière Mise à Jour

**Date** : 2025-10-26
**Urgence** : 🔴 CRITIQUE
**Implémentation** : Immédiate requise

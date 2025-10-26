# Intégration WeWeb - API Validation O!Deal

## 📌 Vue d'ensemble

Ce document explique comment intégrer l'API de validation O!Deal dans votre application WeWeb.

## 🔑 Authentication

### Header requis

```
X-API-Key: WEWEB_PRODUCTION_2025_API_KEY
```

**⚠️ Important** : Demandez votre clé API à l'équipe O!Deal.

## 🌐 Endpoint

```
POST https://api.odl-tools.ch/api/validate-item
Content-Type: application/json
```

## 📦 Données à envoyer

### ✅ Champs REQUIS (7)

```javascript
{
  "offer_id": "UUID de l'offre WeWeb",           // UUID
  "supplier_id": "UUID du fournisseur",          // UUID
  "item_id": "Code EAN ou SKU du produit",       // TEXT (pas UUID!)
  "msrp": 1299.00,                               // Prix conseillé CHF TTC
  "street_price": 1199.00,                       // Prix marché CHF TTC
  "promo_price": 999.00,                         // Prix promo CHF TTC
  "purchase_price_ht": 750.00                    // Prix achat HT
}
```

### ⭐ Champs RECOMMANDÉS

**Pour calculs de douanes et règles métier optimales** :

```javascript
{
  "category_name": "Electronics",      // Catégorie produit
  "subcategory_name": "Smartphones",   // Sous-catégorie produit
  "purchase_currency": "EUR",          // Devise prix achat (CHF, EUR, USD...)
  "quantity": 10,                      // Quantité proposée
  "product_name": "iPhone 15 Pro"      // Nom du produit
}
```

### 📝 Champs OPTIONNELS

```javascript
{
  "ean": "0888413779764",       // EAN si différent de item_id
  "package_weight_kg": 0.8,     // Poids du colis
  "pesa_fee_ht": 2.50,          // Frais PESA si applicable
  "warranty_cost_ht": 15.00     // Coût garantie si applicable
}
```

## 📥 Réponse API

### Success (200)

```javascript
{
  "success": true,
  "is_valid": true,              // TRUE si deal accepté (top/good)
  "deal_status": "good",         // "top", "good", "almost", ou "bad"
  "cost_id": "uuid...",          // ID de référence interne
  "validation_issues": [],       // Messages d'erreur/warning

  "item_details": {
    "item_id": "888413779764",
    "ean": "0888413779764",
    "product_name": "iPhone 15 Pro 256GB"
  },

  "pricing": {
    "msrp": 1299.00,
    "street_price": 1199.00,
    "promo_price": 999.00,
    "purchase_price_original": 750.00,
    "purchase_currency": "EUR",
    "currency_rate": 0.95
  },

  "applied_rule": {
    "rule_id": "uuid...",
    "rule_name": "Electronics - Smartphones Rules",
    "scope": "subcategory",      // "global", "category", ou "subcategory"
    "category": "Electronics",
    "subcategory": "Smartphones"
  }
}
```

### Deal Status

| Status | Signification | Action WeWeb |
|--------|---------------|--------------|
| `"top"` | ⭐ Excellent deal | Publier immédiatement avec badge "TOP DEAL" |
| `"good"` | ✅ Bon deal | Publier normalement |
| `"almost"` | ⚠️ Deal marginal | Afficher warning, laisser fournisseur décider |
| `"bad"` | ❌ Deal refusé | Bloquer publication, afficher raison dans `validation_issues` |

### Error (400/401/500)

```javascript
{
  "success": false,
  "error": "Missing required fields: offer_id, item_id",
  "details": "...",
  "code": "..."
}
```

## 🎨 Exemple WeWeb

### Configuration REST API

```javascript
// URL
POST https://api.odl-tools.ch/api/validate-item

// Headers
{
  "Content-Type": "application/json",
  "X-API-Key": "WEWEB_PRODUCTION_2025_API_KEY"
}

// Body (bind to form data)
{
  "offer_id": {{offer.id}},
  "supplier_id": {{supplier.id}},
  "item_id": {{product.ean || product.sku}},
  "msrp": {{product.msrp}},
  "street_price": {{product.street_price}},
  "promo_price": {{product.promo_price}},
  "purchase_price_ht": {{product.purchase_price}},
  "category_name": {{product.category.name}},
  "subcategory_name": {{product.subcategory.name}},
  "purchase_currency": {{product.currency || "CHF"}},
  "quantity": {{product.quantity}},
  "product_name": {{product.name}}
}
```

### Workflow WeWeb

```
1. User fills form with product details
   ↓
2. On submit → Call REST API /api/validate-item
   ↓
3. Display result:

   IF response.is_valid === true:
     → Show success message
     → Display deal_status badge (top/good/almost)
     → Enable "Publish" button

   ELSE:
     → Show error message
     → Display validation_issues
     → Disable "Publish" button
```

### Exemple UI Conditions

```javascript
// Badge color
deal_status === "top" ? "green"
deal_status === "good" ? "blue"
deal_status === "almost" ? "yellow"
deal_status === "bad" ? "red"

// Show publish button
is_valid === true

// Show validation issues
validation_issues.length > 0
```

## 🏷️ Catégories Disponibles

### Products
- `Audio` → Speakers, Headphones, Microphones
- `Cameras` → DSLR, Mirrorless, Action_Cameras
- `Computers` → Laptops, Desktops, Tablets, Servers
- `Electronics` → Smartphones, Wearables, Smart_Home
- `Gaming` → Consoles, PC_Gaming, VR
- `Home_Appliances` → Kitchen, Cleaning, Climate_Control
- `Networking` → Routers, Switches, Access_Points
- `Office` → Printers, Scanners, Projectors
- `Storage` → HDD, SSD, NAS, Memory_Cards
- `TV_Video` → TVs, Monitors, Streaming_Devices

### Services
- `Consultation`
- `Installation` → Hardware, Software, Network
- `Maintenance` → Support_Plans, Extended_Warranty
- `Repair` → Hardware_Repair, Software_Repair
- `Subscription` → Software_Licenses, Cloud_Storage, Streaming
- `Training` → Technical, End_User, Certification

**Liste complète dans** : `API_SPECIFICATION.md`

## ⚡ Optimisations

### 1. Validation côté client (avant API call)

```javascript
// Vérifier champs requis avant d'appeler l'API
function validateForm(data) {
  const required = ['offer_id', 'supplier_id', 'item_id', 'msrp',
                    'street_price', 'promo_price', 'purchase_price_ht']

  for (let field of required) {
    if (!data[field]) {
      return { valid: false, error: `Missing field: ${field}` }
    }
  }

  if (data.msrp <= 0 || data.street_price <= 0 ||
      data.promo_price <= 0 || data.purchase_price_ht <= 0) {
    return { valid: false, error: 'All prices must be positive' }
  }

  return { valid: true }
}
```

### 2. Batch validation (futur)

Pour valider plusieurs items d'un coup (non implémenté actuellement) :

```javascript
// À venir : POST /api/validate-items (pluriel)
// Acceptera un array d'items
```

### 3. Cache

L'API ne cache pas les résultats. Vous pouvez cacher côté WeWeb si besoin.

## 🔐 Sécurité

### ✅ Ce que l'API fait
- Authentification par API Key
- Validation des données d'entrée
- Calculs internes sécurisés (COGS, marges)

### ❌ Ce que l'API ne renvoie PAS
- Coûts de transport détaillés
- Frais de douane exacts
- Seuils de marges O!Deal
- Break-even points
- Projections financières

→ Ces données sont confidentielles et réservées à O!Deal.

## 🧪 Tests

### Test avec données minimales

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: WEWEB_PRODUCTION_2025_API_KEY" \
  -d '{
    "offer_id": "1f218950-3789-4176-a883-958c593a84af",
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_id": "TEST12345",
    "msrp": 300,
    "street_price": 250,
    "promo_price": 200,
    "purchase_price_ht": 120
  }'
```

### Test avec données complètes

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: WEWEB_PRODUCTION_2025_API_KEY" \
  -d '{
    "offer_id": "1f218950-3789-4176-a883-958c593a84af",
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_id": "888413779764",
    "ean": "0888413779764",
    "product_name": "iPhone 15 Pro 256GB",
    "category_name": "Electronics",
    "subcategory_name": "Smartphones",
    "msrp": 1299,
    "street_price": 1199,
    "promo_price": 999,
    "purchase_price_ht": 750,
    "purchase_currency": "EUR",
    "quantity": 10,
    "package_weight_kg": 0.8
  }'
```

## 📊 Données automatiquement créées

Après validation, **O!Deal reçoit automatiquement** (invisible pour vous) :

### Table `offer_item_calculated_costs`
Un enregistrement par item avec tous les calculs détaillés.

### Table `offer_financial_projections`
Calculs agrégés au niveau de l'offre :
- Break-Even Point
- Risk Score A/B/C/D
- Scénarios financiers
- Alertes

→ Ces données sont pour analyse interne O!Deal uniquement.

## 🆘 Support

### Erreurs communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `401 Unauthorized` | Mauvaise API Key | Vérifier header X-API-Key |
| `400 Missing fields` | Champs requis manquants | Vérifier offer_id, supplier_id, item_id, 4 prix |
| `400 Positive prices` | Prix <= 0 | Tous les prix doivent être > 0 |
| `400 Invalid UUID` | Format UUID incorrect | offer_id et supplier_id doivent être des UUID valides |
| `500 Server error` | Erreur interne | Contacter support O!Deal |

### Contact

- Email : admin@odeal.ch
- Dashboard : https://app.odl-tools.ch
- Documentation : https://app.odl-tools.ch/api-docs

## 📅 Changelog

### 2025-10-26
- ✅ Retrait données sensibles (costs_breakdown, deal_thresholds)
- ✅ Ajout auto-calcul projections financières
- ✅ Support category_name et subcategory_name
- ✅ Documentation complète créée

### 2025-10-25
- ✅ API validation initiale
- ✅ Support item_id en TEXT (EAN/SKU)
- ✅ Règles métier hiérarchiques

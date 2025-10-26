# API Validation - Spécification Complète

## POST /api/validate-item

Valide une offre fournisseur et calcule les coûts, marges et deal status.

### Endpoint

```
POST https://api.odl-tools.ch/api/validate-item
```

### Authentication

Header requis :
```
X-API-Key: YOUR_API_KEY
```

### Request Body (JSON)

#### Champs Requis

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `offer_id` | UUID | Identifiant unique de l'offre | `"1f218950-3789-4176-a883-958c593a84af"` |
| `supplier_id` | UUID | Identifiant du fournisseur | `"334773ca-22ab-43bb-834f-eb50aa1d01f8"` |
| `item_id` | TEXT | Code produit (EAN/SKU/référence) | `"888413779764"` |
| `msrp` | NUMERIC | Prix de vente conseillé (MSRP) en CHF TTC | `300.00` |
| `street_price` | NUMERIC | Prix marché actuel en CHF TTC | `250.00` |
| `promo_price` | NUMERIC | Prix promo proposé en CHF TTC | `200.00` |
| `purchase_price_ht` | NUMERIC | Prix d'achat HT dans la devise d'origine | `120.00` |

#### Champs Optionnels mais Recommandés

| Champ | Type | Défaut | Description | Exemple |
|-------|------|--------|-------------|---------|
| `category_name` | TEXT | `null` | Catégorie produit (pour calcul douanes et règles métier) | `"Electronics"`, `"Computers"` |
| `subcategory_name` | TEXT | `null` | Sous-catégorie (pour règles métier spécifiques) | `"Laptops"`, `"Smartphones"` |
| `purchase_currency` | TEXT | `"CHF"` | Devise du prix d'achat | `"EUR"`, `"USD"`, `"CHF"` |
| `quantity` | INTEGER | `1` | Quantité proposée | `10` |
| `product_name` | TEXT | `null` | Nom du produit | `"iPhone 15 Pro 256GB"` |
| `ean` | TEXT | `item_id` | Code EAN si différent de item_id | `"0888462157490"` |

#### Champs Optionnels Avancés

| Champ | Type | Défaut | Description | Exemple |
|-------|------|--------|-------------|---------|
| `package_weight_kg` | NUMERIC | `0.5` | Poids du colis en kg | `1.2` |
| `pesa_fee_ht` | NUMERIC | `0` | Frais PESA HT si applicable | `2.50` |
| `warranty_cost_ht` | NUMERIC | `0` | Coût garantie HT si applicable | `15.00` |

### Exemple de Requête Complète

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "offer_id": "1f218950-3789-4176-a883-958c593a84af",
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_id": "888413779764",
    "ean": "0888413779764",
    "product_name": "Apple iPhone 15 Pro 256GB",
    "category_name": "Electronics",
    "subcategory_name": "Smartphones",
    "msrp": 1299.00,
    "street_price": 1199.00,
    "promo_price": 999.00,
    "purchase_price_ht": 750.00,
    "purchase_currency": "EUR",
    "quantity": 10,
    "package_weight_kg": 0.8,
    "pesa_fee_ht": 2.50,
    "warranty_cost_ht": 0
  }'
```

### Exemple de Requête Minimale

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "offer_id": "1f218950-3789-4176-a883-958c593a84af",
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_id": "888413779764",
    "msrp": 300.00,
    "street_price": 250.00,
    "promo_price": 200.00,
    "purchase_price_ht": 120.00
  }'
```

## Response

### Success Response

```json
{
  "success": true,
  "is_valid": true,
  "deal_status": "good",
  "cost_id": "d3e6a22b-efad-4f0c-864a-96a5bcc0e9ac",
  "validation_issues": [],
  "item_details": {
    "item_id": "888413779764",
    "ean": "0888413779764",
    "product_name": "Apple iPhone 15 Pro 256GB"
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
    "rule_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "rule_name": "Electronics - Smartphones Rules",
    "scope": "subcategory",
    "category": "Electronics",
    "subcategory": "Smartphones"
  }
}
```

### Response Fields

| Champ | Type | Description |
|-------|------|-------------|
| `success` | BOOLEAN | `true` si validation réussie |
| `is_valid` | BOOLEAN | `true` si deal accepté (status = top/good) |
| `deal_status` | TEXT | `"top"`, `"good"`, `"almost"`, ou `"bad"` |
| `cost_id` | UUID | ID du calcul de coût (référence interne) |
| `validation_issues` | ARRAY | Liste des problèmes détectés |
| `item_details` | OBJECT | Informations produit |
| `pricing` | OBJECT | Détail des prix et conversion devise |
| `applied_rule` | OBJECT | Règle métier appliquée pour validation |

### Deal Status Signification

| Status | Signification | Action |
|--------|---------------|--------|
| `"top"` | ⭐ Excellent deal | Publier immédiatement |
| `"good"` | ✅ Bon deal | Publier |
| `"almost"` | ⚠️ Deal marginal | Revoir ou publier selon contexte |
| `"bad"` | ❌ Deal refusé | Ne pas publier |

### Error Response

```json
{
  "success": false,
  "error": "Missing required fields: offer_id, item_id",
  "details": "...",
  "code": "..."
}
```

## Règles Métier Hiérarchiques

Les règles sont appliquées par ordre de priorité :

1. **Subcategory** - Règle spécifique à la sous-catégorie (si existe)
2. **Category** - Règle spécifique à la catégorie (si existe)
3. **Global** - Règle par défaut

**Important** : Pour bénéficier de règles spécifiques, vous DEVEZ fournir `category_name` et/ou `subcategory_name`.

### Catégories Disponibles

#### Products
- `Audio` (Speakers, Headphones, Microphones)
- `Cameras` (DSLR, Mirrorless, Action_Cameras)
- `Computers` (Laptops, Desktops, Tablets, Servers)
- `Electronics` (Smartphones, Wearables, Smart_Home)
- `Gaming` (Consoles, PC_Gaming, VR)
- `Home_Appliances` (Kitchen, Cleaning, Climate_Control)
- `Networking` (Routers, Switches, Access_Points)
- `Office` (Printers, Scanners, Projectors)
- `Storage` (HDD, SSD, NAS, Memory_Cards)
- `TV_Video` (TVs, Monitors, Streaming_Devices)

#### Services
- `Consultation`
- `Installation` (Hardware, Software, Network)
- `Maintenance` (Support_Plans, Extended_Warranty)
- `Repair` (Hardware_Repair, Software_Repair)
- `Subscription` (Software_Licenses, Cloud_Storage, Streaming)
- `Training` (Technical, End_User, Certification)

## Calculs Automatiques

L'API calcule automatiquement (en interne, non exposé) :

1. **Conversion devise** avec coefficient de sécurité (1.02 par défaut)
2. **Frais de logistique** (transport, réception, préparation)
3. **Droits de douane** basés sur la catégorie produit
4. **Frais de traitement paiement** (% + fixe)
5. **COGS total** (Cost of Goods Sold)
6. **Marges brutes** (absolue et pourcentage)
7. **Économies client** (vs MSRP et vs Street Price)

## Projections Financières Automatiques

Après validation d'items, la table `offer_financial_projections` est automatiquement alimentée avec :

- Nombre d'items total et publiables
- CA maximum potentiel
- Marge brute moyenne
- **Break-Even Point (BEP)** : CA minimum, unités à vendre, % sellthrough
- **Risk Score** : A (très faible risque) → D (risque élevé)
- **Scénarios** : pessimiste (25%), réaliste (50%), optimiste (75%)

⚠️ **Note** : Ces projections sont des données internes O!Deal et ne sont pas exposées via l'API.

## Rate Limiting

- **Aucune limite** actuellement
- Authentification par API Key requise

## Support

Pour toute question ou demande de clé API :
- Dashboard : https://app.odl-tools.ch
- Contact : admin@odeal.ch

## Changelog

### 2025-10-26
- ✅ Retrait des données sensibles (costs_breakdown, deal_thresholds)
- ✅ Ajout auto-calcul projections financières
- ✅ Support category_name et subcategory_name

### 2025-10-25
- ✅ Création API validation initiale
- ✅ Support item_id en TEXT (EAN/SKU)
- ✅ Règles métier hiérarchiques

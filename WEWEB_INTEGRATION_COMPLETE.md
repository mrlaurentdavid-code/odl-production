# ✅ Configuration WeWeb - API Validation O!Deal

## 📋 Informations de Connexion

### Supplier créé avec succès
- **Supplier ID**: `334773ca-22ab-43bb-834f-eb50aa1d01f8`
- **Nom**: WeWeb Supplier - AdminTest
- **Email**: admin@test.fr
- **Statut**: ✅ Actif & Approuvé
- **Quota**: 10,000 requêtes/jour

### Clé API
```
WEWEB_PRODUCTION_2025_API_KEY
```

---

## 🔧 Configuration WeWeb - REST API Data Source

### 1. Créer une nouvelle Data Source REST API

Dans WeWeb, allez dans **Data > Add a data source > REST API**

### 2. Configuration de base

| Paramètre | Valeur |
|-----------|--------|
| **Name** | O!Deal Validation API |
| **Base URL** | `https://api.odl-tools.ch` |
| **Authentication** | Custom Headers |

### 3. Headers (Authentication)

Ajoutez ces headers globaux pour toutes les requêtes:

```
Content-Type: application/json
X-API-Key: WEWEB_PRODUCTION_2025_API_KEY
```

### 4. Créer la Collection "Validate Item"

#### Endpoint Configuration
- **Method**: `POST`
- **Path**: `/api/validate-item`
- **Description**: Valide une offre fournisseur et calcule COGS, marges, économies

#### Request Body (JSON)

Utilisez les bindings WeWeb pour connecter vos formulaires:

```json
{
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
  "offer_id": "{{context.offer_id}}",
  "item_id": "{{context.item_id}}",
  "msrp": {{context.msrp}},
  "street_price": {{context.street_price}},
  "promo_price": {{context.promo_price}},
  "purchase_price_ht": {{context.purchase_price_ht}},
  "purchase_currency": "{{context.currency}}",
  "category_name": "{{context.category}}",
  "subcategory_name": "{{context.subcategory}}",
  "product_name": "{{context.product_name}}",
  "package_weight_kg": {{context.weight}},
  "quantity": {{context.quantity}}
}
```

---

## 📝 Champs Requis vs Optionnels

### ✅ Champs OBLIGATOIRES

| Champ | Type | Description |
|-------|------|-------------|
| `supplier_id` | UUID | Toujours `334773ca-22ab-43bb-834f-eb50aa1d01f8` |
| `offer_id` | UUID | ID unique de l'offre |
| `item_id` | UUID | ID unique de l'article |
| `msrp` | number | Prix MSRP TTC en CHF |
| `street_price` | number | Prix street/market TTC en CHF |
| `promo_price` | number | Prix promo O!Deal TTC en CHF |
| `purchase_price_ht` | number | Prix d'achat HT (dans la devise achat) |

### 🔹 Champs OPTIONNELS (mais recommandés)

| Champ | Type | Défaut | Description |
|-------|------|--------|-------------|
| `purchase_currency` | string | `"CHF"` | EUR, USD, GBP ou CHF |
| `category_name` | string | `null` | Pour règles hiérarchiques (ex: "Electronics") |
| `subcategory_name` | string | `null` | Pour règles spécifiques (ex: "Smartphones") |
| `product_name` | string | `null` | Nom du produit |
| `ean` | string | `null` | Code-barres EAN |
| `package_weight_kg` | number | `null` | Poids en kg |
| `quantity` | number | `1` | Quantité |
| `pesa_fee_ht` | number | `0` | Frais PESA HT |
| `warranty_cost_ht` | number | `0` | Coût garantie HT |

---

## 📊 Structure de la Réponse

### Réponse en cas de succès

```json
{
  "success": true,
  "is_valid": true,
  "deal_status": "top",
  "cost_id": "uuid...",
  "offer_id": "uuid...",
  "item_id": "uuid...",

  "costs": {
    "purchase_price_ht": 90.00,
    "purchase_price_chf_ht": 83.23,
    "currency_rate": 0.9248,
    "currency_safety_coef": 1.02,
    "logistics_inbound_ht": 7.50,
    "logistics_inbound_carrier": "DHL",
    "logistics_outbound_ht": 8.40,
    "logistics_outbound_carrier": "Swiss Post",
    "customs_duty_ht": 0.00,
    "customs_duty_rate": 0,
    "tar_ht": 0,
    "pesa_fee_ht": 0,
    "warranty_cost_ht": 0,
    "payment_fee_ht": 3.75,
    "cogs_total_ht": 103.88,
    "cogs_total_ttc": 112.29
  },

  "margins": {
    "marge_brute_chf": 6.71,
    "marge_brute_percent": 5.64,
    "minimum_margin": 20,
    "target_margin": 30,
    "maximum_margin": 50
  },

  "savings": {
    "eco_vs_msrp_chf": 80.00,
    "eco_vs_msrp_percent": 40.20,
    "eco_vs_street_chf": 3.00,
    "eco_vs_street_percent": 2.46
  },

  "metadata": {
    "validated_at": "2025-10-26T...",
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "user_id": null,
    "product_name": "Test Product",
    "category_name": "Electronics",
    "subcategory_name": null,
    "rule_scope": "global",
    "rule_id": "uuid...",
    "gaming_detected": false
  },

  "validation_issues": [
    {
      "type": "margin_too_low",
      "message": "Marge brute trop faible: 5.64% (min: 20%)"
    }
  ]
}
```

### Deal Status (4 niveaux)

| Status | Signification | Conditions |
|--------|---------------|------------|
| `"top"` | ⭐ Excellent deal | Marge ≥30% ET (Éco MSRP ≥40% OU Éco Street ≥25%) |
| `"good"` | ✅ Bon deal | Marge ≥25% ET Éco MSRP ≥30% ET Éco Street ≥18% |
| `"almost"` | ⚠️ Deal limite | Marge ≥20% mais économies insuffisantes |
| `"bad"` | ❌ Deal refusé | Marge <20% OU économies <seuils |

---

## 🎨 Affichage dans WeWeb

### Exemple de binding pour afficher le statut

```javascript
// Badge coloré selon le statut
{{api_response.deal_status === 'top' ? 'Excellent Deal' :
  api_response.deal_status === 'good' ? 'Bon Deal' :
  api_response.deal_status === 'almost' ? 'Deal Limite' :
  'Deal Refusé'}}
```

### Classes CSS conditionnelles

```javascript
// Couleur du badge
{{api_response.deal_status === 'top' ? 'bg-green-500' :
  api_response.deal_status === 'good' ? 'bg-blue-500' :
  api_response.deal_status === 'almost' ? 'bg-orange-500' :
  'bg-red-500'}}
```

### Afficher les problèmes de validation

```javascript
// Boucle sur validation_issues
{{api_response.validation_issues[0].message}}
```

---

## 🧪 Exemple de Test cURL

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: WEWEB_PRODUCTION_2025_API_KEY" \
  -d '{
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "offer_id": "123e4567-e89b-12d3-a456-426614174000",
    "item_id": "123e4567-e89b-12d3-a456-426614174001",
    "msrp": 199.00,
    "street_price": 122.00,
    "promo_price": 119.00,
    "purchase_price_ht": 90.00,
    "purchase_currency": "EUR",
    "category_name": "Electronics",
    "product_name": "Samsung Galaxy Buds"
  }'
```

---

## 🔐 Sécurité & Rate Limiting

- **Authentification**: Clé API hashée en SHA256 côté serveur
- **Quota journalier**: 10,000 requêtes/jour
- **CORS**: Activé pour tous les domaines WeWeb (*.weweb.io)
- **HTTPS**: Obligatoire (certificat Let's Encrypt)

---

## 🆘 Codes d'Erreur

| Code | Message | Cause |
|------|---------|-------|
| 400 | Missing required fields | Champs obligatoires manquants |
| 401 | Invalid or missing API key | Clé API incorrecte ou absente |
| 404 | Supplier not found | Supplier ID invalide |
| 429 | Rate limit exceeded | Quota journalier dépassé |
| 500 | Internal server error | Erreur serveur |

---

## ⚙️ Règles Métier Hiérarchiques (Nouveau!)

L'API supporte maintenant des règles hiérarchiques:

1. **Règle Globale** (par défaut) - S'applique à tous les deals
2. **Règle par Catégorie** - Ex: "Electronics" avec marges plus strictes
3. **Règle par Sous-catégorie** - Ex: "Smartphones" avec règles spécifiques

Pour utiliser les règles hiérarchiques, incluez `category_name` et/ou `subcategory_name` dans votre requête.

### Exemple avec catégorie

```json
{
  "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
  "category_name": "Electronics",
  "msrp": 199,
  ...
}
```

La réponse inclura `metadata.rule_scope` et `metadata.rule_id` pour voir quelle règle a été appliquée.

---

## 📞 Support

Pour toute question ou problème:
- Vérifiez que vous utilisez bien le supplier ID exact
- Vérifiez que la clé API est correcte (sans espaces)
- Assurez-vous que tous les champs requis sont présents
- Les nombres doivent être envoyés sans guillemets (not "119" but 119)

**Note**: Si vous rencontrez une erreur "table does not exist", contactez l'équipe technique - certaines tables de logistique peuvent ne pas encore être déployées en production.

---

## ✅ Checklist de Configuration WeWeb

- [ ] Data Source REST API créée
- [ ] Base URL configurée: `https://api.odl-tools.ch`
- [ ] Header `X-API-Key` ajouté avec la bonne valeur
- [ ] Collection "Validate Item" créée avec méthode POST
- [ ] Request body configuré avec supplier_id fixe
- [ ] Bindings WeWeb créés pour les champs du formulaire
- [ ] Affichage conditionnel du deal_status configuré
- [ ] Gestion des erreurs (validation_issues) implémentée
- [ ] Test réussi avec données réelles

---

Date de création: 2025-10-26
Version de l'API: 1.0.0
Dernière mise à jour: 2025-10-26

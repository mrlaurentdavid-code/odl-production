# Plan d'Intégration TAR + Transport dans Validation API

## Architecture

```
WeWeb
  ↓ (1 requête avec toutes les données)
API Validation (/api/validate-item)
  ├─→ TAR API (https://tar.odl-tools.ch/api/calculate-tar-odeal)
  ├─→ Transport API (https://app.odl-tools.ch/api/calculate-transport)
  └─→ PostgreSQL Function (validate_and_calculate_item)
      └─→ Calcule PESA + Marges
  ↓
WeWeb (réponse complète avec TAR, Transport, PESA, Marges)
```

## Appels APIs

### 1. TAR API
**Endpoint**: `POST https://tar.odl-tools.ch/api/calculate-tar-odeal`

**Input**:
```json
{
  "ean": "5099206071131",
  "description": "Clavier Logitech",
  "subcategory": "keyboard_mouse",
  "poids": 0.5
}
```

**Output**:
```json
{
  "success": true,
  "tariff": "0.30",
  "category": "small_it",
  "organisme": "SWICO"
}
```

### 2. Transport API
**Endpoint**: `POST https://app.odl-tools.ch/api/calculate-transport`

**Input**:
```json
{
  "length_cm": 30,
  "width_cm": 45,
  "height_cm": 30,
  "weight_kg": 1.5,
  "quantity": 100,
  "provider_id": "ohmex"
}
```

**Output**:
```json
{
  "success": true,
  "delivery_options": [{
    "provider": "DHL",
    "base_cost": 15.0,
    "cost_per_unit": 0.15,
    "total_cost": 1500.0
  }]
}
```

## Modifications à faire

### Route Handler (/api/validate-item/route.ts)

1. **Appeler TAR API** si `contain_battery = true`
2. **Appeler Transport API** si dimensions fournies
3. **Passer les résultats** à la fonction PostgreSQL
4. **Retourner réponse enrichie** à WeWeb

### Migration 25

Simplifier la fonction PostgreSQL :
- Recevoir `tar_ht` (du TAR API)
- Recevoir `transport_cost_ht` (du Transport API)
- Calculer PESA uniquement
- Pas besoin de logique transport (déjà fait)

## Flux de données

```
WeWeb envoie:
{
  "product_name": "Clavier Logitech K270",
  "ean": "5099206071131",
  "subcategory_id": "s5",
  "contain_battery": true,
  "length_cm": 30,
  "width_cm": 45,
  "height_cm": 30,
  "weight_kg": 1.5,
  "quantity": 100,
  "shipping_origin": "DE",
  ...
}

Route handler:
1. Appelle TAR → tar_ht = 0.30
2. Appelle Transport → transport_cost_ht = 15.0
3. Appelle PostgreSQL avec tar_ht + transport_cost_ht
4. PostgreSQL calcule PESA = 25.50 (exemple)
5. PostgreSQL calcule marges
6. Retourne à WeWeb:
{
  "success": true,
  "costs": {
    "tar_ht": 0.30,
    "transport_cost_ht": 15.0,
    "pesa_fee_ht": 25.50,
    "cogs_ht": 140.80
  },
  "margins": {
    "marge_brute_percent": 15.2
  },
  ...
}
```

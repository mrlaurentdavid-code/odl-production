# Guide d'Intégration WeWeb - API Validation O!Deal

## 🎯 Vue d'ensemble

Ce guide vous explique comment configurer WeWeb pour appeler l'API de Validation O!Deal et afficher les résultats.

---

## 📋 ÉTAPE 1: Exécuter le Script SQL

**Allez sur**: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus/sql/new

**Copiez-collez le contenu du fichier**:
```
applications/odl-tools/supabase/migrations/setup_weweb_test_data.sql
```

**Cliquez sur** `Run` pour exécuter le script.

### ✅ Ce que le script créé:

- **Clé API**: `WEWEB_TEST_2025` (hash SHA256 stocké en base)
- **Fournisseur**: AdminTest (334773ca-22ab-43bb-834f-eb50aa1d01f8)
- **Règles métier**: 6 règles (marges 15%, 17%, 20%, 25%, savings 5%, 15%)
- **Taux de douane**: 9 catégories (Computers 0%, Electronics 3.7%, etc.)

---

## 🔧 ÉTAPE 2: Configuration WeWeb

### 2.1 Créer les Variables

Dans WeWeb, allez dans **Settings > Variables** et créez:

| Variable Name | Type | Value |
|--------------|------|-------|
| `API_BASE_URL` | Text | `https://api.odl-tools.ch` |
| `API_KEY` | Text | `WEWEB_TEST_2025` |
| `SUPPLIER_ID` | Text | `334773ca-22ab-43bb-834f-eb50aa1d01f8` |

### 2.2 Créer une REST API Collection

1. **Allez dans**: WeWeb Editor > Data Sources
2. **Cliquez sur**: Add Data Source > REST API
3. **Nommez-la**: `ODeal Validation API`

---

## 🌐 ÉTAPE 3: Configurer l'API Call

### 3.1 Settings de Base

```
Name: validateOffer
Method: POST
Base URL: {{API_BASE_URL}}/api/validate-item
```

### 3.2 Headers

Ajoutez ces headers:

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `X-API-Key` | `{{API_KEY}}` |

### 3.3 Request Body

**Type**: Raw JSON

```json
{
  "supplier_id": "{{SUPPLIER_ID}}",
  "item_name": "{{form.item_name}}",
  "supplier_price_chf": {{form.supplier_price}},
  "quantity": {{form.quantity}},
  "category": "{{form.category}}",
  "supplier_reference": "{{form.reference}}",
  "supplier_notes": "{{form.notes}}"
}
```

### 3.4 Response Mapping

WeWeb détectera automatiquement la structure de la réponse:

```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "deal_status": "top",
    "margin_percentage": 42.5,
    "savings_percentage": 18.2,
    "cogs_total_chf": 1350.75,
    "breakdown": {
      "supplier_cost": 12000.00,
      "transport_cost": 450.00,
      "customs_duty": 444.00,
      "logistics_cost": 156.75
    },
    "pricing": {
      "recommended_price_chf": 1856.25,
      "minimum_price_chf": 1552.36
    }
  }
}
```

---

## 🎨 ÉTAPE 4: Créer le Formulaire

### 4.1 Éléments du Formulaire

Créez un **Container** avec ces éléments:

#### A) Input - Nom du produit
```
Element: Input Text
Bind to: form.item_name
Placeholder: "Ex: Laptop Dell XPS 15"
Required: Yes
```

#### B) Input - Prix fournisseur
```
Element: Input Number
Bind to: form.supplier_price
Placeholder: "Ex: 1200.00"
Min: 0
Step: 0.01
Required: Yes
Suffix: "CHF"
```

#### C) Input - Quantité
```
Element: Input Number
Bind to: form.quantity
Placeholder: "Ex: 10"
Min: 1
Step: 1
Required: Yes
```

#### D) Select - Catégorie
```
Element: Select
Bind to: form.category
Required: Yes

Options:
- Computers (Ordinateurs - 0% douane)
- Electronics (Électronique - 3.7% douane)
- Clothing (Vêtements - 12% douane)
- Toys (Jouets - 4.7% douane)
- Sports (Articles de sport - 2.7% douane)
- Home Appliances (Électroménager - 2.5% douane)
- Furniture (Meubles - 0% douane)
- Books (Livres - 0% douane)
- Audio (Équipements audio - 0% douane)
```

#### E) Input - Référence (optionnel)
```
Element: Input Text
Bind to: form.reference
Placeholder: "Ex: DELL-XPS-001"
Required: No
```

#### F) Input - Notes (optionnel)
```
Element: Textarea
Bind to: form.notes
Placeholder: "Notes supplémentaires..."
Required: No
```

### 4.2 Bouton de Soumission

```
Element: Button
Text: "Valider l'offre"
Action: Execute Workflow
```

---

## ⚙️ ÉTAPE 5: Créer le Workflow

### Workflow: "Validate Offer"

#### Action 1: Valider le formulaire
```
Action: Validate Form
Form: (select your form)
```

#### Action 2: Appeler l'API
```
Action: Execute API Request
API: validateOffer
```

#### Action 3: Afficher le résultat
```
Action: Toggle Element
Element: results_container
Show: Yes
```

---

## 📊 ÉTAPE 6: Afficher les Résultats

### 6.1 Container Principal

Créez un **Container** (`results_container`) initialement caché.

### 6.2 Badge de Statut

```
Element: Text / Badge
Content: {{validateOffer.data.deal_status}}

Conditional Styling:
- IF deal_status == "top"
  → Background: Green (#16a34a)
  → Text: "⭐ TOP DEAL"

- IF deal_status == "good"
  → Background: Blue (#2563eb)
  → Text: "✅ GOOD DEAL"

- IF deal_status == "almost_good"
  → Background: Orange (#ea580c)
  → Text: "⚠️ ALMOST GOOD"

- IF deal_status == "bad"
  → Background: Red (#dc2626)
  → Text: "❌ BAD DEAL"
```

### 6.3 Métriques Principales

```html
┌─────────────────────────────────────────────┐
│ Statut: [Badge Deal Status]                │
├─────────────────────────────────────────────┤
│                                             │
│ 💰 Marge: {{validateOffer.data.margin_percentage}}%  │
│ 💵 Savings: {{validateOffer.data.savings_percentage}}% │
│ 📦 COGS Total: {{validateOffer.data.cogs_total_chf}} CHF │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.4 Tableau de Breakdown

Créez un **Table** ou **Grid** avec:

| Élément | Montant (CHF) |
|---------|---------------|
| Coût fournisseur | {{validateOffer.data.breakdown.supplier_cost}} |
| Transport | {{validateOffer.data.breakdown.transport_cost}} |
| Douane | {{validateOffer.data.breakdown.customs_duty}} |
| Logistique | {{validateOffer.data.breakdown.logistics_cost}} |
| **COGS Total** | **{{validateOffer.data.cogs_total_chf}}** |

### 6.5 Prix Recommandés

```html
┌─────────────────────────────────────────────┐
│ 📈 Prix Recommandé                          │
│ {{validateOffer.data.pricing.recommended_price_chf}} CHF    │
├─────────────────────────────────────────────┤
│ 📉 Prix Minimum                             │
│ {{validateOffer.data.pricing.minimum_price_chf}} CHF        │
└─────────────────────────────────────────────┘
```

### 6.6 Indicateur Validité

```
Element: Alert / Banner
Show IF: validateOffer.data.is_valid == false

Message: "⚠️ Cette offre ne respecte pas les critères minimaux (marge < 15%)"
Color: Red
```

---

## 🧪 ÉTAPE 7: Tester avec des Exemples

### Test 1: TOP DEAL ⭐
```
Nom: Laptop Dell XPS 15
Prix: 800.00 CHF
Quantité: 10
Catégorie: Computers

Résultat attendu:
✅ is_valid: true
✅ deal_status: "top"
✅ margin_percentage: > 25%
```

### Test 2: GOOD DEAL ✅
```
Nom: iPhone 15 Pro
Prix: 1000.00 CHF
Quantité: 5
Catégorie: Electronics

Résultat attendu:
✅ is_valid: true
✅ deal_status: "good"
✅ margin_percentage: 20-25%
```

### Test 3: ALMOST GOOD ⚠️
```
Nom: Samsung Galaxy S24
Prix: 1100.00 CHF
Quantité: 5
Catégorie: Electronics

Résultat attendu:
✅ is_valid: true
✅ deal_status: "almost_good"
✅ margin_percentage: 15-20%
```

### Test 4: BAD DEAL ❌
```
Nom: Tablet basique
Prix: 1400.00 CHF
Quantité: 3
Catégorie: Electronics

Résultat attendu:
❌ is_valid: false
❌ deal_status: "bad"
❌ margin_percentage: < 15%
```

---

## 🎨 ÉTAPE 8: Styling Recommandé

### Design System

#### Couleurs par Status

```css
/* Top Deal */
Background: #dcfce7 (green-100)
Border: #16a34a (green-600)
Text: #166534 (green-800)

/* Good Deal */
Background: #dbeafe (blue-100)
Border: #2563eb (blue-600)
Text: #1e40af (blue-800)

/* Almost Good */
Background: #fed7aa (orange-100)
Border: #ea580c (orange-600)
Text: #9a3412 (orange-800)

/* Bad Deal */
Background: #fee2e2 (red-100)
Border: #dc2626 (red-600)
Text: #991b1b (red-800)
```

#### Typographie

```
Headings:
- Font: Inter, system-ui
- Weight: 600 (Semibold)

Body:
- Font: Inter, system-ui
- Weight: 400 (Regular)

Numbers (metrics):
- Font: JetBrains Mono, monospace
- Weight: 500 (Medium)
```

---

## 🔒 ÉTAPE 9: Gestion des Erreurs

### Error Handling

Ajoutez un **Action** dans le workflow après l'API call:

```
Action: Condition
IF: validateOffer.error exists

THEN:
  - Show Alert
  - Message: "Erreur: {{validateOffer.error.message}}"
  - Type: Error
```

### Messages d'Erreur Possibles

| Code | Message | Solution |
|------|---------|----------|
| 400 | Missing required fields | Vérifier que tous les champs requis sont remplis |
| 401 | Invalid API key | Vérifier la variable `API_KEY` |
| 404 | Supplier not found | Vérifier la variable `SUPPLIER_ID` |
| 429 | Rate limit exceeded | Attendre quelques secondes avant de réessayer |
| 500 | Server error | Contacter le support technique |

---

## 📱 ÉTAPE 10: Responsive Design

### Breakpoints

```
Mobile (< 640px):
- Stack all elements vertically
- Full width inputs
- Larger touch targets (min 44px)

Tablet (640px - 1024px):
- 2 columns for inputs
- Full width results

Desktop (> 1024px):
- 2 columns for form
- Side-by-side results display
```

---

## 🚀 CHECKLIST DE DÉPLOIEMENT

Avant de passer en production, vérifiez:

- [ ] Script SQL exécuté sur Supabase
- [ ] Variables WeWeb configurées (API_KEY, SUPPLIER_ID)
- [ ] API call testée avec succès
- [ ] Formulaire validé avec tous les champs requis
- [ ] Workflow complet fonctionnel
- [ ] Affichage des 4 types de deals (top/good/almost/bad)
- [ ] Error handling implémenté
- [ ] Styling responsive testé
- [ ] Tests avec les 4 exemples réussis
- [ ] Documentation utilisateur créée

---

## 📞 Support

### Tester l'API directement

```bash
curl -X POST https://api.odl-tools.ch/api/validate-item \
  -H "Content-Type: application/json" \
  -H "X-API-Key: WEWEB_TEST_2025" \
  -d '{
    "supplier_id": "334773ca-22ab-43bb-834f-eb50aa1d01f8",
    "item_name": "Laptop Dell XPS 15",
    "supplier_price_chf": 800.00,
    "quantity": 10,
    "category": "Computers"
  }'
```

### Documentation API

https://app.odl-tools.ch/api-docs

### Repository GitHub

https://github.com/mrlaurentdavid-code/odl-production

---

## 🎓 Ressources Complémentaires

- **WeWeb Documentation**: https://docs.weweb.io
- **Supabase Dashboard**: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus
- **API Endpoint**: https://api.odl-tools.ch/api/validate-item

---

**✅ Félicitations !** Vous avez maintenant une intégration complète de l'API Validation O!Deal dans WeWeb.

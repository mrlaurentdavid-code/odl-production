# Améliorations pour atteindre le niveau de l'agent OpenAI

## Résumé des améliorations effectuées

### ✅ Ce qui a été fait:
1. Migration d'OpenAI vers Anthropic Claude
2. Ajout de la catégorie "peripherique" pour les claviers, souris, etc.
3. Amélioration du prompt de catégorisation avec des exemples explicites
4. Nettoyage du cache pour le clavier Logitech
5. Test réussi: clavier sans fil → CHF 0.50 (correct)

### 🔧 Ce qui reste à améliorer (inspiré de l'agent OpenAI):

## 1. **Recherche intelligente de spécifications manquantes**

L'agent OpenAI trouve automatiquement:
- La taille d'écran des tablettes/ordinateurs
- Le poids exact des produits
- Le modèle précis à partir de l'EAN

**Solution à implémenter:**
```javascript
// Dans server.js, ligne 826+
// Utiliser Anthropic avec "extended thinking" pour rechercher les specs
const webSearch = await anthropic.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: `Recherche toutes les spécifications pour l'EAN ${ean}.
    IMPORTANT: Trouve la taille d'écran en pouces pour les tablettes/ordinateurs.`
  }]
});
```

## 2. **Proposer plusieurs options de TAR**

Quand la taille n'est pas connue, l'agent OpenAI propose 3 options:
- Tablet jusqu'à 8.9" → CHF 0.50
- Tablet 9" – 14.9" → CHF 2.50
- Tablet de plus de 15" → CHF 6.00

**Solution à implémenter:**
```javascript
// Modifier calculateTAR() pour retourner des alternatives
function calculateTAR(productData) {
  // ...
  if (categorie === 'tablette' && !taille_pouces) {
    // Retourner 3 options possibles
    return {
      tarifHT: '2.31', // Option la plus probable
      typeApplique: 'Tablette 9-14.9" (à confirmer)',
      alternatives: [
        { size: 'jusqu\'à 8.9"', tarifHT: '0.46', tarifTTC: '0.50' },
        { size: '9-14.9"', tarifHT: '2.31', tarifTTC: '2.50' },
        { size: '15"+', tarifHT: '5.57', tarifTTC: '6.00' }
      ]
    };
  }
}
```

## 3. **Analyse contextuelle plus fine**

L'agent OpenAI inclut:
- Remarques sur les batteries intégrées
- Informations sur la transparence des prix (CAR inclus)
- Vérification de l'organisme collecteur exact

**Solution:**
Enrichir la réponse avec un champ `analysis`:
```javascript
res.json({
  success: true,
  product: { /* ... */ },
  tar: { /* ... */ },
  analysis: {
    notes: [
      "Les batteries intégrées sont couvertes par le CAR Swico",
      "Le CAR/ARC est inclus dans le prix consommateur"
    ],
    alternatives: alternatives || null,
    specs_missing: enrichedData.specs_missing || []
  }
});
```

## 4. **Utiliser l'API EAN systématiquement**

Actuellement, l'API EAN (ean-search.org) est utilisée mais pas exploitée au maximum.

**Amélioration:**
```javascript
// Ligne 865+ : Exploiter davantage les données EAN
if (eanData) {
  // Utiliser les données EAN comme source fiable
  enrichedData.brand = eanData.brand || enrichedData.brand;
  enrichedData.product_name = eanData.name || enrichedData.product_name;

  // Augmenter la confiance si l'EAN est trouvé
  if (eanData.name) {
    enrichedData.confidence = Math.max(enrichedData.confidence, 85);
  }
}
```

## 5. **Format de réponse professionnel**

L'agent OpenAI retourne une analyse structurée avec:
- ✅ Titre clair ("Voici mon analyse pour l'EAN...")
- ✅ Bullet points organisés
- ✅ Options de TAR clairement présentées
- ✅ Remarques importantes en fin

**Solution:**
Ajouter un champ `formatted_response` pour l'affichage:
```javascript
formatted_response: `
# Analyse TAR pour ${enrichedData.product_name}

**Produit:** ${enrichedData.product_name}
**Catégorie officielle:** ${categData.categorie}
**TVA Suisse:** ${tvaRate}%
**Organisme collecteur:** ${categData.organisme}

${alternatives ? '## Options de TAR possibles:\n' + alternatives.map(alt =>
  `- ${alt.size}: CHF ${alt.tarifHT} (HT) / CHF ${alt.tarifTTC} (TTC)`
).join('\n') : ''}

**Remarques:**
- Le CAR/ARC est inclus dans le prix consommateur
${enrichedData.specs_missing.length > 0 ?
  '- Spécifications manquantes: ' + enrichedData.specs_missing.join(', ') : ''}
`
```

## 6. **Gestion intelligente des tablettes**

Problème actuel: Les tablettes sont toutes catégorisées à CHF 0.46, alors que le tarif dépend de la taille.

**Barème officiel Swico 2026 pour les tablettes:**
- Jusqu'à 8.9" → CHF 0.46
- 9" à 14.9" → CHF 2.31
- 15" et plus → CHF 5.57

**Solution:**
```javascript
// Dans calculateTAR(), ligne ~475
else if (categorie === 'tablette') {
  const taille = taille_pouces;

  if (!taille) {
    // Taille inconnue → retourner options multiples
    return {
      tarifHT: '2.31', // Choix par défaut (le plus courant)
      typeApplique: 'Tablette 9-14.9" (taille non confirmée)',
      alternatives: [
        {
          size: 'jusqu\'à 8.9"',
          tarifHT: '0.46',
          tarifTTC: '0.50',
          designation: 'Tablet jusqu\'à 8.9"'
        },
        {
          size: '9" – 14.9"',
          tarifHT: '2.31',
          tarifTTC: '2.50',
          designation: 'Tablet 9" – 14.9"'
        },
        {
          size: '15"+',
          tarifHT: '5.57',
          tarifTTC: '6.00',
          designation: 'Tablet de plus de 15"'
        }
      ]
    };
  }

  // Taille connue → appliquer le bon tarif
  if (taille <= 8.9) {
    tarifHT = 0.46;
    typeApplique = 'Tablet jusqu\'à 8.9"';
  } else if (taille < 15) {
    tarifHT = 2.31;
    typeApplique = 'Tablet 9" – 14.9"';
  } else {
    tarifHT = 5.57;
    typeApplique = 'Tablet de plus de 15"';
  }
}
```

## 7. **Recherche active de la taille d'écran**

Pour les tablettes Lenovo (comme l'EAN 0198153749096), le système doit:
1. Rechercher sur Google le modèle exact
2. Extraire la taille d'écran
3. Appliquer le bon tarif

**Code à ajouter:**
```javascript
// Si c'est une tablette et qu'on n'a pas la taille
if (categData.categorie === 'tablette' && !enrichedData.screen_size_inches) {
  console.log(`🔍 Recherche de la taille d'écran pour la tablette...`);

  const sizeSearchPrompt = `Pour le produit ${enrichedData.product_name} (EAN: ${ean}),
  recherche et trouve la taille exacte de l'écran en pouces.

  Cherche dans:
  - Les spécifications techniques du fabricant
  - Les sites de vente en ligne (Amazon, etc.)
  - Les bases de données de produits

  Retourne JSON: {"screen_size_inches": nombre, "source": "où tu as trouvé l'info"}`;

  try {
    const sizeSearch = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      temperature: 0,
      messages: [{role: "user", content: sizeSearchPrompt}]
    });

    const sizeResult = JSON.parse(
      sizeSearch.content.find(b => b.type === "text")?.text || "{}"
    );

    if (sizeResult.screen_size_inches) {
      enrichedData.screen_size_inches = sizeResult.screen_size_inches;
      console.log(`   ✅ Taille trouvée: ${sizeResult.screen_size_inches}" (source: ${sizeResult.source})`);
    }
  } catch (e) {
    console.log(`   ⚠️ Impossible de trouver la taille d'écran`);
  }
}
```

## 8. **Tester avec la tablette Lenovo**

Une fois les améliorations en place, tester avec:
```bash
curl -X POST http://localhost:3000/api/calculate-tar-v2 \
  -H "Content-Type: application/json" \
  -d '{"ean":"0198153749096","description":"tablette lenovo"}'
```

**Résultat attendu:**
```json
{
  "success": true,
  "product": {
    "nom_produit": "Lenovo Tab [modèle exact]",
    "marque": "Lenovo",
    "screen_size_inches": 10.1
  },
  "tar": {
    "organisme": "SWICO",
    "categorie": "tablette",
    "type": "Tablet 9\" – 14.9\"",
    "tarifHT": "2.31",
    "tarifTTC": "2.50"
  },
  "analysis": {
    "alternatives": null,
    "notes": [
      "Taille d'écran confirmée: 10.1\"",
      "Les batteries intégrées sont couvertes par le CAR Swico"
    ]
  }
}
```

## 9. **Prochaines étapes immédiates**

1. ✅ Modifier `calculateTAR()` pour gérer les tablettes par taille
2. ✅ Ajouter la recherche de taille d'écran si manquante
3. ✅ Retourner les `alternatives` dans la réponse JSON
4. ✅ Enrichir la réponse avec le champ `analysis`
5. ✅ Tester avec plusieurs EAN de tablettes

## Conclusion

L'agent OpenAI est plus fin car il:
- **Recherche activement** les informations manquantes
- **Propose plusieurs options** quand il y a ambiguïté
- **Documente ses trouvailles** avec des sources
- **Applique le barème exact** en fonction de la taille

Avec ces améliorations, l'agent Anthropic sera au même niveau de qualité.

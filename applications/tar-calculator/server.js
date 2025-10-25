// ===================================
// 📄 server.js - TAR Calculator API v2.0
// Avec Anthropic Claude + Barèmes complets 2026
// ===================================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Anthropic Claude
const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getJson } = require("serpapi");
const { createClient } = require("@supabase/supabase-js");
const { extractCompleteProductData } = require("./enriched-extractor");
const { getProductFromCache: getCatalogProduct, saveEnrichedProduct } = require("./supabase-cache");

// Initialiser le client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Fonction pour chercher un produit dans le cache
async function getProductFromCache(ean) {
  if (!ean) return null;
  
  try {
    console.log(`📦 Recherche cache pour EAN ${ean}...`);
    
    const { data, error } = await supabase
      .from("products_catalog")
      .select("*")
      .eq("ean", ean)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        // Pas trouve - normal
        console.log(`❌ EAN ${ean} pas en cache`);
        return null;
      }
      console.error("Erreur cache:", error);
      return null;
    }
    
    // Incrementer le compteur de recherches
    await supabase
      .from("products_cache")
      .update({ 
        nb_recherches: data.nb_recherches + 1,
        last_searched_at: new Date().toISOString()
      })
      .eq("ean", ean);
    
    console.log(`✅ Cache hit! Produit: ${data.nom_produit} (recherche #${data.nb_recherches + 1})`);
    return data;
    
  } catch (error) {
    console.error("Erreur cache:", error.message);
    return null;
  }
}

// Fonction pour sauvegarder un produit dans le cache
async function saveProductToCache(productData) {
  try {
    console.log(`💾 Sauvegarde en cache: ${productData.nom_produit}...`);
    
    const { data, error } = await supabase
      .from("products_cache")
      .insert([productData])
      .select()
      .single();
    
    if (error) {
      if (error.code === "23505") {
        // Duplicate - produit deja en cache, on met a jour
        console.log(`⚠️ EAN ${productData.ean} existe deja, mise a jour...`);
        const { data: updated, error: updateError } = await supabase
          .from("products_cache")
          .update({
            ...productData,
            updated_at: new Date().toISOString(),
            nb_recherches: productData.nb_recherches || 1
          })
          .eq("ean", productData.ean)
          .select()
          .single();
        
        if (updateError) {
          console.error("Erreur update cache:", updateError);
          return null;
        }
        return updated;
      }
      console.error("Erreur save cache:", error);
      return null;
    }
    
    console.log(`✅ Produit sauvegarde en cache (ID: ${data.id})`);
    return data;
    
  } catch (error) {
    console.error("Erreur save cache:", error.message);
    return null;
  }
}


// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.odl-tools.ch', 'https://tar.odl-tools.ch']
    : ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true // Permettre les cookies
}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Import du middleware SSO
const { requireAuth, optionalAuth } = require('./middleware/sso-auth');

// Charger les barèmes complets
let SWICO_DATA, SENS_DATA, INOBAT_DATA;

try {
  SWICO_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'swico-complet-2026.json'), 'utf8'));
  SENS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'sens-complet-2026.json'), 'utf8'));
  INOBAT_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'inobat-complet-2026.json'), 'utf8'));
  console.log('✅ Barèmes complets chargés');
  console.log(`📊 SWICO: ${Object.values(SWICO_DATA.categories).flat().length} produits`);
  console.log(`📦 SENS: ${Object.keys(SENS_DATA.categories).length} catégories`);
  console.log(`🔋 INOBAT: ${Object.keys(INOBAT_DATA.categories).length} catégories`);
} catch (error) {
  console.error('❌ Erreur chargement barèmes:', error);
  process.exit(1);
}

// Taux de TVA Suisse
const TVA_RATES = {
  NORMAL: 8.1,
  REDUIT: 2.6,
  SPECIAL: 3.8,
  ZERO: 0
};


// Fonction de recherche Google via SerpAPI
async function searchProductByEAN(ean) {
  if (!ean || !process.env.SERPAPI_KEY) {
    return null;
  }
  
  try {
    console.log(`🔍 Recherche Google pour EAN ${ean}...`);
    
    const response = await getJson({
      engine: "google",
      q: ean,
      api_key: process.env.SERPAPI_KEY,
      num: 5
    });
    
    if (!response.organic_results || response.organic_results.length === 0) {
      console.log("❌ Aucun résultat Google trouvé");
      return null;
    }
    
    // Extraire les informations des premiers résultats
    const results = response.organic_results.slice(0, 3);
    const texts = results.map(r => `${r.title} - ${r.snippet}`).join("\n");
    
    console.log("✅ Résultats Google obtenus");
    return {
      query: ean,
      results: texts,
      urls: results.map(r => r.link)
    };
    
  } catch (error) {
    console.error("❌ Erreur SerpAPI:", error.message);
    return null;
  }
}

// Fonction pour rechercher un EAN dans une base de données externe
async function lookupEAN(ean) {
  if (!ean || ean.length < 8) return null;
  
  try {
    // Tentative 1 : API gratuite EAN-Search.org
    const response = await fetch(`https://api.ean-search.org/api?token=free&op=barcode-lookup&format=json&ean=${ean}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].name) {
        return {
          name: data[0].name,
          brand: data[0].company || null,
          category: data[0].categoryName || null,
          source: 'ean-search.org'
        };
      }
    }
  } catch (error) {
    console.log('EAN lookup failed:', error.message);
  }
  
  return null;
}

async function enrichProductData(ean, description, marque, poids, refFournisseur) {
  try {
    // ETAPE 0: Verifier le cache Supabase en priorite
    if (ean) {
      const cached = await getProductFromCache(ean);
      if (cached) {
        console.log(`🎯 Cache Supabase hit! Economies SerpAPI`);
        return {
          nom_produit: cached.nom_produit,
          marque: cached.marque,
          categorie: cached.categorie_tar,
          poids_kg: parseFloat(cached.poids_kg) || null,
          taille_pouces: null,
          organisme_tar: cached.organisme_tar,
          type_tva_suisse: "normal",
          raison_tva: "Electronique",
          confiance: cached.confiance_score || 100
        };
      }
    }

    // Recherche EAN dans base externe
    // ETAPE 1: Recherche Google via SerpAPI
    if (ean && process.env.SERPAPI_KEY) {
      const googleResults = await searchProductByEAN(ean);
      if (googleResults && googleResults.results) {
        // Utiliser Claude pour extraire les infos des resultats Google
        const extractPrompt = `Analyse ces resultats de recherche Google pour EAN ${ean}:

${googleResults.results}

Extrait le nom exact du produit, la marque, et le poids si mentionne.

Reponds UNIQUEMENT en JSON valide, sans markdown: {"nom": "nom complet", "marque": "marque", "poids_kg": nombre_ou_null}`;

        try {
          const extraction = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 1024,
            temperature: 0,
            system: "Expert en extraction de données produits. Retourne UNIQUEMENT du JSON valide, sans markdown ni balises code.",
            messages: [{role: "user", content: extractPrompt}]
          });

          let extractedText = extraction.content.find(b => b.type === "text")?.text || "{}";
          extractedText = extractedText.replace(/```json|```/g, "").trim();
          const extracted = JSON.parse(extractedText);

          if (extracted.nom) {
            console.log(`✅ Google trouve: ${extracted.nom}`);
            description = extracted.nom;
            marque = extracted.marque || marque;
            poids = extracted.poids_kg || poids;
          }
        } catch (e) {
          console.log("⚠️ Erreur extraction Google:", e.message);
        }
      }
    }

    if (ean) {
      try {
        const eanResponse = await fetch(`https://api.ean-search.org/api?token=free&op=barcode-lookup&format=json&ean=${ean}`);
        if (eanResponse.ok) {
          const eanResult = await eanResponse.json();
          if (eanResult && eanResult.length > 0 && eanResult[0].name) {
            console.log(`✅ EAN trouvé: ${eanResult[0].name}`);
            description = eanResult[0].name;
            marque = eanResult[0].company || marque;
          }
        }
      } catch (e) {
        console.log("⚠️ Erreur recherche EAN:", e.message);
      }
    }

    const prompt = `Tu es un expert en identification de produits avec accès à une base de données mondiale de codes EAN.

📊 DONNÉES FOURNIES :
${ean ? `- 🔢 Code EAN: ${ean} (PRIORITÉ ABSOLUE - Recherche d'abord le produit par ce code)` : ''}
${description ? `- 📝 Description: ${description}` : ''}
${marque ? `- 🏷️ Marque: ${marque}` : ''}
${poids ? `- ⚖️ Poids: ${poids} kg` : ''}
${refFournisseur ? `- 📋 Référence: ${refFournisseur}` : ''}

🎯 RÈGLES DE PRIORITÉ (ORDRE STRICT) :
1. **Si un EAN est fourni** : 
   - Recherche PRIORITAIREMENT le produit réel correspondant à cet EAN dans tes connaissances
   - IGNORE toute description/marque contradictoire fournie par l'utilisateur
   - Remplis TOUTES les informations depuis l'EAN (nom exact, marque réelle, poids, catégorie)
   - Confiance : 95-100 si EAN trouvé dans tes données
   - ⚠️ ATTENTION: Vérifie la date de sortie du produit. Privilégie toujours le modèle le plus récent si plusieurs correspondent
   - Pour les gammes Sonos: Five (2020) a remplacé Play:5, One a remplacé Play:1

2. **Si EAN inconnu mais description fournie** :
   - Utilise la description comme référence
   - Estime les informations manquantes
   - Confiance : 70-85

3. **Si aucun EAN** :
   - Base-toi sur description + marque
   - Confiance : 60-80

⚠️ EXEMPLES CRITIQUES DE PRIORITÉ EAN :

**Exemple 1 - EAN prioritaire même si description erronée :**
Entrée : EAN=3663701006329, Description=Kontrol S2, Marque=Native Instruments
→ Le produit RÉEL pour cet EAN est Dualo du-touch S (instrument de musique)
→ Tu DOIS retourner : nom=Dualo du-touch S, marque=Dualo, categorie=instrument_musique
→ Tu NE DOIS PAS utiliser la description Kontrol S2 qui est contradictoire

**Exemple 1b - Sonos Five vs Play:1 :**
n**Exemple 1c - Sonos Move 2 :**
Entree : EAN=8720862501478, Description=enceinte
→ Le produit REEL est Sonos Move 2 (enceinte portable, 3 kg, 499 EUR)
→ Retourne : nom=Sonos Move 2, marque=Sonos, poids=3.0, categorie=enceinte
→ NE CONFONDS PAS avec dautres produits Philips ou autres marques
Entrée : EAN=8717755777126, Description=enceinte
→ Recherche le produit EXACT pour cet EAN dans tes connaissances
→ Si cet EAN correspond à Sonos Five : retourne nom=Sonos Five, marque=Sonos
→ Si tes données sont incertaines, privilégie les informations les plus récentes
→ IMPORTANT: Sonos Five (lancé 2020) a remplacé Sonos Play:5 (2015)
→ Tu NE DOIS PAS utiliser la description Kontrol S2 qui est contradictoire

**Exemple 2 - EAN inconnu, utiliser description :**
Entrée : EAN=9999999999999, Description=iPhone 15 Pro, Marque=Apple
→ EAN inconnu dans tes données
→ Tu peux utiliser la description : nom=iPhone 15 Pro, marque=Apple, confiance=75

**Exemple 3 - Pas d'EAN :**
Entrée : Description=Smartphone dernière génération, Marque=Samsung
→ Estime le meilleur match : nom=Samsung Galaxy S24, confiance=70

📋 FORMAT JSON ATTENDU :
   - Base-toi sur description + marque
   - Confiance : 60-80

📋 FORMAT JSON ATTENDU :
{
  "nom_produit": "Nom complet EXACT du produit (depuis EAN si disponible)",
  "marque": "Marque RÉELLE (depuis EAN si disponible)",
  "categorie": "smartphone|tablette|ordinateur|ordinateur_fixe|ecran|peripherique|imprimante|instrument_musique|console|pile|batterie|electromenager|refrigeration|autoradio|enceinte|casque|appareil_photo|non_soumis",
  "poids_kg": nombre (trouve le poids réel depuis EAN, sinon estime),
  "taille_pouces": nombre ou null (pour écrans/ordinateurs/instruments),
  "organisme_tar": "swico|innobat|sens|aucun",
  "type_tva_suisse": "normal|reduit|special|zero",
  "raison_tva": "Explication courte du taux TVA",
  "confiance": nombre (95-100 si EAN connu, 70-85 si déduit, 50-69 si incertain)
}

🏷️ CATÉGORIES DÉTAILLÉES :

📱 organisme_tar = "swico" pour :
   - Smartphones, tablettes, ordinateurs (laptop/desktop)
   - Écrans, TV, moniteurs
   - **PÉRIPHÉRIQUES INFORMATIQUES** : claviers (filaires/sans-fil), souris, webcams, hubs USB, disques durs externes
   - Consoles de jeux, imprimantes, scanners
   - Appareils photo, caméras
   - Enceintes amplifiées, casques avec électronique
   - **INSTRUMENTS DE MUSIQUE ÉLECTRONIQUES** (synthés, contrôleurs MIDI, pianos numériques)
   - Autoradios, GPS, drones

🏠 organisme_tar = "sens" pour :
   - Réfrigérateurs, congélateurs, machines à laver, lave-vaisselle
   - Cuisinières, fours, micro-ondes, BOUILLOIRES
   - Grille-pain, cafetières, mixeurs, robots cuisine
   - Aspirateurs, fers à repasser, sèche-cheveux
   - Cigarettes électroniques, vaporettes
   - Radiateurs, ventilateurs, climatiseurs

🔋 organisme_tar = "innobat" pour :
   - Piles portables (AA, AAA, 9V, etc.)
   - Batteries rechargeables portables

❌ organisme_tar = "aucun" pour :
   - Vêtements, lunettes sans électronique, bijoux
   - Livres, jouets purement mécaniques
   - Meubles, décoration

💳 type_tva_suisse :
   - "normal" (8.1%) : électronique, électroménager, instruments musique
   - "reduit" (2.6%) : livres, journaux, médicaments, alimentation
   - "special" (3.8%) : hébergement
   - "zero" (0%) : exportations

⚠️ RAPPEL CRITIQUE : Si EAN fourni, TROUVE LE VRAI PRODUIT correspondant à ce code, ne te base PAS sur une description potentiellement erronée !

Réponds UNIQUEMENT avec du JSON valide, sans markdown ni balises code.`;

    const completion = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2048,
      temperature: 0,
      system: "Expert en identification de produits électroniques. Retourne UNIQUEMENT du JSON valide, sans markdown ni balises code.",
      messages: [{ role: 'user', content: prompt }]
    });

    let resultText = completion.content.find(b => b.type === "text")?.text || "{}";
    resultText = resultText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(resultText);
    
    // Sauvegarder en cache Supabase pour futurs appels
    if (ean && result.nom_produit) {
      const cacheData = {
        ean: ean,
        nom_produit: result.nom_produit,
        marque: result.marque || null,
        description_longue: description || null,
        poids_kg: result.poids_kg || poids || null,
        categorie_tar: result.categorie || null,
        organisme_tar: result.organisme_tar || null,
        tarif_ht: null, // Sera calcule apres
        tarif_ttc: null,
        taux_tva: 8.1,
        confiance_score: result.confiance || 80,
        recherche_source: "serpapi",
        urls_sources: null
      };
      
      // Sauvegarde asynchrone (ne bloque pas la reponse)
      saveProductToCache(cacheData).catch(err => 
        console.error("Erreur save cache:", err.message)
      );
    }
    
    return result;

  } catch (error) {
    console.error('❌ Erreur IA:', error);
    throw new Error('Impossible d\'identifier le produit avec l\'IA');
  }
}
// Fonction pour calculer la TAR avec les barèmes complets
function calculateTAR(productData) {
  const { organisme_tar, categorie, poids_kg, taille_pouces, nom_produit } = productData;

  let tarifHT = 0;
  let typeApplique = '';

  // Produits non soumis à la TAR
  if (organisme_tar === 'aucun') {
    return {
      tarifHT: '0.00',
      typeApplique: 'Non soumis à la TAR',
      nonSoumis: true
    };
  }

  // SWICO - Recherche dans les barèmes complets
  if (organisme_tar === 'swico') {
    // Smartphones
    if (categorie === 'smartphone') {
      tarifHT = 0.19; // Tarif SWICO correct
      typeApplique = 'Smartphone/Smartwatch';
    }
    // Tablettes - TARIF SELON TAILLE (3 tranches SWICO 2026)
    else if (categorie === 'tablette') {
      const taille = taille_pouces || 8; // Par défaut: petite tablette

      if (taille < 9) {
        tarifHT = 0.46;
        typeApplique = 'Tablet jusqu\'à 8.9"';
      } else if (taille < 15) {
        tarifHT = 2.31;
        typeApplique = 'Tablet 9" - 14.9"';
      } else {
        tarifHT = 5.57;
        typeApplique = 'Tablet de plus de 15"';
      }
    }
    // Ordinateurs portables
    else if (categorie === 'ordinateur' || categorie === 'ordinateur_portable') {
      const taille = taille_pouces || 14;
      if (taille < 12) {
        tarifHT = 2.31;
        typeApplique = 'Notebook < 12"';
      } else {
        tarifHT = 5.57;
        typeApplique = 'Notebook ≥ 12"';
      }
    }
    // Ordinateurs fixes (desktops, all-in-one comme iMac)
    else if (categorie === 'ordinateur_fixe') {
      // Les all-in-one (iMac, etc.) sont traités comme des écrans
      tarifHT = 5.57;
      typeApplique = 'Ordinateur fixe / All-in-one';
    }
    // Écrans / TV
    else if (categorie === 'ecran') {
      const taille = taille_pouces || 24;
      if (taille < 8) {
        tarifHT = 0.19;
        typeApplique = 'Écran < 8"';
      } else if (taille < 15) {
        tarifHT = 2.31;
        typeApplique = 'Écran 8-14"';
      } else if (taille < 33) {
        tarifHT = 5.57;
        typeApplique = 'Écran 15-32"';
      } else if (taille < 45) {
        tarifHT = 13.88;
        typeApplique = 'Écran 33-44"';
      } else if (taille < 55) {
        tarifHT = 18.50;
        typeApplique = 'Écran 45-54"';
      } else if (taille < 70) {
        tarifHT = 27.75;
        typeApplique = 'Écran 55-69"';
      } else if (taille < 90) {
        tarifHT = 37.00;
        typeApplique = 'Écran 70-89"';
      } else {
        tarifHT = 46.25;
        typeApplique = 'Écran ≥ 90"';
      }
    }
    // Imprimantes
    else if (categorie === 'imprimante') {
      tarifHT = 2.31;
      typeApplique = 'Imprimante/Scanner';
    }
    // Consoles
    else if (categorie === 'console' || categorie === 'console_jeux') {
      tarifHT = 2.31;
      typeApplique = 'Console de jeux';
    }
    // Enceintes et casques
    // Enceintes et haut-parleurs (selon poids/type)
    else if (categorie === 'enceinte') {
      const poids = poids_kg || 1;
      if (poids >= 1.5) {
        tarifHT = 2.31;
        typeApplique = 'Haut-parleur / Subwoofer';
      } else {
        tarifHT = 0.46;
        typeApplique = 'Enceinte portable/voyage';
      }
    }
    // Casques audio
    else if (categorie === 'casque' || categorie === 'casque_ecouteur') {
      tarifHT = 0.46;
      typeApplique = 'Casque audio';
    }
    // Appareils photo
    else if (categorie === 'appareil_photo' || categorie === 'camera') {
      tarifHT = 0.46;
      typeApplique = 'Appareil photo';
    }
    // Autoradio
    else if (categorie === 'autoradio') {
      tarifHT = 2.31;
      typeApplique = 'Autoradio/Système audio';
    }
    // Instruments de musique
    else if (categorie === 'instrument_musique') {
      const poids = poids_kg || 2;
      if (poids < 3) {
        tarifHT = 2.31;
        typeApplique = 'Instrument de musique < 3kg';
      } else {
        tarifHT = 5.57;
        typeApplique = 'Instrument de musique ≥ 3kg';
      }
    }
    // Périphériques informatiques (claviers, souris, webcams, etc.)
    else if (categorie === 'peripherique') {
      tarifHT = 0.46;
      typeApplique = 'Périphérique informatique';
    }
  }
  
  // INOBAT - Batteries
  else if (organisme_tar === 'innobat') {
    const poids = poids_kg || 0.25;
    
    if (categorie === 'pile') {
      // Piles standards
      tarifHT = 0.05;
      typeApplique = 'Pile standard';
    } else if (categorie === 'batterie') {
      // Batteries rechargeables par poids
      if (poids < 0.25) {
        tarifHT = 0.25;
        typeApplique = 'Batterie < 250g';
      } else if (poids < 0.75) {
        tarifHT = 0.80;
        typeApplique = 'Batterie 250-750g';
      } else if (poids < 5) {
        tarifHT = 1.60;
        typeApplique = 'Batterie 750g-5kg';
      } else {
        tarifHT = 9.60;
        typeApplique = 'Batterie 5-15kg';
      }
    }
  }
  
  // SENS - Électroménager
  else if (organisme_tar === 'sens') {
    const poids = poids_kg || 1;
    
    if (categorie === 'refrigeration') {
      // Réfrigération
      const tranches = SENS_DATA.categories['200_Refrigeration'].tranches;
      const tranche = tranches.find(t => poids >= t.poidsMin && poids < t.poidsMax);
      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Réfrigération ${tranche.poidsMin}-${tranche.poidsMax}kg`;
      }
    } else {
      // Électroménager général
      const tranches = SENS_DATA.categories['100_SENS_General'].tranches;
      const tranche = tranches.find(t => poids >= t.poidsMin && poids < t.poidsMax);
      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Électroménager ${tranche.poidsMin}-${tranche.poidsMax}kg`;
      }
    }
  }

  return {
    tarifHT: tarifHT.toFixed(2),
    typeApplique
  };
}

// Route principale de calcul TAR
app.post('/api/calculate-tar', async (req, res) => {
  try {
    const { ean, description, marque, poids, refFournisseur } = req.body;

    console.log('📥 Requête:', { ean, description, marque, poids });

    // Validation
    if (!ean && !description) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir au moins un code EAN ou une description'
      });
    }

    // Enrichissement via Anthropic Claude
    const productData = await enrichProductData(
      ean,
      description,
      marque,
      poids,
      refFournisseur
    );

    console.log('✅ Produit identifié:', productData.nom_produit);

    // Méthode de recherche
    const searchMethod = ean && description ? '🎯 EAN + Description' :
                        ean ? '🎯 EAN' :
                        '🔍 Description';

    // Calcul de la TAR
    const { tarifHT, typeApplique, nonSoumis } = calculateTAR(productData);

    // Si produit non soumis
    if (nonSoumis) {
      return res.json({
        success: true,
        product: {
          nom: productData.nom_produit,
          marque: productData.marque,
          poids: productData.poids_kg,
          taille: productData.taille_pouces
        },
        tar: {
          organisme: 'AUCUN',
          type: 'Non soumis à la TAR',
          tarifHT: '0.00',
          tarifTTC: '0.00',
          tva: 0,
          raisonTVA: 'Produit non soumis à la taxe anticipée de recyclage'
        },
        nonSoumis: true,
        confidence: productData.confiance,
        searchMethod
      });
    }

    // Calcul TVA
    const tvaRate = productData.type_tva_suisse === 'normal' ? TVA_RATES.NORMAL :
                   productData.type_tva_suisse === 'reduit' ? TVA_RATES.REDUIT :
                   productData.type_tva_suisse === 'special' ? TVA_RATES.SPECIAL :
                   TVA_RATES.ZERO;

    const tarifTTC = (parseFloat(tarifHT) * (1 + tvaRate / 100)).toFixed(2);

    // Réponse
    res.json({
      success: true,
      product: {
        nom: productData.nom_produit,
        marque: productData.marque,
        poids: productData.poids_kg,
        taille: productData.taille_pouces
      },
      tar: {
        organisme: productData.organisme_tar.toUpperCase(),
        type: typeApplique,
        tarifHT,
        tarifTTC,
        tva: tvaRate,
        raisonTVA: productData.raison_tva
      },
      confidence: productData.confiance,
      searchMethod
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du calcul'
    });
  }
});

// Health check

// ===================================
// 🚀 ENDPOINT V2 - Extraction enrichie
// ===================================
app.post('/api/calculate-tar-v2', async (req, res) => {
  try {
    const { ean, description, marque, poids, type_produit } = req.body;

    // ⚠️ VALIDATION STRICTE DES ENTRÉES
    // Type de produit et description sont OBLIGATOIRES dans tous les cas
    // pour garantir une analyse TAR précise avec granularité maximale

    const validationErrors = [];

    // 1. Type de produit OBLIGATOIRE (minimum 3 caractères)
    if (!type_produit || type_produit.length < 3) {
      validationErrors.push('Type de produit obligatoire (minimum 3 caractères). Exemples: clavier, écran, tablette, ordinateur, imprimante, etc.');
    }

    // 2. Description OBLIGATOIRE (minimum 10 caractères pour analyse de qualité)
    if (!description || description.length < 10) {
      validationErrors.push('Description obligatoire (minimum 10 caractères). Exemple: "Clavier mécanique sans fil Logitech K270"');
    }

    // 3. Si erreurs, retourner immédiatement avec recommandations
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Données insuffisantes pour une analyse TAR précise',
        validation_errors: validationErrors,
        required_fields: {
          type_produit: 'OBLIGATOIRE - minimum 3 caractères (ex: clavier, écran, tablette)',
          description: 'OBLIGATOIRE - minimum 10 caractères (ex: "Clavier sans fil Logitech K270")',
          ean: 'OPTIONNEL mais fortement recommandé pour précision maximale (8-13 caractères)',
          marque: 'OPTIONNEL mais améliore la précision (ex: Logitech, Apple, Samsung)',
          poids: 'OPTIONNEL - en kg (ex: 0.5, 1.2)'
        },
        examples: [
          {
            type_produit: 'clavier',
            description: 'Clavier mécanique sans fil Logitech K270',
            marque: 'Logitech',
            ean: '5099206071131'
          },
          {
            type_produit: 'écran',
            description: 'Moniteur Dell UltraSharp 27 pouces 4K',
            marque: 'Dell',
            poids: 5.2
          },
          {
            type_produit: 'tablette',
            description: 'iPad Pro 12.9 pouces Wi-Fi 256GB',
            marque: 'Apple',
            ean: '194252721444'
          }
        ],
        help: 'Pour une analyse TAR optimale, fournissez type_produit + description détaillée. EAN, marque et poids sont optionnels mais améliorent la précision.'
      });
    }
    
    console.log('\n🔍 === NOUVELLE RECHERCHE V2 (ENRICHIE) ===');
    console.log(`📦 EAN: ${ean || 'non fourni'}`);
    console.log(`📝 Description: ${description || 'non fournie'}`);
    console.log(`🏷️  Marque: ${marque || 'non fournie'}`);
    console.log(`🔖 Type: ${type_produit || 'non fourni'}`);
    console.log(`⚖️  Poids: ${poids || 'non fourni'}kg`);
    
    // ETAPE 0: Verifier le cache catalog en priorite
    let enrichedData = null;
    if (ean) {
      enrichedData = await getCatalogProduct(ean);
      if (enrichedData) {
        console.log(`✅ CACHE HIT! Produit: ${enrichedData.product_name}`);

        // ⚠️ IMPORTANT: Fusionner les données utilisateur avec les données cached
        // L'utilisateur peut fournir un poids/marque mis à jour
        if (poids && parseFloat(poids) > 0) {
          console.log(`   🔄 Override poids: ${enrichedData.product_weight_kg} kg → ${poids} kg`);
          enrichedData.product_weight_kg = parseFloat(poids);
        }

        if (marque && marque !== "Inconnu") {
          if (enrichedData.brand !== marque) {
            console.log(`   🔄 Override marque: "${enrichedData.brand}" → "${marque}"`);
            enrichedData.brand = marque;
          }
        }

        if (description && description !== enrichedData.product_name) {
          console.log(`   ℹ️  Description fournie: "${description}" (cached: "${enrichedData.product_name}")`);
          // On garde le nom enrichi du cache, mais on note la différence
        }

        // 🔄 Recalculer le score de confiance basé sur les données actuelles
        // Si l'utilisateur fournit EAN + marque + poids = confiance élevée
        let confidenceScore = enrichedData.confidence_score || 80;

        if (ean && marque && poids) {
          // EAN complet + marque + poids = excellent
          confidenceScore = Math.max(confidenceScore, 95);
          console.log(`   📊 Confiance recalculée: ${confidenceScore}% (EAN + marque + poids)`);
        } else if (ean && marque) {
          // EAN + marque = très bon
          confidenceScore = Math.max(confidenceScore, 90);
          console.log(`   📊 Confiance recalculée: ${confidenceScore}% (EAN + marque)`);
        } else if (ean) {
          // EAN seul = bon
          confidenceScore = Math.max(confidenceScore, 85);
          console.log(`   📊 Confiance recalculée: ${confidenceScore}% (EAN seulement)`);
        }

        enrichedData.confidence_score = confidenceScore;

        // Retourner directement les donnees cached (avec overrides)
        const tvaRate = 8.1;
        const tarifTTC = (parseFloat(enrichedData.tar_rate_ht) * (1 + tvaRate / 100)).toFixed(2);

        return res.json({
          success: true,
          source: 'cache_enriched',
          confidence: confidenceScore,
          product: {
            nom_produit: enrichedData.product_name,
            marque: enrichedData.brand,
            poids_kg: enrichedData.product_weight_kg,
            image_url: enrichedData.main_image_url,
            description: enrichedData.short_description
          },
          tar: {
            organisme: enrichedData.tar_organism,
            type: enrichedData.tar_schedule_source, categorie: enrichedData.tar_category,
            tarifHT: enrichedData.tar_rate_ht,
            tarifTTC: tarifTTC,
            tva: tvaRate
          },
          enriched_data: enrichedData
        });
      }
    }
    
    // ETAPE 1: Recherche enrichie avec Anthropic (Extended Thinking + Web Search)
    let webSearchResults = '';

    if (ean) {
      console.log(`🌐 Recherche web enrichie pour EAN ${ean}...`);

      try {
        // Utiliser Anthropic avec recherche web pour trouver les spécifications
        const searchPrompt = `Trouve toutes les spécifications techniques pour le produit avec l'EAN ${ean}${description ? ` (${description})` : ''}.

Recherche particulièrement:
- Nom complet et modèle exact du produit
- Marque
- Dimensions exactes (longueur x largeur x hauteur en cm)
- Poids exact (en kg)
- Pour les écrans/tablettes/ordinateurs: taille de l'écran en pouces
- Spécifications techniques clés

Retourne un résumé structuré avec TOUTES les informations trouvées.`;

        const webSearch = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: searchPrompt
          }]
        });

        webSearchResults = webSearch.content.find(b => b.type === "text")?.text || "";

        if (webSearchResults && webSearchResults.length > 100) {
          console.log(`✅ Spécifications trouvées via recherche web`);
        }
      } catch (e) {
        console.log(`⚠️ Recherche web non disponible:`, e.message);
      }
    }

    // ETAPE 2: Extraction EAN via API gratuite
    let eanData = null;
    if (ean) {
      try {
        console.log(`🔍 Recherche EAN dans base de données...`);
        const eanResponse = await fetch(`https://api.ean-search.org/api?token=free&op=barcode-lookup&format=json&ean=${ean}`);
        if (eanResponse.ok) {
          const eanResult = await eanResponse.json();
          if (eanResult && eanResult.length > 0 && eanResult[0].name) {
            eanData = {
              name: eanResult[0].name,
              brand: eanResult[0].company,
              category: eanResult[0].categoryName
            };
            console.log(`✅ EAN trouvé: ${eanData.name} (${eanData.brand})`);
          }
        }
      } catch (e) {
        console.log(`⚠️ Erreur recherche EAN:`, e.message);
      }
    }

    // ETAPE 3: Extraction COMPLETE avec analyse Anthropic
    console.log(`🔬 Extraction et analyse complète du produit...`);

    const extractionPrompt = `Analyse ce produit et extrait TOUTES les spécifications techniques:

📦 **DONNÉES DISPONIBLES:**
${ean ? `- EAN: ${ean}` : ''}
${description ? `- Description: ${description}` : ''}
${marque ? `- Marque: ${marque}` : ''}
${poids ? `- Poids fourni: ${poids} kg` : ''}
${eanData ? `- Base EAN: ${eanData.name} (${eanData.brand})` : ''}
${webSearchResults ? `\n🌐 **RÉSULTATS RECHERCHE WEB:**\n${webSearchResults}` : ''}

🎯 **EXTRAIT LES INFORMATIONS SUIVANTES:**

1. **Identification:**
   - Nom complet du produit (modèle exact si disponible)
   - Marque
   - Type de produit

2. **Dimensions physiques:**
   - Taille d'écran en pouces (CRITIQUE pour tablettes/écrans/ordinateurs)
   - Poids en kg
   - Dimensions L x l x H en cm

3. **Catégorie précise:**
   - Si c'est une tablette: quelle est la taille d'écran? (jusqu'à 8.9", 9-14.9", ou 15"+)
   - Si c'est un écran: quelle est la diagonale exacte?
   - Si c'est un ordinateur portable: quelle est la taille?

4. **Score de confiance:**
   - 90-100: Toutes les specs trouvées avec sources fiables
   - 70-89: Produit identifié, quelques specs manquantes
   - 50-69: Produit identifié mais specs incomplètes
   - <50: Données insuffisantes

⚠️ **IMPORTANT:**
- Si la taille d'écran n'est pas trouvée pour une tablette/écran, propose les 3 options possibles
- Indique explicitement ce qui est trouvé vs estimé
- Sois précis sur les dimensions exactes quand disponibles

Retourne JSON:
{
  "product_name": "nom complet",
  "brand": "marque",
  "product_type": "type",
  "short_description": "description courte",
  "product_weight_kg": nombre_ou_null,
  "screen_size_inches": nombre_ou_null,
  "product_length_cm": nombre_ou_null,
  "product_width_cm": nombre_ou_null,
  "product_height_cm": nombre_ou_null,
  "specs_found": ["liste des specs trouvées"],
  "specs_missing": ["liste des specs manquantes"],
  "confidence": nombre,
  "notes": "notes importantes sur le produit"
}`;

    const extraction = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4096,
      temperature: 0,
      system: "Expert en analyse de produits électroniques. Retourne UNIQUEMENT du JSON valide, sans markdown.",
      messages: [{role: "user", content: extractionPrompt}]
    });

    let extractedText = extraction.content.find(b => b.type === "text")?.text || "{}";
    extractedText = extractedText.replace(/```json|```/g, "").trim();
    enrichedData = JSON.parse(extractedText);

    console.log(`✅ Extraction réussie: ${enrichedData.product_name}`);
    if (enrichedData.screen_size_inches) {
      console.log(`   📏 Taille écran: ${enrichedData.screen_size_inches}"`);
    }
    console.log(`   ⚖️ Poids: ${enrichedData.product_weight_kg || 'inconnu'} kg`);
    console.log(`   📊 Confiance: ${enrichedData.confidence}%`);
    console.log(`🤖 Categorisation TAR...`);
    
    const categPrompt = `Analyse ce produit et determine sa categorie TAR suisse:

Produit: ${enrichedData.product_name}
Marque: ${enrichedData.brand}
Type: ${enrichedData.product_type}
Description: ${enrichedData.short_description}
Poids: ${enrichedData.product_weight_kg} kg

⚠️  RÈGLE CRITIQUE: Détermine la catégorie EXACTE du produit en fonction de sa description.

🎯 CATÉGORIES PRÉCISES SWICO:

📱 **PÉRIPHÉRIQUES INFORMATIQUES** (categorie="peripherique", organisme="SWICO"):
- Claviers (filaires, sans fil, Bluetooth, USB, gaming)
- Souris (optiques, sans fil, gaming, trackball)
- Webcams, caméras web
- Hubs USB, adaptateurs
- Disques durs externes, SSD externes
- Lecteurs de cartes mémoire
- Microphones USB
- Scanners portables

💻 **ORDINATEURS FIXES** (categorie="ordinateur_fixe"):
- Tour PC, desktop, unité centrale
- Mac Mini, iMac, all-in-one
- Stations de travail

📺 **ÉCRANS** (categorie="ecran"):
- Moniteurs PC, écrans d'ordinateur
- Téléviseurs, TV, Smart TV
- Projecteurs vidéo

🎮 **CONSOLES** (categorie="console_jeux"):
- PlayStation, Xbox, Nintendo Switch
- Consoles portables

🖨️ **IMPRIMANTES** (categorie="imprimante"):
- Imprimantes jet d'encre, laser
- Imprimantes multifonctions
- Scanners

🔊 **AUDIO** (categorie="enceinte" ou "casque_ecouteur"):
- Enceintes Bluetooth, enceintes connectées
- Casques audio, écouteurs, AirPods
- Barres de son, soundbars

🏠 **ÉLECTROMÉNAGER SENS** (categorie="electromenager", organisme="SENS"):
- Batteurs, mixeurs, blenders, robots cuisine
- Grille-pain, cafetières, bouilloires
- Aspirateurs, fers à repasser
- Micro-ondes, fours

🎼 **INSTRUMENTS DE MUSIQUE** (categorie="instrument_musique", organisme="SWICO"):
- Synthétiseurs, pianos numériques
- Contrôleurs MIDI, surfaces de contrôle
- Guitares électriques, basses électriques
- Batteries électroniques

⚠️ **EXEMPLES CRITIQUES**:
- "clavier sans fil" → categorie="peripherique" (PAS ordinateur_fixe!)
- "souris gaming" → categorie="peripherique"
- "clavier mécanique" → categorie="peripherique"
- "hub USB" → categorie="peripherique"
- "PC tour" → categorie="ordinateur_fixe"
- "iMac" → categorie="ordinateur_fixe"

🎯 SCORE DE CONFIANCE (confidence):
- 90-100: Produit clairement identifié avec marque + modèle + EAN complet
- 75-89: Produit identifié avec marque + description précise, mais sans EAN ou détails manquants
- 60-74: Description générique, estimation basée sur le type de produit
- 40-59: Informations très limitées, forte incertitude
- <40: Données insuffisantes pour classification fiable

Retourne JSON: {"has_electronics": true/false, "categorie": "peripherique|smartphone|tablette|ordinateur_portable|ordinateur_fixe|ecran|imprimante|enceinte|casque_ecouteur|console_jeux|camera|drone|electromenager|instrument_musique|non_soumis", "organisme": "SWICO|SENS|INOBAT|AUCUN", "confidence": 0-100}`;

    const categResult = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2048,
      temperature: 0,
      system: "Expert TAR suisse. JSON valide uniquement, sans markdown.",
      messages: [{ role: "user", content: categPrompt }]
    });
    let categContent = categResult.content.find(b => b.type === "text")?.text || "{}";
    categContent = categContent.replace(/```json|```/g, "").trim();
    
    const categData = JSON.parse(categContent);
    console.log(`✅ Catégorie: ${categData.categorie} / ${categData.organisme} (confiance: ${categData.confidence || 80}%)`);

    // Mettre à jour le score de confiance dans enrichedData si ce n'est pas déjà fait
    if (!enrichedData.confidence) {
      enrichedData.confidence = categData.confidence || 80;
    }

    // ETAPE 4: Calcul TAR avec le moteur proactif
    const { calculateTAR } = require('./tar-engine-proactive');

    // Utiliser directement la catégorisation de l'IA Anthropic
    const tarResult = calculateTAR({
      description: enrichedData.product_name,
      organisme: categData.organisme,
      categorie: categData.categorie,
      poids_kg: enrichedData.product_weight_kg,
      screen_size_inches: enrichedData.screen_size_inches,
      product_name: enrichedData.product_name
    });

    const { tarifHT, tarifTTC, typeApplique, alternatives, notes } = tarResult;

    // TVA normale 8.1%
    const tvaRate = 8.1;

    console.log(`💰 TAR calculé: CHF ${tarifHT} HT / CHF ${tarifTTC} TTC`);
    if (alternatives && alternatives.length > 0) {
      console.log(`   ⚠️ ${alternatives.length} alternatives proposées`);
    }
    if (notes && notes.length > 0) {
      notes.forEach(note => console.log(`   📝 ${note}`));
    }

    // ETAPE 5: Qualification pour sauvegarde Supabase
    // On ne sauvegarde QUE si le produit est bien identifié (EAN + marque + description)
    // Cela évite de polluer la DB avec des requêtes génériques type "batteur cuisine"

    const shouldSaveToSupabase = ean &&
                                  ean.length >= 8 &&
                                  marque &&
                                  marque !== "Inconnu" &&
                                  description &&
                                  description.length > 5;

    if (shouldSaveToSupabase) {
      console.log(`✅ Produit qualifié pour sauvegarde (EAN: ${ean}, Marque: ${marque})`);

      const productToSave = {
        ean: ean,
        product_name: enrichedData.product_name,
        brand: enrichedData.brand,
        manufacturer: enrichedData.manufacturer,
        model_number: enrichedData.model_number,

        short_description: enrichedData.short_description,
        long_description: enrichedData.long_description,
        key_features: enrichedData.key_features,
        technical_specs: enrichedData.technical_specs,

        product_length_cm: enrichedData.product_length_cm,
        product_width_cm: enrichedData.product_width_cm,
        product_height_cm: enrichedData.product_height_cm,
        product_weight_kg: enrichedData.product_weight_kg,

        package_weight_kg: enrichedData.package_weight_kg,
        package_length_cm: enrichedData.package_length_cm,
        package_width_cm: enrichedData.package_width_cm,
        package_height_cm: enrichedData.package_height_cm,

        color: enrichedData.color,
        main_category: enrichedData.main_category,
        sub_category: enrichedData.sub_category,
        product_type: enrichedData.product_type,

        tar_category: categData.categorie,
        tar_organism: categData.organisme.toLowerCase(),
        tar_rate_ht: parseFloat(tarifHT),
        tar_rate_ttc: parseFloat(tarifTTC),
        vat_rate: tvaRate,

        msrp_chf: enrichedData.msrp_chf,
        msrp_eur: enrichedData.msrp_eur,
        msrp_usd: enrichedData.msrp_usd,

        main_image_url: enrichedData.main_image_url,
        images_urls: enrichedData.images_urls,

        source_urls: null, // URLs de sources web (si disponibles)
        country_of_origin: enrichedData.country_of_origin,

        certifications: enrichedData.certifications,
        energy_label: enrichedData.energy_label,
        warranty_months: enrichedData.warranty_months,

        data_source: 'serpapi',
        confidence_score: enrichedData.confidence || 80
      };

      const saved = await saveEnrichedProduct(productToSave);

      if (saved) {
        console.log(`✅ Produit sauvegardé dans products_catalog`);
      }
    } else {
      console.log(`⚠️  Produit NON sauvegardé: requête générique sans EAN/marque (EAN: ${ean || 'manquant'}, Marque: ${marque || 'manquante'})`);
    }
    
    // REPONSE
    res.json({
      success: true,
      source: 'enriched_extraction',
      confidence: enrichedData.confidence || categData.confidence || 80,
      product: {
        nom_produit: enrichedData.product_name,
        marque: enrichedData.brand,
        poids_kg: enrichedData.product_weight_kg,
        image_url: enrichedData.main_image_url,
        description: enrichedData.short_description,
        dimensions: {
          length_cm: enrichedData.product_length_cm,
          width_cm: enrichedData.product_width_cm,
          height_cm: enrichedData.product_height_cm
        }
      },
      tar: {
        organisme: categData.organisme,
        categorie: categData.categorie,
        type: typeApplique,
        tarifHT: tarifHT,
        tarifTTC: tarifTTC,
        tva: tvaRate,
        alternatives: alternatives || null,
        notes: notes || []
      },
      enriched_data: enrichedData
    });
    
  } catch (error) {
    console.error('❌ Erreur endpoint v2:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message 
    });
  }
});

// ===================================
// 🚀 ENDPOINT ODEAL FORM - Calcul TAR depuis formulaire structuré
// ===================================
app.post('/api/calculate-tar-odeal', async (req, res) => {
  try {
    const {
      item_name,
      subcategory_id,
      has_battery,
      battery_type,
      ean,
      sku,
      weight_kg,
      length_cm,
      width_cm,
      height_cm
    } = req.body;

    console.log('\n🔍 === CALCUL TAR ODEAL FORM ===');
    console.log(`📦 Produit: ${item_name}`);
    console.log(`🏷️  Subcategory: ${subcategory_id}`);
    console.log(`🔋 Batterie: ${has_battery ? `Oui (${battery_type})` : 'Non'}`);

    // ⚠️ VALIDATION STRICTE
    const validationErrors = [];

    if (!item_name || item_name.length < 3) {
      validationErrors.push('item_name obligatoire (minimum 3 caractères)');
    }

    if (!subcategory_id || !subcategory_id.startsWith('s')) {
      validationErrors.push('subcategory_id obligatoire (format: s1, s20, etc.)');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        validation_errors: validationErrors,
        required_fields: {
          item_name: 'OBLIGATOIRE - Nom du produit (min 3 caractères)',
          subcategory_id: 'OBLIGATOIRE - ID de la subcategory (ex: s20)',
          has_battery: 'OPTIONNEL - Boolean indiquant si le produit contient une batterie',
          battery_type: 'OPTIONNEL - Type de batterie si has_battery = true',
          weight_kg: 'OPTIONNEL - Poids en kg (requis pour certaines catégories)',
          length_cm: 'OPTIONNEL - Longueur en cm',
          width_cm: 'OPTIONNEL - Largeur en cm',
          height_cm: 'OPTIONNEL - Hauteur en cm'
        }
      });
    }

    // Charger le mapping subcategory → TAR
    const { SUBCATEGORY_TAR_MAPPING, BATTERY_TYPE_TAR } = require('./subcategory-tar-mapping');

    // Récupérer la configuration de la subcategory
    const subcategoryConfig = SUBCATEGORY_TAR_MAPPING[subcategory_id];

    if (!subcategoryConfig) {
      return res.status(400).json({
        success: false,
        error: `Subcategory ID inconnu: ${subcategory_id}`,
        hint: 'Vérifiez que le subcategory_id correspond à une valeur valide (s1 à s65)'
      });
    }

    // Déterminer l'organisme TAR et la catégorie
    let organisme = subcategoryConfig.organisme;
    let categorie = subcategoryConfig.categorie;
    let calculation_method = 'subcategory_mapping';
    const notes = [];
    const warnings = [];

    // ÉTAPE 1: Appliquer battery_override si nécessaire
    if (has_battery && subcategoryConfig.battery_override) {
      console.log(`🔋 Override batterie activé pour ${subcategory_id}`);
      organisme = subcategoryConfig.battery_override.organisme;
      categorie = subcategoryConfig.battery_override.categorie;
      notes.push(`Produit contient une batterie → Organisme TAR: ${organisme}`);
    }

    // ÉTAPE 2: Validation des données requises
    if (subcategoryConfig.needs_weight && !weight_kg) {
      warnings.push('Poids manquant - Le calcul TAR pourrait être imprécis pour cette catégorie');
    }

    if (subcategoryConfig.needs_screen_size && (!length_cm || !width_cm)) {
      warnings.push('Dimensions manquantes - Impossible de calculer la taille d\'écran exacte');
    }

    // ÉTAPE 3: Calcul de la TAR selon l'organisme
    let tarifHT = 0;
    let typeApplique = '';
    const tvaRate = 8.1;

    if (organisme === 'AUCUN') {
      tarifHT = 0;
      typeApplique = 'Non soumis à la TAR';
      notes.push('Cette catégorie de produits n\'est pas soumise à la taxe anticipée de recyclage');
    }
    else if (organisme === 'SWICO') {
      // Utiliser le tarif par défaut si disponible
      if (subcategoryConfig.default_tarif_ht) {
        tarifHT = subcategoryConfig.default_tarif_ht;
        typeApplique = `SWICO - ${categorie}`;
        notes.push(`Tarif SWICO standard appliqué: CHF ${tarifHT}`);
      } else {
        // Calcul selon poids/taille pour certaines catégories
        if (categorie === 'ordinateur_portable' && length_cm && width_cm) {
          // Calculer taille d'écran approximative
          const diagonal_inches = Math.sqrt(Math.pow(length_cm, 2) + Math.pow(width_cm, 2)) / 2.54;
          if (diagonal_inches < 12) {
            tarifHT = 2.31;
            typeApplique = 'Notebook < 12"';
          } else {
            tarifHT = 5.57;
            typeApplique = 'Notebook ≥ 12"';
          }
          notes.push(`Taille écran estimée: ${diagonal_inches.toFixed(1)}" → ${typeApplique}`);
        }
        else if (categorie === 'enceinte' && weight_kg) {
          if (weight_kg >= 1.5) {
            tarifHT = 2.31;
            typeApplique = 'Haut-parleur / Subwoofer';
          } else {
            tarifHT = 0.46;
            typeApplique = 'Enceinte portable';
          }
          notes.push(`Poids: ${weight_kg}kg → ${typeApplique}`);
        }
        else {
          // Fallback: tarif périphérique par défaut
          tarifHT = 0.46;
          typeApplique = 'Périphérique SWICO standard';
          warnings.push('Données insuffisantes - Tarif périphérique standard appliqué');
        }
      }
    }
    else if (organisme === 'SENS') {
      // Calcul selon poids (tranches SENS)
      const poids = weight_kg || 1;

      if (categorie === 'refrigeration') {
        // Tranches spécifiques pour réfrigération
        if (poids < 10) {
          tarifHT = 1.00;
          typeApplique = 'Réfrigération < 10kg';
        } else if (poids < 25) {
          tarifHT = 3.00;
          typeApplique = 'Réfrigération 10-25kg';
        } else {
          tarifHT = 10.00;
          typeApplique = 'Réfrigération > 25kg';
        }
      } else {
        // Tranches générales électroménager
        if (poids < 1) {
          tarifHT = 0.50;
          typeApplique = 'Électroménager < 1kg';
        } else if (poids < 5) {
          tarifHT = 1.50;
          typeApplique = 'Électroménager 1-5kg';
        } else if (poids < 15) {
          tarifHT = 3.50;
          typeApplique = 'Électroménager 5-15kg';
        } else {
          tarifHT = 8.00;
          typeApplique = 'Électroménager > 15kg';
        }
      }
      notes.push(`Poids: ${poids}kg → Tranche SENS: ${typeApplique}`);
    }
    else if (organisme === 'INOBAT') {
      // Calcul selon type de batterie
      if (battery_type && BATTERY_TYPE_TAR[battery_type]) {
        const batteryConfig = BATTERY_TYPE_TAR[battery_type];
        if (batteryConfig.default_tarif_ht) {
          tarifHT = batteryConfig.default_tarif_ht;
          typeApplique = `INOBAT - ${batteryConfig.categorie}`;
        } else if (weight_kg) {
          // Tranches selon poids pour batteries rechargeables
          if (weight_kg < 0.25) {
            tarifHT = 0.25;
            typeApplique = 'Batterie < 250g';
          } else if (weight_kg < 0.75) {
            tarifHT = 0.80;
            typeApplique = 'Batterie 250-750g';
          } else if (weight_kg < 5) {
            tarifHT = 1.60;
            typeApplique = 'Batterie 750g-5kg';
          } else {
            tarifHT = 9.60;
            typeApplique = 'Batterie 5-15kg';
          }
        } else {
          tarifHT = 0.80;
          typeApplique = 'Batterie standard';
          warnings.push('Poids batterie manquant - Tarif moyen appliqué');
        }
      } else {
        tarifHT = 0.80;
        typeApplique = 'Batterie standard';
      }
      notes.push(`Type batterie: ${battery_type || 'non spécifié'} → ${typeApplique}`);
    }

    const tarifTTC = (tarifHT * (1 + tvaRate / 100)).toFixed(2);

    // Score de confiance
    let confidence = 95;
    if (warnings.length > 0) {
      confidence = 85;
    }
    if (organisme !== 'AUCUN' && !weight_kg && subcategoryConfig.needs_weight) {
      confidence = 75;
    }

    console.log(`💰 Résultat: ${organisme} - CHF ${tarifHT} HT / CHF ${tarifTTC} TTC`);
    console.log(`📊 Confiance: ${confidence}%`);

    // RÉPONSE
    res.json({
      success: true,
      source: 'odeal_form',
      confidence: confidence,

      product: {
        nom_produit: item_name,
        subcategory_id: subcategory_id,
        ean: ean || null,
        sku: sku || null,
        poids_kg: weight_kg || null,
        dimensions: {
          length_cm: length_cm || null,
          width_cm: width_cm || null,
          height_cm: height_cm || null
        },
        battery: has_battery ? {
          has_battery: true,
          type: battery_type || null
        } : null
      },

      tar: {
        organisme: organisme,
        categorie: categorie,
        type: typeApplique,
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: tarifTTC,
        tva: tvaRate,
        calculation_method: calculation_method,
        notes: notes
      },

      validation: {
        warnings: warnings
      }
    });

  } catch (error) {
    console.error('❌ Erreur endpoint Odeal:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    baremes: {
      swico: 'Complet 2026',
      sens: 'Complet 2026',
      inobat: 'Complet 2026'
    }
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    service: 'TAR Calculator API',
    version: '2.0.0',
    endpoints: {
      calculate: 'POST /api/calculate-tar',
      health: 'GET /health'
    }
  });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`✅ Serveur TAR Calculator v2.0 démarré sur le port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Anthropic Claude: ${anthropic ? 'Configuré ✓' : 'NON configuré ✗'}`);
  console.log(`🔍 SerpAPI: ${process.env.SERPAPI_KEY ? 'Configuré ✓' : 'NON configuré ✗'}`);
});

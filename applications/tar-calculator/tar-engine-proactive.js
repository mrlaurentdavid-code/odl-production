// ===================================
// 🧠 TAR ENGINE PROACTIVE
// Système intelligent basé sur l'analyse complète des barèmes 2026
// ===================================

const fs = require('fs');
const path = require('path');

// Charger les barèmes
const SWICO_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'swico-complet-2026.json'), 'utf8'));
const SENS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'sens-complet-2026.json'), 'utf8'));
const INOBAT_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'inobat-complet-2026.json'), 'utf8'));

const TVA_RATE = 8.1; // TVA suisse uniforme

// ===================================
// 🎯 STEP 1: DÉTERMINATION DE L'ORGANISME
// ===================================

/**
 * Détermine l'organisme responsable (SWICO, SENS, INOBAT, AUCUN)
 * basé sur une analyse complète des mots-clés et caractéristiques
 */
function determineOrganisme(description, productData = {}) {
  const desc = description.toLowerCase();
  const { category, product_type } = productData;

  // INOBAT - Détection prioritaire (piles et batteries)
  const inobatKeywords = ['pile', 'battery', 'batterie', 'rechargeable', 'lithium', 'li-ion', 'nimh', 'powerbank', 'aa', 'aaa', '9v'];
  if (inobatKeywords.some(kw => desc.includes(kw))) {
    return 'INOBAT';
  }

  // SENS - Électroménager et réfrigération
  const sensKeywords = {
    electromenager: ['bouilloire', 'cafetière', 'grille-pain', 'mixeur', 'blender', 'robot cuisine', 'cuiseur', 'friteuse', 'micro-ondes', 'four'],
    refrigeration: ['frigo', 'réfrigérateur', 'congélateur', 'climatiseur', 'refroidisseur', 'cave à vin', 'déshumidificateur'],
    nettoyage: ['aspirateur', 'nettoyeur', 'balai électrique'],
    jardin: ['tondeuse', 'taille-haie', 'souffleur'],
    eclairage: ['lampe', 'lumière', 'éclairage', 'led', 'ampoule', 'lustre'],
    outils: ['perceuse', 'visseuse', 'scie', 'ponceuse', 'outil électrique']
  };

  for (const [cat, keywords] of Object.entries(sensKeywords)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return 'SENS';
    }
  }

  // SWICO - Électronique, informatique, télécommunications
  const swicoKeywords = {
    informatique: ['ordinateur', 'laptop', 'notebook', 'macbook', 'pc', 'desktop', 'chromebook'],
    ecran: ['écran', 'screen', 'moniteur', 'display', 'all-in-one', 'imac'],
    peripherique: ['clavier', 'souris', 'keyboard', 'mouse', 'trackball', 'touchpad', 'joystick', 'gamepad', 'casque audio', 'microphone', 'hub', 'modem', 'disque dur externe'],
    telephone: ['smartphone', 'iphone', 'téléphone portable', 'galaxy', 'pixel', 'mobile'],
    tablette: ['tablette', 'tablet', 'ipad'],
    imprimante: ['imprimante', 'printer', 'scanner', 'copieur', 'multifonction'],
    audio: ['enceinte', 'speaker', 'casque', 'écouteur', 'airpods', 'barre de son'],
    photo: ['appareil photo', 'caméra', 'camera', 'webcam'],
    console: ['playstation', 'xbox', 'nintendo', 'console'],
    reseau: ['switch', 'router', 'nas', 'serveur', 'répéteur']
  };

  for (const [cat, keywords] of Object.entries(swicoKeywords)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return 'SWICO';
    }
  }

  // Par défaut: Si produit électronique → SWICO, sinon AUCUN
  const electronicsKeywords = ['électrique', 'electronic', 'électronique', 'numérique', 'digital'];
  if (electronicsKeywords.some(kw => desc.includes(kw))) {
    return 'SWICO';
  }

  return 'AUCUN';
}

// ===================================
// 🏷️ STEP 2: DÉTERMINATION DE LA CATÉGORIE
// ===================================

/**
 * Détermine la catégorie précise du produit
 */
function determineCategorie(description, organisme, productData = {}) {
  const desc = description.toLowerCase();

  if (organisme === 'SWICO') {
    // Périphériques (priorité haute car souvent confondus)
    const peripheriqueKeywords = ['clavier', 'souris', 'keyboard', 'mouse', 'trackball', 'touchpad', 'hub', 'disque dur externe', 'webcam'];
    if (peripheriqueKeywords.some(kw => desc.includes(kw))) {
      return 'peripherique';
    }

    // Smartphones
    if (desc.includes('smartphone') || desc.includes('iphone') || desc.includes('galaxy') || (desc.includes('téléphone') && desc.includes('portable'))) {
      return 'smartphone';
    }

    // Tablettes
    if (desc.includes('tablette') || desc.includes('tablet') || desc.includes('ipad')) {
      return 'tablette';
    }

    // Écrans (vérifier que ce n'est pas une tablette)
    if ((desc.includes('écran') || desc.includes('monitor') || desc.includes('display') || desc.includes('all-in-one') || desc.includes('imac')) && !desc.includes('tablette')) {
      return 'ecran';
    }

    // Ordinateurs portables
    if (desc.includes('laptop') || desc.includes('notebook') || desc.includes('macbook') || desc.includes('chromebook')) {
      return 'ordinateur_portable';
    }

    // Ordinateurs fixes
    if (desc.includes('desktop') || desc.includes('tour') || desc.includes('unité centrale') || desc.includes('mac mini')) {
      return 'ordinateur_fixe';
    }

    // Imprimantes
    if (desc.includes('imprimante') || desc.includes('printer') || desc.includes('scanner') || desc.includes('copieur') || desc.includes('multifonction')) {
      return 'imprimante';
    }

    // Audio
    if (desc.includes('enceinte') || desc.includes('speaker') || desc.includes('barre de son')) {
      return 'enceinte';
    }

    if (desc.includes('casque') || desc.includes('écouteur') || desc.includes('airpods') || desc.includes('headphone')) {
      return 'casque_ecouteur';
    }

    // Consoles
    if (desc.includes('playstation') || desc.includes('xbox') || desc.includes('nintendo') || desc.includes('console')) {
      return 'console_jeux';
    }

    // Par défaut SWICO
    return 'electronique_generale';
  }

  if (organisme === 'SENS') {
    // Réfrigération
    if (desc.includes('frigo') || desc.includes('réfrigérateur') || desc.includes('congélateur') || desc.includes('climatiseur')) {
      return 'refrigeration';
    }

    // Éclairage
    if (desc.includes('lampe') || desc.includes('lumière') || desc.includes('éclairage') || desc.includes('led') || desc.includes('ampoule')) {
      return 'eclairage';
    }

    // Outils électriques
    if (desc.includes('perceuse') || desc.includes('visseuse') || desc.includes('scie') || desc.includes('ponceuse') || desc.includes('outil')) {
      return 'outils_electriques';
    }

    // Par défaut: électroménager général
    return 'electromenager';
  }

  if (organisme === 'INOBAT') {
    // Batteries rechargeables
    if (desc.includes('rechargeable') || desc.includes('lithium') || desc.includes('li-ion') || desc.includes('powerbank')) {
      return 'batterie_rechargeable';
    }

    // Batteries véhicules
    if (desc.includes('e-bike') || desc.includes('vélo électrique') || desc.includes('scooter') || desc.includes('trottinette')) {
      return 'batterie_vehicule';
    }

    // Piles standards
    return 'pile';
  }

  return 'non_soumis';
}

// ===================================
// 💰 STEP 3: CALCUL DU TARIF
// ===================================

/**
 * Calcule le tarif TAR avec toutes les règles proactives
 * Retourne {tarifHT, tarifTTC, typeApplique, alternatives}
 */
function calculateTAR(productData) {
  const {
    description,
    organisme,
    categorie,
    poids_kg,
    screen_size_inches,
    product_name
  } = productData;

  let tarifHT = 0;
  let typeApplique = '';
  let alternatives = null;

  // ⚠️ Produits non soumis
  if (organisme === 'AUCUN') {
    return {
      tarifHT: '0.00',
      tarifTTC: '0.00',
      typeApplique: 'Non soumis à la TAR',
      alternatives: null,
      notes: []
    };
  }

  // 📱 SWICO
  if (organisme === 'SWICO') {
    const notes = ['Les batteries intégrées sont couvertes par le CAR Swico', 'Le CAR/ARC est inclus dans le prix consommateur'];

    // TABLETTES - TARIF SELON TAILLE (3 tranches SWICO 2026)
    if (categorie === 'tablette') {
      if (!screen_size_inches) {
        // Taille inconnue → proposer 3 options selon barème SWICO 2026
        alternatives = [
          {
            size: 'jusqu\'à 8.9"',
            tarifHT: '0.46',
            tarifTTC: (0.46 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Tablet jusqu\'à 8.9"',
            recommended: true
          },
          {
            size: '9" - 14.9"',
            tarifHT: '2.31',
            tarifTTC: (2.31 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Tablet 9" - 14.9" (iPad standard, Galaxy Tab)'
          },
          {
            size: 'de plus de 15"',
            tarifHT: '5.57',
            tarifTTC: (5.57 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Tablet de plus de 15" (iPad Pro 15+, Surface Pro)'
          }
        ];

        // Option par défaut (la plus courante: petites tablettes)
        tarifHT = 0.46;
        typeApplique = 'Tablet jusqu\'à 8.9" (taille non confirmée)';
        notes.push('⚠️ Taille de tablette non trouvée - 3 options proposées selon SWICO 2026');
        notes.push('Trouvez la taille exacte de l\'écran (en pouces) pour un calcul précis');
      } else {
        // Taille connue → appliquer le bon tarif selon barème SWICO 2026
        const taille = parseFloat(screen_size_inches);

        if (taille < 9) {
          tarifHT = 0.46;
          typeApplique = 'Tablet jusqu\'à 8.9"';
          notes.push('Petites tablettes 7"-8.9" (iPad Mini, Samsung Galaxy Tab A7 Lite, etc.)');
        } else if (taille < 15) {
          tarifHT = 2.31;
          typeApplique = 'Tablet 9" - 14.9"';
          notes.push('Tablettes standard 9"-14.9" (iPad 10.2", Galaxy Tab S8, Surface Go, etc.)');
        } else {
          tarifHT = 5.57;
          typeApplique = 'Tablet de plus de 15"';
          notes.push('Grandes tablettes ≥15" (iPad Pro 15", Surface Pro 15", etc.)');
        }

        notes.push(`Taille confirmée: ${taille}"`);
      }

      notes.push('Tarifs SWICO 2026 pour tablettes avec OS complet (iOS, Android, Windows)');

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives,
        notes
      };
    }

    // ÉCRANS - TARIF SELON TAILLE (8 tranches)
    if (categorie === 'ecran') {
      if (!screen_size_inches) {
        // Taille inconnue → proposer 3 options
        alternatives = [
          {
            size: '15-32"',
            tarifHT: '5.57',
            tarifTTC: (5.57 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Écran 15-32" (le plus courant)',
            recommended: true
          },
          {
            size: '8-14"',
            tarifHT: '2.31',
            tarifTTC: (2.31 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Écran portable 8-14"'
          },
          {
            size: '33-44"',
            tarifHT: '13.88',
            tarifTTC: (13.88 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Grand écran 33-44"'
          }
        ];

        // Option par défaut (la plus courante)
        tarifHT = 5.57;
        typeApplique = 'Écran 15-32" (taille non confirmée)';
        notes.push('⚠️ Taille d\'écran non trouvée - 3 options proposées selon la taille');
        notes.push('Trouvez la taille exacte (en pouces) pour un calcul précis');
      } else {
        // Taille connue → appliquer le bon tarif
        const taille = parseFloat(screen_size_inches);

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

        notes.push(`Taille confirmée: ${taille}"`);
      }

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives,
        notes
      };
    }

    // ORDINATEURS PORTABLES - 2 tranches
    if (categorie === 'ordinateur_portable') {
      const taille = screen_size_inches || 14; // Par défaut: 14" (la plus courante)

      if (!screen_size_inches) {
        alternatives = [
          {
            size: '≥ 12"',
            tarifHT: '5.57',
            tarifTTC: (5.57 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Laptop standard ≥ 12" (le plus courant)',
            recommended: true
          },
          {
            size: '< 12"',
            tarifHT: '2.31',
            tarifTTC: (2.31 * (1 + TVA_RATE / 100)).toFixed(2),
            designation: 'Ultraportable < 12"'
          }
        ];

        tarifHT = 5.57; // Par défaut (90% des laptops font ≥12")
        typeApplique = 'Notebook ≥ 12" (taille estimée)';
        notes.push('⚠️ Taille d\'écran non trouvée - Par défaut: ≥12" (la majorité des laptops)');
      } else if (taille < 12) {
        tarifHT = 2.31;
        typeApplique = 'Notebook < 12"';
      } else {
        tarifHT = 5.57;
        typeApplique = 'Notebook ≥ 12"';
      }

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives,
        notes
      };
    }

    // PÉRIPHÉRIQUES - TARIF UNIQUE
    if (categorie === 'peripherique') {
      tarifHT = 0.46;
      typeApplique = 'Périphérique informatique';
      notes.push('Claviers, souris, webcams, hubs USB - même tarif quel que soit le type');

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // SMARTPHONES
    if (categorie === 'smartphone') {
      tarifHT = 0.19;
      typeApplique = 'Smartphone/Téléphone portable';

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // ORDINATEURS FIXES
    if (categorie === 'ordinateur_fixe') {
      tarifHT = 5.57;
      typeApplique = 'Ordinateur fixe / All-in-One';

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // IMPRIMANTES
    if (categorie === 'imprimante') {
      // Vérifier si multifonction
      if (description && (description.toLowerCase().includes('multifonction') || description.toLowerCase().includes('copieur'))) {
        tarifHT = 5.57;
        typeApplique = 'Multifonction/Copieur';
      } else {
        tarifHT = 2.31;
        typeApplique = 'Imprimante/Scanner';
      }

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // ENCEINTES
    if (categorie === 'enceinte') {
      const poids = poids_kg || 1;
      if (poids >= 1.5) {
        tarifHT = 2.31;
        typeApplique = 'Haut-parleur / Subwoofer';
      } else {
        tarifHT = 0.46;
        typeApplique = 'Enceinte portable';
      }

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // CASQUES
    if (categorie === 'casque_ecouteur') {
      tarifHT = 0.46;
      typeApplique = 'Casque audio/Écouteurs';

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // CONSOLES
    if (categorie === 'console_jeux') {
      tarifHT = 2.31;
      typeApplique = 'Console de jeux';

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    }

    // Par défaut SWICO
    tarifHT = 2.31;
    typeApplique = 'Appareil électronique SWICO';

    return {
      tarifHT: tarifHT.toFixed(2),
      tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
      typeApplique,
      alternatives: null,
      notes
    };
  }

  // 🏠 SENS
  if (organisme === 'SENS') {
    const notes = ['Si l\'appareil contient des batteries intégrées, elles sont couvertes par ce tarif SENS'];
    const poids = poids_kg || 1;

    if (!poids_kg) {
      // Poids inconnu → proposer 3 options courantes
      alternatives = [
        {
          poids: '0.25-5 kg',
          tarifHT: '0.68',
          tarifTTC: (0.68 * (1 + TVA_RATE / 100)).toFixed(2),
          designation: 'Petit appareil 0.25-5kg (le plus courant)',
          recommended: true
        },
        {
          poids: '5-15 kg',
          tarifHT: '3.11',
          tarifTTC: (3.11 * (1 + TVA_RATE / 100)).toFixed(2),
          designation: 'Appareil moyen 5-15kg'
        },
        {
          poids: '15-25 kg',
          tarifHT: '7.51',
          tarifTTC: (7.51 * (1 + TVA_RATE / 100)).toFixed(2),
          designation: 'Gros appareil 15-25kg'
        }
      ];

      notes.push('⚠️ Poids non trouvé - 3 options proposées selon le poids');
      notes.push('Trouvez le poids exact (en kg) pour un calcul précis');
    }

    if (categorie === 'refrigeration') {
      // Réfrigération
      const tranches = SENS_DATA.categories['200_Refrigeration'].tranches;
      const tranche = tranches.find(t => poids >= t.poidsMin && (poids < t.poidsMax || t.poidsMax === 999999));

      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Réfrigération ${tranche.poidsMin}-${tranche.poidsMax === 999999 ? '250+' : tranche.poidsMax}kg`;
      } else {
        tarifHT = 26.00; // Par défaut: tranche moyenne
        typeApplique = 'Réfrigération (poids estimé)';
      }
    } else if (categorie === 'eclairage') {
      // Éclairage - vérifier si luminaire ou ampoule
      if (description && (description.toLowerCase().includes('ampoule') || description.toLowerCase().includes('led'))) {
        tarifHT = 0.16;
        typeApplique = 'Ampoule/Source lumineuse';
      } else {
        tarifHT = 0.18;
        typeApplique = 'Luminaire';
      }

      return {
        tarifHT: tarifHT.toFixed(2),
        tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
        typeApplique,
        alternatives: null,
        notes
      };
    } else if (categorie === 'outils_electriques') {
      // Outils électriques par poids (INCLUANT batterie)
      const tranchesOutils = SENS_DATA.categories['400_PowerTools'].tranches;
      const tranche = tranchesOutils.find(t => poids >= t.poidsMin && (poids < t.poidsMax || t.poidsMax === 999999));

      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Outil électrique ${tranche.poidsMin}-${tranche.poidsMax === 999999 ? '15+' : tranche.poidsMax}kg`;
      } else {
        tarifHT = 1.58; // Par défaut: tranche 0.25-2kg
        typeApplique = 'Outil électrique (poids estimé)';
      }

      notes.push('⚠️ Poids INCLUANT la batterie');
    } else {
      // Électroménager général
      const tranches = SENS_DATA.categories['100_SENS_General'].tranches;
      const tranche = tranches.find(t => poids >= t.poidsMin && poids < t.poidsMax);

      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Électroménager ${tranche.poidsMin}-${tranche.poidsMax}kg`;
      } else {
        tarifHT = 0.68; // Par défaut: tranche 0.25-5kg (la plus courante)
        typeApplique = 'Électroménager (poids estimé)';
      }
    }

    return {
      tarifHT: tarifHT.toFixed(2),
      tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
      typeApplique,
      alternatives,
      notes
    };
  }

  // 🔋 INOBAT
  if (organisme === 'INOBAT') {
    const notes = ['Enregistrement direct auprès d\'INOBAT'];
    const poids = poids_kg || 0.1;

    if (categorie === 'pile') {
      // Détecter le format de pile
      const desc = description.toLowerCase();

      if (desc.includes('aaa') || desc.includes('micro') || desc.includes('r03')) {
        tarifHT = 0.05;
        typeApplique = 'Pile AAA/Micro';
      } else if (desc.includes('aa') || desc.includes('mignon') || desc.includes('r6')) {
        tarifHT = 0.05;
        typeApplique = 'Pile AA/Mignon';
      } else if (desc.includes('9v') || desc.includes('6f22')) {
        tarifHT = 0.10;
        typeApplique = 'Pile 9V';
      } else if (desc.includes('c') || desc.includes('baby') || desc.includes('r14')) {
        tarifHT = 0.15;
        typeApplique = 'Pile C/Baby';
      } else if (desc.includes('d') || desc.includes('mono') || desc.includes('r20')) {
        tarifHT = 0.30;
        typeApplique = 'Pile D/Mono';
      } else {
        // Par poids (en grammes)
        const poidsGrammes = poids * 1000;
        const tranchesPiles = INOBAT_DATA.categories.piles_portables.parPoids;
        const tranche = tranchesPiles.find(t => poidsGrammes >= t.poidsMin && poidsGrammes <= t.poidsMax);

        if (tranche) {
          tarifHT = tranche.tarifHT;
          typeApplique = `Pile ${tranche.poidsMin}-${tranche.poidsMax}g`;
        } else {
          tarifHT = 0.05;
          typeApplique = 'Pile standard';
        }
      }
    } else if (categorie === 'batterie_rechargeable') {
      // Batteries rechargeables par poids (kg)
      const tranchesBatteries = INOBAT_DATA.categories.batteries_rechargeables.parPoids;
      const tranche = tranchesBatteries.find(t => poids >= t.poidsMin && poids < t.poidsMax);

      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Batterie rechargeable ${tranche.poidsMin}-${tranche.poidsMax}kg`;
      } else {
        tarifHT = 0.25;
        typeApplique = 'Batterie rechargeable (poids estimé)';
      }

      notes.push('Batteries d\'outils, powerbanks, robots, etc.');
    } else if (categorie === 'batterie_vehicule') {
      // Batteries véhicules par poids (kg)
      const tranchesVehicules = INOBAT_DATA.categories.batteries_vehicules.parPoids;
      const tranche = tranchesVehicules.find(t => poids >= t.poidsMin && poids < t.poidsMax);

      if (tranche) {
        tarifHT = tranche.tarifHT;
        typeApplique = `Batterie véhicule ${tranche.poidsMin}-${tranche.poidsMax}kg`;
      } else {
        tarifHT = 4.50;
        typeApplique = 'Batterie véhicule (poids estimé)';
      }

      notes.push('Batteries e-bike, scooter, trottinette électrique');
      notes.push('⚠️ Enregistrement direct avec Inobat catégorie 88100');
    }

    return {
      tarifHT: tarifHT.toFixed(2),
      tarifTTC: (tarifHT * (1 + TVA_RATE / 100)).toFixed(2),
      typeApplique,
      alternatives: null,
      notes
    };
  }

  // Par défaut
  return {
    tarifHT: '0.00',
    tarifTTC: '0.00',
    typeApplique: 'Non déterminé',
    alternatives: null,
    notes: ['Impossible de déterminer le tarif TAR']
  };
}

// ===================================
// 🎯 FONCTION PRINCIPALE
// ===================================

/**
 * Calcul TAR complet et intelligent
 *
 * @param {Object} productData - Données du produit
 * @param {string} productData.description - Description du produit
 * @param {string} productData.product_name - Nom du produit
 * @param {string} productData.brand - Marque
 * @param {number} productData.product_weight_kg - Poids en kg
 * @param {number} productData.screen_size_inches - Taille écran en pouces
 * @param {string} productData.product_type - Type de produit
 * @param {string} productData.category - Catégorie
 *
 * @returns {Object} Résultat complet avec tarif, alternatives, notes
 */
function calculateTARProactive(productData) {
  const description = productData.description || productData.product_name || '';

  // Step 1: Déterminer l'organisme
  const organisme = determineOrganisme(description, productData);
  console.log(`📋 Organisme: ${organisme}`);

  // Step 2: Déterminer la catégorie
  const categorie = determineCategorie(description, organisme, productData);
  console.log(`🏷️  Catégorie: ${categorie}`);

  // Step 3: Calculer le tarif
  const result = calculateTAR({
    description,
    organisme,
    categorie,
    poids_kg: productData.product_weight_kg,
    screen_size_inches: productData.screen_size_inches,
    product_name: productData.product_name
  });

  return {
    ...result,
    organisme,
    categorie
  };
}

module.exports = {
  calculateTARProactive,
  determineOrganisme,
  determineCategorie,
  calculateTAR
};

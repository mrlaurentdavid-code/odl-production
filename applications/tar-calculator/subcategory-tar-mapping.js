// ===================================
// Mapping Subcategories Odeal → TAR
// ===================================
// Ce fichier mappe chaque subcategory du formulaire Odeal vers :
// - L'organisme TAR (SWICO, SENS, INOBAT, AUCUN)
// - La catégorie TAR correspondante
// - Les besoins en données supplémentaires (poids, taille écran, etc.)

const SUBCATEGORY_TAR_MAPPING = {
  // ===================================
  // CATÉGORIE 1: MODE & ACCESSOIRES
  // ===================================

  // Vêtements (aucun TAR)
  's1': {   // Vêtements Femme
    organisme: 'AUCUN',
    categorie: 'vetements',
    needs_weight: false,
    needs_screen_size: false
  },
  's2': {   // Vêtements Homme
    organisme: 'AUCUN',
    categorie: 'vetements',
    needs_weight: false,
    needs_screen_size: false
  },
  's3': {   // Vêtements Enfant & Bébé
    organisme: 'AUCUN',
    categorie: 'vetements',
    needs_weight: false,
    needs_screen_size: false
  },

  // Chaussures (aucun TAR)
  's4': {   // Chaussures Femme
    organisme: 'AUCUN',
    categorie: 'chaussures',
    needs_weight: false,
    needs_screen_size: false
  },
  's5': {   // Chaussures Homme
    organisme: 'AUCUN',
    categorie: 'chaussures',
    needs_weight: false,
    needs_screen_size: false
  },
  's6': {   // Chaussures Enfant
    organisme: 'AUCUN',
    categorie: 'chaussures',
    needs_weight: false,
    needs_screen_size: false
  },

  // Accessoires mode (aucun TAR sauf si électronique)
  's7': {   // Sacs & Maroquinerie
    organisme: 'AUCUN',
    categorie: 'accessoires_mode',
    needs_weight: false,
    needs_screen_size: false
  },
  's8': {   // Bijoux
    organisme: 'AUCUN',
    categorie: 'bijoux',
    needs_weight: false,
    needs_screen_size: false
  },
  's9': {   // Montres (ATTENTION: montres connectées = SWICO)
    organisme: 'AUCUN',  // Par défaut, mais vérifier si has_battery
    categorie: 'montres',
    needs_weight: false,
    needs_screen_size: false,
    battery_override: {
      // Si has_battery = true, c'est une montre connectée
      organisme: 'SWICO',
      categorie: 'smartphone',  // Même catégorie que smartwatch
      default_tarif_ht: 0.19
    }
  },
  's10': {  // Lunettes & Accessoires
    organisme: 'AUCUN',
    categorie: 'lunettes',
    needs_weight: false,
    needs_screen_size: false
  },
  's11': {  // Bagages & Articles de voyage
    organisme: 'AUCUN',
    categorie: 'bagages',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 2: MAISON & JARDIN
  // ===================================

  's12': {  // Mobilier d'intérieur
    organisme: 'AUCUN',
    categorie: 'mobilier',
    needs_weight: false,
    needs_screen_size: false
  },
  's13': {  // Décoration
    organisme: 'AUCUN',
    categorie: 'decoration',
    needs_weight: false,
    needs_screen_size: false
  },
  's14': {  // Linge de maison
    organisme: 'AUCUN',
    categorie: 'linge',
    needs_weight: false,
    needs_screen_size: false
  },
  's15': {  // Literie
    organisme: 'AUCUN',
    categorie: 'literie',
    needs_weight: false,
    needs_screen_size: false
  },
  's16': {  // Mobilier de jardin
    organisme: 'AUCUN',
    categorie: 'mobilier_jardin',
    needs_weight: false,
    needs_screen_size: false
  },
  's17': {  // Jardinage (ATTENTION: tondeuses/taille-haies électriques = SENS)
    organisme: 'AUCUN',  // Par défaut (pots, terreau, outils manuels)
    categorie: 'jardinage',
    needs_weight: false,
    needs_screen_size: false,
    battery_override: {
      // Si has_battery = true, c'est un outil électrique
      organisme: 'SENS',
      categorie: 'electromenager',
      needs_weight: true
    }
  },
  's18': {  // Animalerie (Accessoires)
    organisme: 'AUCUN',
    categorie: 'animalerie',
    needs_weight: false,
    needs_screen_size: false
  },
  's19': {  // Produits d'entretien ménager
    organisme: 'AUCUN',
    categorie: 'entretien',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 3: ÉLECTRONIQUE & ÉLECTROMÉNAGER
  // ===================================

  's20': {  // Téléphonie & Accessoires
    organisme: 'SWICO',
    categorie: 'smartphone',
    default_tarif_ht: 0.19,
    needs_weight: false,
    needs_screen_size: false
  },
  's21': {  // Informatique (ordinateurs, tablettes, écrans)
    organisme: 'SWICO',
    categorie: 'ordinateur_portable',  // Par défaut
    needs_weight: true,
    needs_screen_size: true,  // CRITIQUE pour déterminer le tarif
    weight_thresholds: {
      // Si poids connu, on peut affiner
      desktop: 3.0  // > 3kg = probablement desktop
    }
  },
  's22': {  // Image & Son (TV, enceintes, casques)
    organisme: 'SWICO',
    categorie: 'enceinte',  // Par défaut
    needs_weight: true,
    needs_screen_size: true,  // Si c'est une TV/écran
    weight_thresholds: {
      large_speaker: 1.5  // >= 1.5kg = grosse enceinte (CHF 2.31)
    }
  },
  's23': {  // Photo & Vidéo
    organisme: 'SWICO',
    categorie: 'appareil_photo',
    default_tarif_ht: 0.46,
    needs_weight: false,
    needs_screen_size: false
  },
  's24': {  // Petit électroménager
    organisme: 'SENS',
    categorie: 'electromenager',
    needs_weight: true,  // CRITIQUE pour tranches SENS
    needs_screen_size: false
  },
  's25': {  // Gros électroménager
    organisme: 'SENS',
    categorie: 'refrigeration',  // Vérifier avec item_name
    needs_weight: true,  // CRITIQUE pour tranches SENS
    needs_screen_size: false
  },
  's26': {  // Objets connectés & Domotique
    organisme: 'SWICO',
    categorie: 'smartphone',  // Montres connectées, assistants vocaux
    default_tarif_ht: 0.19,
    needs_weight: false,
    needs_screen_size: false
  },
  's27': {  // Jeux vidéo & Consoles
    organisme: 'SWICO',
    categorie: 'console',
    default_tarif_ht: 2.31,
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 4: SPORT & LOISIRS
  // ===================================

  's28': {  // Vêtements de sport
    organisme: 'AUCUN',
    categorie: 'vetements_sport',
    needs_weight: false,
    needs_screen_size: false
  },
  's29': {  // Chaussures de sport
    organisme: 'AUCUN',
    categorie: 'chaussures_sport',
    needs_weight: false,
    needs_screen_size: false
  },
  's30': {  // Fitness & Musculation
    organisme: 'AUCUN',
    categorie: 'fitness',
    needs_weight: false,
    needs_screen_size: false
  },
  's31': {  // Sports de raquette
    organisme: 'AUCUN',
    categorie: 'sport_raquette',
    needs_weight: false,
    needs_screen_size: false
  },
  's32': {  // Sports collectifs
    organisme: 'AUCUN',
    categorie: 'sport_collectif',
    needs_weight: false,
    needs_screen_size: false
  },
  's33': {  // Cyclisme (ATTENTION: vélos électriques = SENS)
    organisme: 'AUCUN',  // Par défaut (vélos classiques)
    categorie: 'cyclisme',
    needs_weight: false,
    needs_screen_size: false,
    battery_override: {
      // Si has_battery = true, c'est un vélo électrique
      organisme: 'SENS',
      categorie: 'electromenager',
      needs_weight: true
    }
  },
  's34': {  // Sports d'hiver
    organisme: 'AUCUN',
    categorie: 'sport_hiver',
    needs_weight: false,
    needs_screen_size: false
  },
  's35': {  // Randonnée & Camping
    organisme: 'AUCUN',
    categorie: 'randonnee',
    needs_weight: false,
    needs_screen_size: false
  },
  's36': {  // Sports nautiques
    organisme: 'AUCUN',
    categorie: 'sport_nautique',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 5: BEAUTÉ & SANTÉ
  // ===================================

  's37': {  // Parfums
    organisme: 'AUCUN',
    categorie: 'parfums',
    needs_weight: false,
    needs_screen_size: false
  },
  's38': {  // Maquillage
    organisme: 'AUCUN',
    categorie: 'maquillage',
    needs_weight: false,
    needs_screen_size: false
  },
  's39': {  // Soins du visage
    organisme: 'AUCUN',
    categorie: 'soins_visage',
    needs_weight: false,
    needs_screen_size: false
  },
  's40': {  // Soins du corps
    organisme: 'AUCUN',
    categorie: 'soins_corps',
    needs_weight: false,
    needs_screen_size: false
  },
  's41': {  // Produits capillaires
    organisme: 'AUCUN',
    categorie: 'produits_capillaires',
    needs_weight: false,
    needs_screen_size: false
  },
  's42': {  // Appareils de soin (sèche-cheveux, lisseurs, épilateurs)
    organisme: 'SWICO',
    categorie: 'peripherique',  // Petit appareil électronique
    default_tarif_ht: 0.46,
    needs_weight: false,
    needs_screen_size: false
  },
  's43': {  // Produits d'hygiène
    organisme: 'AUCUN',
    categorie: 'hygiene',
    needs_weight: false,
    needs_screen_size: false
  },
  's44': {  // Médicaments (vente libre)
    organisme: 'AUCUN',
    categorie: 'medicaments',
    needs_weight: false,
    needs_screen_size: false
  },
  's45': {  // Compléments alimentaires
    organisme: 'AUCUN',
    categorie: 'complements_alimentaires',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 6: ALIMENTATION & BOISSONS
  // ===================================

  's46': {  // Arts de la table
    organisme: 'AUCUN',
    categorie: 'arts_table',
    needs_weight: false,
    needs_screen_size: false
  },
  's47': {  // Ustensiles & Accessoires de cuisine
    organisme: 'AUCUN',
    categorie: 'ustensiles_cuisine',
    needs_weight: false,
    needs_screen_size: false
  },
  's48': {  // Épicerie salée
    organisme: 'AUCUN',
    categorie: 'epicerie_salee',
    needs_weight: false,
    needs_screen_size: false
  },
  's49': {  // Épicerie sucrée
    organisme: 'AUCUN',
    categorie: 'epicerie_sucree',
    needs_weight: false,
    needs_screen_size: false
  },
  's50': {  // Café, Thé & Infusions
    organisme: 'AUCUN',
    categorie: 'cafe_the',
    needs_weight: false,
    needs_screen_size: false
  },
  's51': {  // Boissons non-alcoolisées
    organisme: 'AUCUN',
    categorie: 'boissons_non_alcoolisees',
    needs_weight: false,
    needs_screen_size: false
  },
  's52': {  // Vins & Champagnes
    organisme: 'AUCUN',
    categorie: 'vins',
    needs_weight: false,
    needs_screen_size: false
  },
  's53': {  // Bières & Cidres
    organisme: 'AUCUN',
    categorie: 'bieres',
    needs_weight: false,
    needs_screen_size: false
  },
  's54': {  // Spiritueux & Liqueurs
    organisme: 'AUCUN',
    categorie: 'spiritueux',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 7: CULTURE & DIVERTISSEMENT
  // ===================================

  's55': {  // Livres & Bandes dessinées
    organisme: 'AUCUN',
    categorie: 'livres',
    needs_weight: false,
    needs_screen_size: false
  },
  's56': {  // Journaux & Magazines
    organisme: 'AUCUN',
    categorie: 'presse',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 8: JOUETS & JEUX
  // ===================================

  's57': {  // Jouets & Jeux pour enfants
    organisme: 'AUCUN',  // Par défaut (jouets non électroniques)
    categorie: 'jouets',
    needs_weight: false,
    needs_screen_size: false,
    battery_override: {
      // Si has_battery = true, c'est un jouet électronique
      organisme: 'SWICO',
      categorie: 'peripherique',
      default_tarif_ht: 0.46
    }
  },
  's58': {  // Jeux de société & Puzzles
    organisme: 'AUCUN',
    categorie: 'jeux_societe',
    needs_weight: false,
    needs_screen_size: false
  },
  's59': {  // Loisirs créatifs
    organisme: 'AUCUN',
    categorie: 'loisirs_creatifs',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 9: AUTO & MOTO
  // ===================================

  's60': {  // Accessoires Auto
    organisme: 'AUCUN',  // Par défaut
    categorie: 'accessoires_auto',
    needs_weight: false,
    needs_screen_size: false,
    battery_override: {
      // Si has_battery = true, GPS/dashcam/etc.
      organisme: 'SWICO',
      categorie: 'autoradio',
      default_tarif_ht: 2.31
    }
  },
  's61': {  // Équipement Moto
    organisme: 'AUCUN',
    categorie: 'equipement_moto',
    needs_weight: false,
    needs_screen_size: false
  },

  // ===================================
  // CATÉGORIE 10: BRICOLAGE
  // ===================================

  's62': {  // Outillage à main
    organisme: 'AUCUN',
    categorie: 'outillage_main',
    needs_weight: false,
    needs_screen_size: false
  },
  's63': {  // Outillage électroportatif
    organisme: 'SWICO',  // Outils électriques
    categorie: 'peripherique',
    default_tarif_ht: 0.46,
    needs_weight: false,
    needs_screen_size: false
  },
  's64': {  // Quincaillerie
    organisme: 'AUCUN',
    categorie: 'quincaillerie',
    needs_weight: false,
    needs_screen_size: false
  },
  's65': {  // Peinture & Traitement
    organisme: 'AUCUN',
    categorie: 'peinture',
    needs_weight: false,
    needs_screen_size: false
  }
}

// ===================================
// Types de batteries et leur impact TAR
// ===================================
const BATTERY_TYPE_TAR = {
  'alkaline_non_rechargeable': {
    organisme: 'INOBAT',
    categorie: 'pile',
    default_tarif_ht: 0.05
  },
  'lithium_ion_rechargeable': {
    organisme: 'INOBAT',  // Si vendue seule
    categorie: 'batterie',
    needs_weight: true  // Pour déterminer la tranche
  },
  'lithium_metal_non_rechargeable': {
    organisme: 'INOBAT',
    categorie: 'pile',
    default_tarif_ht: 0.05
  },
  'lead_acid': {
    organisme: 'INOBAT',
    categorie: 'batterie',
    needs_weight: true
  },
  'nickel_metal_hydride': {
    organisme: 'INOBAT',
    categorie: 'batterie',
    needs_weight: true
  },
  'other': {
    organisme: 'INOBAT',
    categorie: 'batterie',
    needs_weight: true
  }
}

module.exports = {
  SUBCATEGORY_TAR_MAPPING,
  BATTERY_TYPE_TAR
}

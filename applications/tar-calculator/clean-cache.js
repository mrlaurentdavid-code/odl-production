// Script pour nettoyer un produit du cache Supabase
require('dotenv').config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanCachedProduct(ean) {
  try {
    console.log(`🧹 Nettoyage cache pour EAN ${ean}...`);

    // D'abord, voir ce qui existe
    const { data: existing, error: fetchError } = await supabase
      .from("products_catalog")
      .select("*")
      .eq("ean", ean)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        console.log(`✅ EAN ${ean} n'existe pas dans le cache - rien à faire`);
        return;
      }
      console.error("❌ Erreur lecture:", fetchError);
      return;
    }

    console.log(`📦 Produit trouvé en cache:`);
    console.log(`   - Nom: ${existing.product_name}`);
    console.log(`   - Marque: ${existing.brand}`);
    console.log(`   - Poids: ${existing.product_weight_kg} kg`);
    console.log(`   - Confidence: ${existing.confidence_score}%`);
    console.log(`   - Recherches: ${existing.search_count}`);
    console.log(`   - ID: ${existing.id}`);

    // Supprimer
    const { error: deleteError } = await supabase
      .from("products_catalog")
      .delete()
      .eq("ean", ean);

    if (deleteError) {
      console.error("❌ Erreur suppression:", deleteError);
      return;
    }

    console.log(`✅ Produit supprimé du cache pour EAN ${ean}`);
    console.log(`   Prochaine recherche de cet EAN déclenchera un enrichissement complet`);

  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

// EAN du clavier Logitech mal catégorisé
const EAN_TO_CLEAN = "5099206112261";

cleanCachedProduct(EAN_TO_CLEAN).then(() => {
  console.log("\n✅ Script terminé");
  process.exit(0);
});

const { createClient } = require("@supabase/supabase-js");

// Initialiser le client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Chercher un produit dans le cache
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
        console.log(`❌ EAN ${ean} pas en cache`);
        return null;
      }
      console.error("Erreur cache:", error);
      return null;
    }
    
    // Incrementer compteur
    await supabase
      .from("products_catalog")
      .update({ 
        search_count: data.search_count + 1,
        last_searched_at: new Date().toISOString()
      })
      .eq("ean", ean);
    
    console.log(`✅ Cache hit! ${data.product_name} (recherche #${data.search_count + 1})`);
    return data;
    
  } catch (error) {
    console.error("Erreur cache:", error.message);
    return null;
  }
}

// Sauvegarder un produit enrichi
async function saveEnrichedProduct(productData) {
  try {
    console.log(`💾 Sauvegarde produit enrichi: ${productData.product_name}...`);
    
    const { data, error } = await supabase
      .from("products_catalog")
      .insert([productData])
      .select()
      .single();
    
    if (error) {
      if (error.code === "23505") {
        // Duplicate - mise a jour
        console.log(`⚠️ EAN ${productData.ean} existe, mise a jour...`);
        const { data: updated, error: updateError } = await supabase
          .from("products_catalog")
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq("ean", productData.ean)
          .select()
          .single();
        
        if (updateError) {
          console.error("Erreur update:", updateError);
          return null;
        }
        return updated;
      }
      console.error("Erreur save:", error);
      return null;
    }
    
    console.log(`✅ Produit sauvegarde (ID: ${data.id})`);
    return data;
    
  } catch (error) {
    console.error("Erreur save:", error.message);
    return null;
  }
}

module.exports = {
  getProductFromCache,
  saveEnrichedProduct
};

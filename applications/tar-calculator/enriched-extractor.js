// OpenAI replaced with Anthropic Claude
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Extrait TOUTES les informations produit depuis resultats Google
 * Optimise pour creer une base de donnees produits complete
 */
async function extractCompleteProductData(ean, googleResultsText, googleUrls) {
  try {
    console.log(`🔬 Extraction COMPLETE pour EAN ${ean}...`);
    
    const prompt = `You are a professional product data analyst. Extract EVERY piece of information from these Google search results.

GOOGLE SEARCH RESULTS:
${googleResultsText}

EAN CODE: ${ean}

IMPORTANT RULES:
1. ALL text must be in ENGLISH (translate if needed)
2. Product name must be OFFICIAL and COMPLETE (brand + model + variant + color)
3. WEIGHT IS CRITICAL:
   - Look for: "weight", "weighs", "poids", "grams", "g", "kg", "ounces", "oz"
   - For earbuds/headphones: find BOTH individual weight AND case weight
   - ALWAYS convert to kg (divide grams by 1000, ounces by 35.274)
   - Example earbuds: 8g each earbud + 45g case = (8*2 + 45) = 61g = 0.061 kg
   - If you find ANY weight info (even partial), use it
   - If truly no weight found, estimate based on product type and size
4. DIMENSIONS: Look for length x width x height in cm, mm, inches
5. PRICE: Look for CHF, EUR, USD, $, €, Fr., SFr.
6. Extract ALL technical specifications found
7. Use null ONLY if absolutely no information exists
8. Be precise and factual but make reasonable estimates if needed

WEIGHT ESTIMATION GUIDE (if no exact data found):
- Smartphone: ~0.17-0.23 kg
- True wireless earbuds (with case): ~0.04-0.07 kg
- Over-ear headphones: ~0.25-0.35 kg
- Smartwatch: ~0.03-0.05 kg
- Tablet: ~0.4-0.7 kg
- Laptop: ~1.2-2.5 kg
- Desktop keyboard: ~0.8-1.2 kg
- Mouse: ~0.08-0.12 kg
- Speaker portable: ~0.5-2.0 kg
- Speaker home: ~2.0-8.0 kg

Return COMPLETE JSON with ALL fields:
{
  "product_name": "Full official name (Brand Model Variant Color)",
  "brand": "Brand name",
  "manufacturer": "Manufacturer if different",
  "model_number": "Exact model/reference",
  
  "short_description": "Concise 1-2 sentence description",
  "long_description": "Complete product description with all details found",
  "key_features": ["Feature 1", "Feature 2", "Feature 3"],
  
  "technical_specs": {
    "type": "earbuds/headphones/speaker/etc",
    "connectivity": "Bluetooth 5.3/WiFi/etc",
    "battery_life": "hours",
    "battery_life_hours": 0.0,
    "water_resistance": "IPX4/IP67/etc",
    "noise_cancellation": "yes/no/adaptive",
    "driver_size": "mm",
    "frequency_response": "Hz-kHz",
    "impedance": "ohms",
    "sensitivity": "dB",
    "microphone": "yes/no/beamforming",
    "codecs": "AAC, SBC, aptX, LDAC, etc",
    "controls": "touch/button",
    "charging": "USB-C/wireless/case",
    "bluetooth_version": "5.0/5.1/5.2/5.3",
    "bluetooth_range": "meters",
    "compatible_devices": "iOS, Android, etc"
  },
  
  "product_weight_kg": 0.0,
  "product_length_cm": 0.0,
  "product_width_cm": 0.0,
  "product_height_cm": 0.0,
  
  "package_weight_kg": 0.0,
  "package_length_cm": 0.0,
  "package_width_cm": 0.0,
  "package_height_cm": 0.0,
  
  "color": "Color name",
  "color_code": "#hexcode or null",
  
  "main_category": "Electronics",
  "sub_category": "Audio Equipment",
  "product_type": "True Wireless Earbuds",
  
  "msrp_chf": 0.0,
  "msrp_eur": 0.0,
  "msrp_usd": 0.0,
  
  "main_image_url": "Best quality image URL found",
  "images_urls": ["url1", "url2"],
  
  "energy_label": "A+++ or null",
  "warranty_months": 24,
  "country_of_origin": "Country",
  "made_in": "Manufacturing country",
  
  "certifications": ["CE", "FCC", "RoHS"],
  "water_resistance_rating": "IPX4 or null",
  
  "confidence": 95,
  "weight_source": "exact/estimated/unknown"
}

CRITICAL EXAMPLES:

Example 1 - Bose Ultra Open Earbuds:
If you see: "Each earbud weighs 6.5g, charging case 40g"
Calculate: 6.5 * 2 + 40 = 53g = 0.053 kg
If partial info: "earbuds are lightweight, case included"
Estimate based on similar products: 0.05-0.06 kg

Example 2 - Speaker:
If you see: "Weighs 2.9 kg" or "2900 grams" or "6.4 lbs"
Convert to kg: 2.9 kg or 2.9 kg or 2.9 kg (6.4/2.205)

Example 3 - No weight found:
If product is "True Wireless Earbuds" and no weight mentioned
Estimate: 0.05 kg (typical for this category)
Set weight_source: "estimated"`;

    const extraction = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      temperature: 0.3,
      system: "You are a meticulous product data extraction expert. Extract all factual information accurately. For missing critical data like weight, make reasonable estimates based on product category. All text in English.",
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const result = JSON.parse(extraction.content[0].text);
    
    console.log(`✅ Extraction complete:`);
    console.log(`   - Produit: ${result.product_name}`);
    console.log(`   - Poids: ${result.product_weight_kg} kg (${result.weight_source || 'unknown'})`);
    console.log(`   - Prix CHF: ${result.msrp_chf || "N/A"}`);
    console.log(`   - Specs: ${Object.keys(result.technical_specs || {}).length} champs`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Erreur extraction complete:`, error.message);
    return null;
  }
}

module.exports = { extractCompleteProductData };

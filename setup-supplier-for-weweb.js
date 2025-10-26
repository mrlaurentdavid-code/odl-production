// Script pour vérifier et configurer le supplier pour WeWeb
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

const TARGET_SUPPLIER_ID = '334773ca-22ab-43bb-834f-eb50aa1d01f8';
const API_KEY = 'WEWEB_TEST_2025_API_KEY_FOR_TESTING';
const API_KEY_HASH = crypto.createHash('sha256').update(API_KEY).digest('hex');

console.log('🔍 Configuration du supplier pour WeWeb...\n');
console.log('Supplier ID cible:', TARGET_SUPPLIER_ID);
console.log('Clé API:', API_KEY);
console.log('Hash:', API_KEY_HASH);
console.log('');

// Helper pour faire des requêtes
const request = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

(async () => {
  try {
    // Étape 1: Vérifier si le supplier existe
    console.log('📋 Étape 1: Vérification du supplier...');
    const checkSupplier = await request({
      hostname: SUPABASE_URL,
      path: `/rest/v1/supplier_registry?supplier_id=eq.${TARGET_SUPPLIER_ID}`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let supplierExists = checkSupplier.data && checkSupplier.data.length > 0;

    if (supplierExists) {
      console.log('✅ Supplier existe:', checkSupplier.data[0].company_name);
      console.log('');
    } else {
      console.log('❌ Supplier n\'existe pas. Création...');

      // Créer le supplier
      const createSupplier = await request({
        hostname: SUPABASE_URL,
        path: '/rest/v1/supplier_registry',
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }, {
        supplier_id: TARGET_SUPPLIER_ID,
        company_name: 'WeWeb Test Supplier',
        company_email: 'test@weweb.io',
        api_key_hash: API_KEY_HASH,
        api_key_prefix: 'WEWEB_TEST',
        is_active: true,
        validation_status: 'approved',
        max_daily_validations: 10000,
        synced_from: 'manual'
      });

      if (createSupplier.status === 201) {
        console.log('✅ Supplier créé avec succès!');
        console.log('');
        supplierExists = true;
      } else {
        console.log('❌ Erreur création supplier:', createSupplier.data);
        return;
      }
    }

    // Étape 2: Vérifier/mettre à jour la clé API
    console.log('🔑 Étape 2: Configuration de la clé API...');

    const updateApiKey = await request({
      hostname: SUPABASE_URL,
      path: `/rest/v1/supplier_registry?supplier_id=eq.${TARGET_SUPPLIER_ID}`,
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }, {
      api_key_hash: API_KEY_HASH,
      api_key_prefix: 'WEWEB_TEST',
      is_active: true,
      validation_status: 'approved',
      updated_at: new Date().toISOString()
    });

    if (updateApiKey.status === 200) {
      console.log('✅ Clé API configurée avec succès!');
      console.log('');
    }

    // Étape 3: Afficher le résumé
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ CONFIGURATION TERMINÉE - PRÊT POUR WEWEB');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Informations pour WeWeb:');
    console.log('');
    console.log('1. API Endpoint:');
    console.log('   POST https://api.odl-tools.ch/api/validate-item');
    console.log('');
    console.log('2. Headers:');
    console.log('   Content-Type: application/json');
    console.log('   X-API-Key:', API_KEY);
    console.log('');
    console.log('3. Supplier ID (à inclure dans le body):');
    console.log('   "supplier_id":', `"${TARGET_SUPPLIER_ID}"`);
    console.log('');
    console.log('4. Champs REQUIS dans le body:');
    console.log('   - offer_id (UUID)');
    console.log('   - item_id (UUID)');
    console.log('   - msrp (number, prix MSRP TTC CHF)');
    console.log('   - street_price (number, prix street TTC CHF)');
    console.log('   - promo_price (number, prix promo TTC CHF)');
    console.log('   - purchase_price_ht (number, prix achat HT)');
    console.log('');
    console.log('5. Champs OPTIONNELS:');
    console.log('   - purchase_currency (EUR|USD|GBP|CHF, défaut: CHF)');
    console.log('   - category_name (string, pour règles hiérarchiques)');
    console.log('   - subcategory_name (string, pour règles hiérarchiques)');
    console.log('   - product_name (string)');
    console.log('   - ean (string)');
    console.log('   - package_weight_kg (number)');
    console.log('   - quantity (number, défaut: 1)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
})();

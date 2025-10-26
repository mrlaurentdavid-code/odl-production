// Script pour configurer le supplier WeWeb avec ID spécifique
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

const TARGET_SUPPLIER_ID = '334773ca-22ab-43bb-834f-eb50aa1d01f8';
const API_KEY = 'WEWEB_PRODUCTION_2025_API_KEY';  // Nouvelle clé unique
const API_KEY_HASH = crypto.createHash('sha256').update(API_KEY).digest('hex');

console.log('🔍 Configuration du supplier WeWeb...\n');

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
    // Vérifier si le supplier existe
    console.log('📋 Vérification du supplier', TARGET_SUPPLIER_ID, '...');
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

    if (checkSupplier.data && checkSupplier.data.length > 0) {
      console.log('✅ Supplier existe déjà:', checkSupplier.data[0].company_name);
      console.log('   On va mettre à jour sa clé API...\n');

      // Mettre à jour la clé API
      const updateSupplier = await request({
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
        api_key_prefix: 'WEWEB_PROD',
        is_active: true,
        validation_status: 'approved',
        updated_at: new Date().toISOString()
      });

      if (updateSupplier.status === 200) {
        console.log('✅ Clé API mise à jour!\n');
      }
    } else {
      console.log('❌ Supplier n\'existe pas. Création...\n');

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
        company_name: 'WeWeb Supplier - AdminTest',
        company_email: 'admin@test.fr',
        api_key_hash: API_KEY_HASH,
        api_key_prefix: 'WEWEB_PROD',
        is_active: true,
        validation_status: 'approved',
        max_daily_validations: 10000,
        synced_from: 'weweb'
      });

      if (createSupplier.status === 201) {
        console.log('✅ Supplier créé avec succès!\n');
      } else {
        console.log('❌ Erreur:', createSupplier.data);
        return;
      }
    }

    // Vérification finale
    const finalCheck = await request({
      hostname: SUPABASE_URL,
      path: `/rest/v1/supplier_registry?supplier_id=eq.${TARGET_SUPPLIER_ID}`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const supplier = finalCheck.data[0];

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ CONFIGURATION RÉUSSIE - PRÊT POUR WEWEB');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📋 Informations du Supplier:');
    console.log('   Nom:', supplier.company_name);
    console.log('   Email:', supplier.company_email);
    console.log('   Statut:', supplier.is_active ? '✅ Actif' : '❌ Inactif');
    console.log('   Validation:', supplier.validation_status);
    console.log('   Quota journalier:', supplier.max_daily_validations, 'requêtes');
    console.log('');

    console.log('🔑 Clé API:');
    console.log('   ', API_KEY);
    console.log('');
    console.log('🆔 Supplier ID:');
    console.log('   ', TARGET_SUPPLIER_ID);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 CONFIGURATION WEWEB - REST API DATA SOURCE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('1️⃣  URL de base:');
    console.log('    https://api.odl-tools.ch\n');

    console.log('2️⃣  Endpoint:');
    console.log('    /api/validate-item\n');

    console.log('3️⃣  Méthode:');
    console.log('    POST\n');

    console.log('4️⃣  Headers:');
    console.log('    Content-Type: application/json');
    console.log('    X-API-Key:', API_KEY);
    console.log('');

    console.log('5️⃣  Body (variables WeWeb):');
    console.log('    {');
    console.log('      "supplier_id": "' + TARGET_SUPPLIER_ID + '",');
    console.log('      "offer_id": "{{form.offer_id}}",');
    console.log('      "item_id": "{{form.item_id}}",');
    console.log('      "msrp": {{form.msrp}},');
    console.log('      "street_price": {{form.street_price}},');
    console.log('      "promo_price": {{form.promo_price}},');
    console.log('      "purchase_price_ht": {{form.purchase_price_ht}},');
    console.log('      "purchase_currency": "{{form.currency}}",');
    console.log('      "category_name": "{{form.category}}",');
    console.log('      "product_name": "{{form.product_name}}",');
    console.log('      "package_weight_kg": {{form.weight}},');
    console.log('      "quantity": {{form.quantity}}');
    console.log('    }');
    console.log('');

    console.log('6️⃣  Réponse attendue:');
    console.log('    {');
    console.log('      "success": true,');
    console.log('      "is_valid": true/false,');
    console.log('      "deal_status": "top"|"good"|"almost"|"bad",');
    console.log('      "costs": { ... },');
    console.log('      "margins": { ... },');
    console.log('      "savings": { ... },');
    console.log('      "validation_issues": [ ... ]');
    console.log('    }');
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 COMMANDE DE TEST');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('curl -X POST https://api.odl-tools.ch/api/validate-item \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "X-API-Key: ' + API_KEY + '" \\');
    console.log('  -d \'{');
    console.log('    "supplier_id": "' + TARGET_SUPPLIER_ID + '",');
    console.log('    "offer_id": "123e4567-e89b-12d3-a456-426614174000",');
    console.log('    "item_id": "123e4567-e89b-12d3-a456-426614174001",');
    console.log('    "msrp": 199.00,');
    console.log('    "street_price": 122.00,');
    console.log('    "promo_price": 119.00,');
    console.log('    "purchase_price_ht": 90.00,');
    console.log('    "purchase_currency": "EUR",');
    console.log('    "category_name": "Electronics",');
    console.log('    "product_name": "Test Product"');
    console.log('  }\'');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
})();

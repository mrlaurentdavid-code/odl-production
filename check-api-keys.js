// Script pour vérifier les clés API dans supplier_api_keys
const https = require('https');

const SUPABASE_URL = 'https://xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

const options = {
  hostname: 'xewnzetqvrovqjcvwkus.supabase.co',
  path: '/rest/v1/supplier_api_keys?select=id,supplier_id,api_key_hash,key_name,is_active,created_at&order=created_at.desc&limit=10',
  method: 'GET',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('\n=== API Keys in supplier_api_keys table ===\n');

    if (res.statusCode === 200) {
      const keys = JSON.parse(data);

      if (keys.length === 0) {
        console.log('❌ AUCUNE CLÉ API TROUVÉE dans la table supplier_api_keys\n');
        console.log('Vous devez exécuter le script setup_weweb_test_data.sql');
      } else {
        console.log(`✅ ${keys.length} clé(s) API trouvée(s):\n`);
        keys.forEach((key, index) => {
          console.log(`${index + 1}. ID: ${key.id}`);
          console.log(`   Supplier ID: ${key.supplier_id}`);
          console.log(`   Key Name: ${key.key_name}`);
          console.log(`   Hash: ${key.api_key_hash}`);
          console.log(`   Active: ${key.is_active ? '✅' : '❌'}`);
          console.log(`   Created: ${key.created_at}`);
          console.log('');
        });

        // Vérifier la clé de test spécifique
        const testKey = keys.find(k => k.api_key_hash === 'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7');
        if (testKey) {
          console.log('✅ La clé de test WEWEB_TEST_2025 est présente!');
        } else {
          console.log('❌ La clé de test WEWEB_TEST_2025 (hash: c8f7e6d5...) N\'EST PAS présente');
          console.log('   Vous devez exécuter le script setup_weweb_test_data.sql');
        }
      }
    } else {
      console.log('Erreur:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Erreur de requête:', e);
});

req.end();

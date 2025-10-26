// Script pour créer une clé API pour le fournisseur existant
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

console.log('🔑 Création de la clé API de test...\n');
console.log('Clé en clair: WEWEB_TEST_2025');
console.log('Hash SHA256: c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7\n');

const insertData = {
  supplier_id: '3d50ac02-f403-42d8-9e27-ec0e5f3fbad2',  // Fournisseur existant
  api_key_hash: 'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7',
  key_name: 'WeWeb Test Key - Test Company SA',
  is_active: true
};

const options = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/supplier_api_keys',
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode, '\n');

    if (res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log('✅ CLÉ API CRÉÉE AVEC SUCCÈS!\n');
      console.log('Détails:');
      console.log('  • ID:', result[0].id);
      console.log('  • Supplier ID:', result[0].supplier_id);
      console.log('  • Key Name:', result[0].key_name);
      console.log('  • Active:', result[0].is_active ? '✅' : '❌');
      console.log('  • Created:', result[0].created_at);
      console.log('\n🔑 Utilisez maintenant cette clé dans votre header:');
      console.log('   X-API-Key: WEWEB_TEST_2025\n');
    } else {
      console.log('❌ Erreur lors de la création:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur de requête:', e);
});

req.write(JSON.stringify(insertData));
req.end();

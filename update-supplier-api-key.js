// Script pour mettre à jour la clé API dans supplier_registry
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

// Calculer le vrai hash de WEWEB_TEST_2025
const apiKey = 'WEWEB_TEST_2025';
const realHash = crypto.createHash('sha256').update(apiKey).digest('hex');

console.log('🔑 Mise à jour de la clé API...\n');
console.log('Clé en clair:', apiKey);
console.log('Hash SHA256 calculé:', realHash);
console.log('Hash attendu:     c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7');

if (realHash === 'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7') {
  console.log('⚠️  ATTENTION: Les hashs ne correspondent pas!');
  console.log('   Le hash dans le script setup_weweb_test_data.sql est incorrect.\n');
}

console.log('\nMise à jour du fournisseur avec le VRAI hash...\n');

const updateData = {
  api_key_hash: realHash,
  api_key_prefix: 'WEWEB_TEST',
  updated_at: new Date().toISOString()
};

const options = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/supplier_registry?supplier_id=eq.3d50ac02-f403-42d8-9e27-ec0e5f3fbad2',
  method: 'PATCH',
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

    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log('✅ CLÉ API MISE À JOUR AVEC SUCCÈS!\n');
      console.log('Supplier ID:', result[0].supplier_id);
      console.log('Company:', result[0].company_name);
      console.log('New Hash:', result[0].api_key_hash);
      console.log('New Prefix:', result[0].api_key_prefix);
      console.log('\n🔑 Utilisez maintenant:');
      console.log('   X-API-Key: WEWEB_TEST_2025\n');
    } else {
      console.log('❌ Erreur lors de la mise à jour:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur de requête:', e);
});

req.write(JSON.stringify(updateData));
req.end();

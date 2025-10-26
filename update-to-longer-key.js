// Script pour mettre à jour avec une clé plus longue
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

// Nouvelle clé avec au moins 20 caractères
const apiKey = 'WEWEB_TEST_2025_API_KEY_FOR_TESTING';
const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

console.log('🔑 Mise à jour avec une clé plus longue...\n');
console.log('Nouvelle clé:', apiKey);
console.log('Longueur:', apiKey.length, 'caractères');
console.log('Hash SHA256:', hash);
console.log('');

const updateData = {
  api_key_hash: hash,
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
      console.log('✅ CLÉ API MISE À JOUR!\n');
      console.log('Supplier ID:', result[0].supplier_id);
      console.log('Company:', result[0].company_name);
      console.log('New Hash:', result[0].api_key_hash);
      console.log('\n🔑 Utilisez maintenant cette clé:');
      console.log('   X-API-Key:', apiKey);
      console.log('\n📋 Copiez cette clé dans le presse-papier:');

      // Copier dans le presse-papier sur macOS
      const { exec } = require('child_process');
      exec(`echo "${apiKey}" | pbcopy`, (err) => {
        if (!err) {
          console.log('✅ Clé copiée dans le presse-papier!\n');
        }
      });
    } else {
      console.log('❌ Erreur:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur:', e);
});

req.write(JSON.stringify(updateData));
req.end();

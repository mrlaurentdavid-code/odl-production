// Script pour insérer la clé API de test dans supplier_api_keys
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

// SQL à exécuter
const sql = `
INSERT INTO supplier_api_keys (
  supplier_id,
  api_key_hash,
  key_name,
  created_by,
  last_used_at,
  is_active
) VALUES (
  '334773ca-22ab-43bb-834f-eb50aa1d01f8',
  'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7',
  'WeWeb Test Key - AdminTest',
  'ff8782ab-8e69-44a4-be0a-91b1e6508f5d',
  NULL,
  true
) ON CONFLICT (supplier_id, api_key_hash) DO UPDATE SET
  is_active = true,
  updated_at = now()
RETURNING id, key_name, is_active, created_at;
`;

const postData = JSON.stringify({
  query: sql
});

const options = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/rpc/exec',
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

// Essayer avec l'API SQL directement via psql endpoint
const sqlQuery = encodeURIComponent(sql);
const curlCommand = `curl -X POST 'https://${SUPABASE_URL}/rest/v1/rpc/exec' \\
  -H "apikey: ${SERVICE_ROLE_KEY}" \\
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '${postData}'`;

console.log('Tentative d\'insertion de la clé API de test...\n');
console.log('SQL à exécuter:');
console.log(sql);
console.log('\n\nNote: L\'API REST de Supabase ne supporte pas l\'exécution SQL directe.');
console.log('Vous devez exécuter ce SQL via le SQL Editor de Supabase Dashboard.');
console.log('\n📍 Allez sur: https://supabase.com/dashboard/project/xewnzetqvrovqjcvwkus/sql/new');
console.log('\nOu utilisez la commande suivante:\n');

// Créer un fichier SQL temporaire
const fs = require('fs');
fs.writeFileSync('/tmp/insert_test_api_key.sql', sql);
console.log('✅ SQL sauvegardé dans /tmp/insert_test_api_key.sql');

// Essayer d'insérer via l'API REST standard
console.log('\nTentative d\'insertion via l\'API REST...\n');

const insertData = {
  supplier_id: '334773ca-22ab-43bb-834f-eb50aa1d01f8',
  api_key_hash: 'c8f7e6d5b4a3c2e1f0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7',
  key_name: 'WeWeb Test Key - AdminTest',
  created_by: 'ff8782ab-8e69-44a4-be0a-91b1e6508f5d',
  is_active: true
};

const insertOptions = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/supplier_api_keys',
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation,resolution=merge-duplicates'
  }
};

const req = https.request(insertOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);

    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('\n✅ CLÉ API INSÉRÉE AVEC SUCCÈS!\n');
      console.log('Détails:', JSON.parse(data));
      console.log('\n🔑 Vous pouvez maintenant utiliser la clé: WEWEB_TEST_2025');
    } else if (res.statusCode === 409) {
      console.log('\n⚠️  La clé existe déjà (c\'est OK!)');
      console.log('Réponse:', data);
    } else {
      console.log('\n❌ Erreur lors de l\'insertion:');
      console.log('Réponse:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur de requête:', e);
});

req.write(JSON.stringify(insertData));
req.end();

// Vérifier les tables existantes sur le serveur distant
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

console.log('🔍 Vérification des tables sur le serveur distant...\n');

// Vérifier odeal_business_rules
const checkTable = (tableName) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${tableName}?select=*&limit=5`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const rows = JSON.parse(data);
          console.log(`✅ Table "${tableName}" existe (${rows.length} lignes récupérées)`);
          if (rows.length > 0) {
            console.log('   Colonnes:', Object.keys(rows[0]).join(', '));
          }
          resolve({ exists: true, rows });
        } else if (res.statusCode === 404) {
          console.log(`❌ Table "${tableName}" n'existe pas`);
          resolve({ exists: false });
        } else {
          console.log(`⚠️  Erreur pour "${tableName}":`, res.statusCode, data);
          resolve({ exists: false });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

(async () => {
  await checkTable('odeal_business_rules');
  console.log('');
  await checkTable('supplier_registry');
  console.log('');
  await checkTable('supplier_api_keys');
  console.log('');
  console.log('✅ Vérification terminée\n');
})();

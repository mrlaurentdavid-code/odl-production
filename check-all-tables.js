// Vérifier toutes les tables présentes en production
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

const tablesToCheck = [
  'logistics_providers',
  'logistics_rates',
  'currency_rates',
  'odeal_customs_duty_rates',
  'supplier_registry',
  'supplier_api_keys',
  'odl_rules',
  'odeal_business_rules',
  'offer_item_calculated_costs'
];

const checkTable = (tableName) => {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${tableName}?select=*&limit=1`,
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
          resolve({ table: tableName, exists: true, count: rows.length, columns: rows.length > 0 ? Object.keys(rows[0]).length : 0 });
        } else {
          resolve({ table: tableName, exists: false, error: data });
        }
      });
    });

    req.on('error', (e) => resolve({ table: tableName, exists: false, error: e.message }));
    req.end();
  });
};

(async () => {
  console.log('🔍 Vérification des tables en production...\n');

  for (const table of tablesToCheck) {
    const result = await checkTable(table);
    if (result.exists) {
      console.log(`✅ ${result.table.padEnd(35)} (${result.columns} colonnes)`);
    } else {
      console.log(`❌ ${result.table.padEnd(35)} - N'EXISTE PAS`);
    }
  }

  console.log('\n🔍 Vérification spécifique pour logistics_providers...\n');

  const checkProviders = await new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/logistics_providers?select=*',
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
          const providers = JSON.parse(data);
          console.log(`Providers trouvés: ${providers.length}`);
          providers.forEach(p => {
            console.log(`  - ${p.provider_name} (${p.service_type}): base ${p.base_rate_chf} CHF + ${p.rate_per_kg_chf} CHF/kg`);
          });
        } else {
          console.log('Erreur:', data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Erreur:', e);
      resolve();
    });
    req.end();
  });

})();

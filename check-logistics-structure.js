// Vérifier la structure de logistics_providers
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

const request = (options) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
};

(async () => {
  console.log('🔍 Structure de logistics_providers:\n');

  const providers = await request({
    hostname: SUPABASE_URL,
    path: '/rest/v1/logistics_providers?select=*',
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Providers en base:', providers.data.length);
  console.log('\nPremier provider:');
  console.log(JSON.stringify(providers.data[0], null, 2));

  console.log('\n\n🔍 Que recherche la fonction validate_and_calculate_item?\n');
  console.log('Colonnes attendues:');
  console.log('  - base_rate_chf');
  console.log('  - rate_per_kg_chf');
  console.log('  - provider_name');
  console.log('  - service_type (inbound/outbound)');
  console.log('  - is_active');

  console.log('\n\n🔍 Colonnes réellement présentes:');
  console.log(Object.keys(providers.data[0]).join(', '));

})();

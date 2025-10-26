// Vérifier logistics_rates
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

(async () => {
  console.log('🔍 Vérification de logistics_rates:\n');

  const req = https.request({
    hostname: SUPABASE_URL,
    path: '/rest/v1/logistics_rates?select=*&limit=3',
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const rates = JSON.parse(data);
      console.log(`Tarifs trouvés: ${rates.length}\n`);
      if (rates.length > 0) {
        console.log('Premier tarif:');
        console.log(JSON.stringify(rates[0], null, 2));
        console.log('\n\nColonnes disponibles:');
        console.log(Object.keys(rates[0]).join(', '));

        // Chercher spécifiquement DHL et Swiss Post
        console.log('\n\n🔍 Recherche DHL et Swiss Post...');
      }
    });
  });

  req.on('error', (e) => console.error('Erreur:', e));
  req.end();

  // Chercher DHL
  setTimeout(() => {
    const reqDHL = https.request({
      hostname: SUPABASE_URL,
      path: '/rest/v1/logistics_rates?select=*&provider_id=like.*dhl*',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const rates = JSON.parse(data);
        console.log('\nDHL tarifs:', rates.length);
        if (rates.length > 0) {
          console.log(JSON.stringify(rates[0], null, 2));
        }
      });
    });
    reqDHL.on('error', (e) => console.error('Erreur:', e));
    reqDHL.end();
  }, 1000);

})();

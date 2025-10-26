// Script pour vérifier les fournisseurs dans supplier_registry
const https = require('https');

const SUPABASE_URL = 'xewnzetqvrovqjcvwkus.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg5NTg1MywiZXhwIjoyMDc1NDcxODUzfQ.UMzFCv5c6OjM4FxHODN5QjIoPm4RBWrV17KasFLSB1o';

const options = {
  hostname: SUPABASE_URL,
  path: '/rest/v1/supplier_registry?select=supplier_id,company_name,company_email,is_active,validation_status,created_at',
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
    console.log('\n=== Fournisseurs dans supplier_registry ===\n');

    if (res.statusCode === 200) {
      const suppliers = JSON.parse(data);

      if (suppliers.length === 0) {
        console.log('❌ AUCUN FOURNISSEUR TROUVÉ dans supplier_registry\n');
        console.log('Vous devez créer le fournisseur AdminTest d\'abord.');
      } else {
        console.log(`✅ ${suppliers.length} fournisseur(s) trouvé(s):\n`);
        suppliers.forEach((supplier, index) => {
          console.log(`${index + 1}. Supplier ID: ${supplier.supplier_id}`);
          console.log(`   Company: ${supplier.company_name || 'N/A'}`);
          console.log(`   Email: ${supplier.company_email || 'N/A'}`);
          console.log(`   Active: ${supplier.is_active ? '✅' : '❌'}`);
          console.log(`   Status: ${supplier.validation_status}`);
          console.log(`   Created: ${supplier.created_at}`);
          console.log('');
        });
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

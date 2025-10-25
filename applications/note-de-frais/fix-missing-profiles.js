require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissingProfiles() {
    console.log('🔍 Recherche des utilisateurs sans profil...\n');

    try {
        // 1. Récupérer tous les utilisateurs authentifiés
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) {
            console.error('❌ Erreur récupération utilisateurs:', usersError);
            return;
        }

        console.log(`📋 ${users.length} utilisateur(s) trouvé(s)\n`);

        // 2. Récupérer tous les profils existants
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id');

        if (profilesError) {
            console.error('❌ Erreur récupération profils:', profilesError);
            return;
        }

        const existingProfileIds = new Set(profiles.map(p => p.id));

        // 3. Trouver les utilisateurs sans profil
        const usersWithoutProfile = users.filter(user => !existingProfileIds.has(user.id));

        if (usersWithoutProfile.length === 0) {
            console.log('✅ Tous les utilisateurs ont déjà un profil !');
            return;
        }

        console.log(`⚠️  ${usersWithoutProfile.length} utilisateur(s) sans profil détecté(s):\n`);

        // 4. Créer les profils manquants
        for (const user of usersWithoutProfile) {
            console.log(`   📝 Création du profil pour: ${user.email}`);

            const { data, error } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email,
                    full_name: user.email.includes('admin') ? 'Administrateur' : user.email.split('@')[0],
                    role: user.email.includes('admin') ? 'Admin' : 'Collaborateur',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) {
                console.error(`   ❌ Erreur pour ${user.email}:`, error.message);
            } else {
                console.log(`   ✅ Profil créé pour ${user.email}`);
            }
        }

        console.log('\n✅ Correction des profils terminée !');

    } catch (error) {
        console.error('❌ Erreur globale:', error);
    }
}

// Exécuter le script
console.log('🚀 Démarrage de la correction des profils manquants...\n');
fixMissingProfiles().then(() => {
    console.log('\n✨ Script terminé !');
    process.exit(0);
});

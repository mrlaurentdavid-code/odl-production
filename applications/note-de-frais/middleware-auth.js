/**
 * Middleware d'authentification et de contrôle d'accès pour Note de Frais
 * Vérifie que l'utilisateur est authentifié ET a accès à l'app note-de-frais
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware pour vérifier l'authentification Supabase
 */
async function checkAuth(req, res, next) {
    try {
        // Récupérer le token d'authentification depuis le header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Non authentifié',
                message: 'Token d\'authentification manquant'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Vérifier le token avec Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: 'Non authentifié',
                message: 'Token d\'authentification invalide'
            });
        }

        // Stocker l'utilisateur dans la requête pour les middlewares suivants
        req.user = user;
        next();
    } catch (error) {
        console.error('Erreur checkAuth:', error);
        return res.status(500).json({
            error: 'Erreur serveur',
            message: 'Erreur lors de la vérification de l\'authentification'
        });
    }
}

/**
 * Middleware pour vérifier l'accès à l'application note-de-frais
 */
async function checkAppAccess(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Non authentifié',
                message: 'Utilisateur non trouvé dans la requête'
            });
        }

        const userId = req.user.id;

        // Vérifier si l'utilisateur est super admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Erreur récupération profil:', profileError);
            return res.status(500).json({
                error: 'Erreur serveur',
                message: 'Erreur lors de la vérification du profil'
            });
        }

        // Si super admin, accès autorisé
        if (profile?.is_super_admin) {
            req.userRole = 'super_admin';
            return next();
        }

        // Sinon, vérifier l'accès spécifique à note-de-frais
        const { data: access, error: accessError } = await supabase
            .from('user_app_access')
            .select('role')
            .eq('user_id', userId)
            .eq('app_id', 'note-de-frais')
            .is('revoked_at', null)
            .single();

        if (accessError || !access) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas accès à l\'application Notes de Frais'
            });
        }

        // Stocker le rôle pour les middlewares/routes suivants
        req.userRole = access.role;
        next();
    } catch (error) {
        console.error('Erreur checkAppAccess:', error);
        return res.status(500).json({
            error: 'Erreur serveur',
            message: 'Erreur lors de la vérification des accès'
        });
    }
}

/**
 * Middleware pour vérifier le rôle admin dans l'app
 */
function requireAppAdmin(req, res, next) {
    if (!req.userRole) {
        return res.status(401).json({
            error: 'Non authentifié',
            message: 'Rôle utilisateur non trouvé'
        });
    }

    const allowedRoles = ['super_admin', 'admin'];
    if (!allowedRoles.includes(req.userRole)) {
        return res.status(403).json({
            error: 'Accès refusé',
            message: 'Vous devez être administrateur pour accéder à cette ressource'
        });
    }

    next();
}

/**
 * Combine les middlewares d'auth et de vérification d'accès
 */
function requireAuth() {
    return [checkAuth, checkAppAccess];
}

/**
 * Combine les middlewares d'auth, vérification d'accès et admin
 */
function requireAdmin() {
    return [checkAuth, checkAppAccess, requireAppAdmin];
}

module.exports = {
    checkAuth,
    checkAppAccess,
    requireAppAdmin,
    requireAuth,
    requireAdmin
};

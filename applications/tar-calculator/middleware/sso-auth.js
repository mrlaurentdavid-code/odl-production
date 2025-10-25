/**
 * Middleware SSO pour TAR Calculator
 * Vérifie le cookie SSO partagé avec ODL Tools + Accès à l'app
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Middleware pour vérifier l'authentification SSO + accès app
 */
async function requireAuth(req, res, next) {
  try {
    // Récupérer le cookie SSO
    const ssoToken = req.cookies['odl-sso-token'];

    if (!ssoToken) {
      const returnUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Veuillez vous connecter via ODL Tools',
        redirectTo: process.env.NODE_ENV === 'production'
          ? `https://app.odl-tools.ch/login?returnUrl=${returnUrl}`
          : `http://localhost:3001/login?returnUrl=${returnUrl}`
      });
    }

    // Créer une session Supabase avec le token SSO
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: ssoToken,
      refresh_token: ssoToken
    });

    if (sessionError) {
      const returnUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Session expirée, veuillez vous reconnecter',
        redirectTo: process.env.NODE_ENV === 'production'
          ? `https://app.odl-tools.ch/login?returnUrl=${returnUrl}`
          : `http://localhost:3001/login?returnUrl=${returnUrl}`
      });
    }

    // Vérifier l'utilisateur
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      const returnUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      return res.status(401).json({
        error: 'Token invalide',
        message: 'Session expirée, veuillez vous reconnecter',
        redirectTo: process.env.NODE_ENV === 'production'
          ? `https://app.odl-tools.ch/login?returnUrl=${returnUrl}`
          : `http://localhost:3001/login?returnUrl=${returnUrl}`
      });
    }

    // Vérifier si l'utilisateur est super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Erreur récupération profil:', profileError);
    }

    // Si super admin, accès autorisé
    if (profile?.is_super_admin) {
      req.user = user;
      req.userRole = 'super_admin';
      return next();
    }

    // Sinon, vérifier l'accès spécifique à tar-calculator
    const { data: access, error: accessError } = await supabase
      .from('user_app_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('app_id', 'tar-calculator')
      .is('revoked_at', null)
      .single();

    if (accessError || !access) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Vous n\'avez pas accès à l\'application TAR Calculator',
        redirectTo: process.env.NODE_ENV === 'production'
          ? `https://app.odl-tools.ch/dashboard`
          : `http://localhost:3001/dashboard`
      });
    }

    // Ajouter l'utilisateur et son rôle à la requête
    req.user = user;
    req.userRole = access.role;
    next();
  } catch (error) {
    console.error('Erreur middleware SSO:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de vérifier l\'authentification'
    });
  }
}

/**
 * Middleware optionnel - Vérifie l'auth mais ne bloque pas si absent
 */
async function optionalAuth(req, res, next) {
  try {
    const ssoToken = req.cookies['odl-sso-token'];

    if (ssoToken) {
      // Créer une session Supabase avec le token SSO
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: ssoToken,
        refresh_token: ssoToken
      });

      if (!sessionError) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Erreur auth optionnelle:', error);
    next();
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
};

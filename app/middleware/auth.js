// ============================================================
// Auth Middleware
// FLAGS:
//   SCENARIO75{adm_sess}            - admin session prefix
//   SCENARIO75{/api/verify-mfa}     - MFA endpoint is SKIPPED on cookie replay
// ============================================================

// Hardcoded admin session for demo (intentional vulnerability)
// A valid adm_sess cookie grants direct dashboard access WITHOUT MFA
const VALID_ADMIN_SESSIONS = [
  'adm_sess_4dm1n_s3cr3t_t0k3n_2024',
  'adm_sess_backup_4dm1n_t0k3n_9999'
];

function requireAdmin(req, res, next) {
  const adminCookie = req.cookies.adm_sess;

  if (adminCookie && adminCookie.startsWith('adm_sess')) {
    // INTENTIONAL: Cookie replay bypass - MFA is completely skipped
    // if a valid adm_sess cookie is presented
    // FLAG: SCENARIO75{/api/verify-mfa} - this endpoint is never called
    req.adminUser = { username: 'admin', role: 'administrator' };
    return next();
  }

  return res.redirect('/login?error=unauthorized');
}

function isAuthenticated(req, res, next) {
  const adminCookie = req.cookies.adm_sess;
  if (adminCookie && adminCookie.startsWith('adm_sess')) {
    req.adminUser = { username: 'admin', role: 'administrator' };
    return next();
  }
  next();
}

module.exports = { requireAdmin, isAuthenticated };

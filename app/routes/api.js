/**
 * SecOpsTrack — Red vs Blue CTF Lab | by SalimLabs
 * Author  : Prima Praditya | github.com/primaadit/SecOpsTrack
 * ⚠  Intentionally vulnerable — isolated environments only
 */
const express = require('express');
const router = express.Router();

// ============================================================
// POST /api/login
// Sets pre_mfa_session, redirects to MFA page
// ============================================================
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Intentionally weak credentials (for demo)
  if (username === 'admin' && password === 'admin123') {
    // Set pre-auth session - HttpOnly: false (intentional)
    // FLAG: SCENARIO75{pre_mfa_session}, SCENARIO75{pending_mfa_verification}, SCENARIO75{False}
    res.cookie('pre_mfa_session', 'pending_mfa_verification', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });
    return res.redirect('/mfa');
  }

  return res.redirect('/login?error=invalid');
});

module.exports = router;

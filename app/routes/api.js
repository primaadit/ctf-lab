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

// ============================================================
// GET /mfa - MFA verification page
// ============================================================
router.get('/mfa', (req, res) => {
  if (!req.cookies.pre_mfa_session) {
    return res.redirect('/login');
  }
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MFA Verification</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #16213e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 40px; width: 380px; }
    h1 { color: #e94560; font-size: 1.1rem; letter-spacing: 2px; text-align: center; margin-bottom: 24px; }
    .info { color: #a0a0c0; font-size: 0.85rem; margin-bottom: 20px; text-align: center; line-height: 1.6; }
    input { width: 100%; background: #0f0f1a; border: 1px solid #2a2a4a; color: #e0e0e0; padding: 10px 14px; border-radius: 4px; font-size: 0.95rem; text-align: center; letter-spacing: 8px; font-size: 1.2rem; }
    input:focus { outline: none; border-color: #e94560; }
    .btn { width: 100%; background: #e94560; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-size: 0.95rem; letter-spacing: 1px; margin-top: 16px; }
  </style>
</head>
<body>
<div class="card">
  <h1>🔑 MFA Verification</h1>
  <p class="info">Enter the 6-digit code sent to your registered device.</p>
  <form action="/api/verify-mfa" method="POST">
    <input type="text" name="code" maxlength="6" placeholder="000000" autocomplete="off" />
    <button type="submit" class="btn">Verify</button>
  </form>
</div>
</body>
</html>`);
});

// ============================================================
// POST /api/verify-mfa
// The MFA endpoint - BYPASSED entirely when adm_sess cookie is replayed
// FLAG: SCENARIO75{/api/verify-mfa}
// ============================================================
router.post('/verify-mfa', (req, res) => {
  const { code } = req.body;
  const preSession = req.cookies.pre_mfa_session;

  if (!preSession || preSession !== 'pending_mfa_verification') {
    return res.redirect('/login?error=invalid_session');
  }

  // Intentionally hardcoded OTP (CTF)
  if (code === '133742') {
    // Upgrade to full admin session
    // FLAG: SCENARIO75{adm_sess}
    res.cookie('adm_sess', 'adm_sess_4dm1n_s3cr3t_t0k3n_2024', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });
    res.clearCookie('pre_mfa_session');
    return res.redirect('/dashboard');
  }

  return res.redirect('/mfa?error=invalid_code');
});

module.exports = router;

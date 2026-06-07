/**
 * SecOpsTrack — Red vs Blue CTF Lab | by SalimLabs
 * Author  : Prima Praditya | github.com/primaadit/ctf-lab
 * ⚠  Intentionally vulnerable — isolated environments only
 */
const express = require('express');
const router = express.Router();

// GET /mfa
router.get('/', (req, res) => {
  if (!req.cookies.pre_mfa_session) {
    return res.redirect('/login');
  }
  const error = req.query.error || '';
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
    input { width: 100%; background: #0f0f1a; border: 1px solid #2a2a4a; color: #e0e0e0; padding: 10px 14px; border-radius: 4px; text-align: center; letter-spacing: 8px; font-size: 1.2rem; }
    input:focus { outline: none; border-color: #e94560; }
    .btn { width: 100%; background: #e94560; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-size: 0.95rem; letter-spacing: 1px; margin-top: 16px; }
    .error-msg { background: #3a1a1a; border: 1px solid #6a2a2a; color: #c08080; padding: 10px; border-radius: 4px; margin-bottom: 16px; font-size: 0.85rem; text-align: center; }
  </style>
</head>
<body>
<div class="card">
  <h1>🔑 MFA Verification</h1>
  ${error ? '<div class="error-msg">Invalid code. Please try again.</div>' : ''}
  <p class="info">Enter the 6-digit code sent to your registered device.</p>
  <form action="/api/verify-mfa" method="POST">
    <input type="text" name="code" maxlength="6" placeholder="000000" autocomplete="off" />
    <button type="submit" class="btn">Verify</button>
  </form>
</div>
</body>
</html>`);
});

module.exports = router;

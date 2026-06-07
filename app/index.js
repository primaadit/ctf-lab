/**
 * ============================================================
 *  SecOpsTrack — Red vs Blue CTF Lab
 *  by SalimLabs
 * ============================================================
 *  Author  : Prima Praditya (Abu Hamzah Salim)
 *  GitHub  : github.com/primaadit/SecOpsTrack
 *  LinkedIn: linkedin.com/in/primaadit
 *  License : MIT — Free to use for educational purposes only
 * ------------------------------------------------------------
 *  ⚠  This application is INTENTIONALLY VULNERABLE by design.
 *     Deploy ONLY in isolated, offline lab environments.
 *     Never expose to public networks.
 * ============================================================
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const wafMiddleware = require('./middleware/waf');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = 3075;

// ============================================================
// INTENTIONAL: Expose backend technology via X-Powered-By
// FLAG: SCENARIO75{Node.js}
// ============================================================
app.set('x-powered-by', true);
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Node.js');
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// robots.txt - FLAG: SCENARIO75{robots.txt}, SCENARIO75{/api/verify-mfa}, SCENARIO75{/dashboard}
// ============================================================
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(
`User-agent: *
Disallow: /api/verify-mfa
Disallow: /dashboard
Disallow: /admin
Disallow: /api/
# If you're reading this, check /dashboard - but you'll need the right credentials`
  );
});

// ============================================================
// Session initialization - sets pre_mfa_session cookie
// FLAG: SCENARIO75{pre_mfa_session}, SCENARIO75{pending_mfa_verification}
// ============================================================
app.use((req, res, next) => {
  if (!req.cookies.pre_mfa_session && !req.cookies.adm_sess) {
    // INTENTIONAL: HttpOnly=False so XSS can steal it
    // FLAG: SCENARIO75{False}
    res.cookie('pre_mfa_session', 'pending_mfa_verification', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });
  }
  next();
});

// Routes
app.use('/', require('./routes/main'));
app.use('/api', require('./routes/api'));
app.use('/mfa', require('./routes/mfa'));
app.use('/dashboard', require('./routes/dashboard'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CTF-LAB] Admin Feedback System running on port ${PORT}`);
});

module.exports = app;

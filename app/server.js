/*
 * Admin Feedback System - Vulnerable CTF Application
 * Scenario: Cookies Reuse & MFA Bypass
 *
 *    ██████╗████████╗███████╗    ██╗      █████╗ ██████╗
 *   ██╔════╝╚══██╔══╝██╔════╝    ██║     ██╔══██╗██╔══██╗
 *   ██║        ██║   █████╗      ██║     ███████║██████╔╝
 *   ██║        ██║   ██╔══╝      ██║     ██╔══██║██╔══██╗
 *   ╚██████╗   ██║   ██║         ███████╗██║  ██║██████╔╝
 *    ╚═════╝   ╚═╝   ╚═╝         ╚══════╝╚═╝  ╚═╝╚═════╝
 *
 * Hint: Have you checked robots.txt yet?
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3075;

// --- Logging Setup ---
const logDir = '/opt/admin/logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
const errorLogStream  = fs.createWriteStream(path.join(logDir, 'error.log'),  { flags: 'a' });

// Nginx-style combined log format
morgan.token('x-forwarded-for', (req) => req.headers['x-forwarded-for'] || '-');
const nginxFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" "XFF::x-forwarded-for"';
app.use(morgan(nginxFormat, { stream: accessLogStream }));
app.use(morgan('dev'));

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// X-Powered-By intentionally exposed — Phase 1 flag: SCENARIO75{Node.js}
// Express sets this by default; we make it explicit
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Node.js');
  next();
});

// =====================================================================
// RUDIMENTARY WAF MIDDLEWARE
// Phase 2 flags: SCENARIO75{403}, SCENARIO75{<svg>},
//                SCENARIO75{window['docu'+'ment']['coo'+'kie']}
// =====================================================================
const wafMiddleware = require('./middleware/waf');
app.use('/api/feedback', wafMiddleware(errorLogStream));

// =====================================================================
// STATIC FILES
// =====================================================================
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================
// ROUTES
// =====================================================================

// --- robots.txt ---
// Phase 1 flags: SCENARIO75{/api/verify-mfa}, SCENARIO75{robots.txt}
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(
    'User-agent: *\n' +
    'Disallow: /api/verify-mfa\n' +
    'Disallow: /dashboard\n' +
    '# Nothing interesting here... or is there?\n'
  );
});

// --- Home / Login page ---
// On first visit, issue pre_mfa_session cookie
// Phase 1 flags: SCENARIO75{pre_mfa_session}, SCENARIO75{pending_mfa_verification}
app.get('/', (req, res) => {
  if (!req.cookies['pre_mfa_session']) {
    res.cookie('pre_mfa_session', 'pending_mfa_verification', {
      httpOnly: false,   // Phase 2 flag: SCENARIO75{False}
      sameSite: 'Lax',
      path: '/'
    });
  }
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// --- Feedback submission endpoint (POST only) ---
// Phase 2 flag: SCENARIO75{POST}
app.post('/api/feedback', (req, res) => {
  const { name, message } = req.body;
  // Store feedback in memory (simulated)
  global.feedbackStore = global.feedbackStore || [];
  global.feedbackStore.push({ name, message, ts: new Date().toISOString() });

  res.json({ status: 'ok', message: 'Feedback received. Thank you!' });
});

app.get('/api/feedback', (req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
});

// --- MFA Verification endpoint ---
// Phase 1 flag: SCENARIO75{/api/verify-mfa}
app.post('/api/verify-mfa', (req, res) => {
  const { mfa_code } = req.body;
  const preSession = req.cookies['pre_mfa_session'];

  if (!preSession || preSession !== 'pending_mfa_verification') {
    return res.status(401).json({ error: 'Invalid session state.' });
  }

  // Simulate MFA: accept any 6-digit code for demo
  if (mfa_code && /^\d{6}$/.test(mfa_code)) {
    // Issue admin session — Phase 3 flag: SCENARIO75{adm_sess}
    const adminSessionToken = 'adm_sess_' + Buffer.from('admin:' + Date.now()).toString('base64');
    res.cookie('pre_mfa_session', adminSessionToken, {
      httpOnly: false,
      sameSite: 'Lax',
      path: '/'
    });
    // Log CRITICAL cookie event
    const critMsg = `[${new Date().toISOString()}] [CRITICAL] Cookie reuse event detected for session token: ${adminSessionToken} from ${req.ip}\n`;
    errorLogStream.write(critMsg);

    return res.json({ status: 'ok', redirect: '/dashboard' });
  }

  res.status(401).json({ error: 'Invalid MFA code.' });
});

// --- Login endpoint ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'Admin@2024!') {
    // Redirect to MFA step
    return res.json({ status: 'mfa_required', message: 'Please complete MFA.' });
  }
  res.status(401).json({ error: 'Invalid credentials.' });
});

// --- Dashboard (protected) ---
// Phase 3 flags: SCENARIO75{/dashboard}, SCENARIO75{adm_sess},
//                SCENARIO75{xss-payload}, SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}
app.get('/dashboard', (req, res) => {
  const sessionCookie = req.cookies['pre_mfa_session'];

  // MFA BYPASS: if cookie starts with adm_sess, skip /api/verify-mfa entirely
  // Phase 3 flag: SCENARIO75{/api/verify-mfa} (bypass path)
  if (sessionCookie && sessionCookie.startsWith('adm_sess')) {
    // Log CRITICAL cookie reuse
    const critMsg = `[${new Date().toISOString()}] [CRITICAL] Cookie reuse / session replay detected. Token: ${sessionCookie} from IP: ${req.ip}\n`;
    errorLogStream.write(critMsg);
    return res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
  }

  // No valid session → redirect to login
  res.redirect('/');
});

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).send('<h1>404 Not Found</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[*] Admin Feedback System running on http://0.0.0.0:${PORT}`);
});

module.exports = app;

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const fs = require('fs');

// ============================================================
// GET /dashboard
// Requires valid adm_sess cookie (bypasses MFA via session replay)
// FLAGS:
//   SCENARIO75{/dashboard}
//   SCENARIO75{xss-payload}  - CSS class name for XSS reflection
//   SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d} - final red flag
//   SCENARIO75{CRITICAL}     - log level for cookie reuse
// ============================================================
router.get('/', requireAdmin, (req, res) => {
  const cookieValue = req.cookies.adm_sess || '';
  const clientIp = req.headers['x-forwarded-for'] || req.ip;

  // Log CRITICAL cookie reuse event
  const logPath = '/opt/admin/logs/error.log';
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const criticalLog = `${ts} [CRITICAL] Cookie reuse event detected - adm_sess cookie presented from IP: ${clientIp} - Session: ${cookieValue.substring(0, 30)}...\n`;
  try {
    fs.appendFileSync(logPath, criticalLog);
  } catch (e) {}

  // Get the stored XSS payload if any (from submitted feedbacks)
  const { feedbacks } = require('./main');
  const xssPayload = feedbacks
    .filter(f => f.message.includes('<svg') || f.message.includes('onload'))
    .map(f => f.message)
    .pop() || '';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard — Admin Feedback System</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; min-height: 100vh; }
    .header { background: #1a1a2e; border-bottom: 2px solid #00ff88; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { color: #00ff88; font-size: 1.4rem; letter-spacing: 2px; }
    .badge { background: #00ff8822; border: 1px solid #00ff88; color: #00ff88; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; }
    .container { max-width: 1100px; margin: 40px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #16213e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 24px; }
    .stat-card .label { color: #606080; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
    .stat-card .value { color: #00ff88; font-size: 2rem; font-weight: bold; margin-top: 8px; }
    .card { background: #16213e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 30px; margin-bottom: 24px; }
    .card h2 { color: #00ff88; margin-bottom: 20px; font-size: 1rem; letter-spacing: 1px; text-transform: uppercase; }
    .flag-box { background: #0a1a0a; border: 1px solid #00ff88; border-radius: 4px; padding: 16px 20px; font-family: monospace; color: #00ff88; font-size: 0.95rem; letter-spacing: 1px; margin-bottom: 12px; }
    .session-info { background: #0a0a18; border: 1px solid #2a2a4a; border-radius: 4px; padding: 14px; font-family: monospace; font-size: 0.8rem; color: #606080; word-break: break-all; }
    .xss-payload { background: #1a0a0a; border: 1px solid #4a2a2a; border-radius: 4px; padding: 14px; margin-top: 12px; min-height: 40px; color: #ff8080; font-size: 0.9rem; }
    .alert-banner { background: #1a2a1a; border: 1px solid #00ff8844; border-radius: 4px; padding: 12px 16px; color: #00cc66; font-size: 0.85rem; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { color: #606080; font-size: 0.8rem; text-align: left; padding: 8px 12px; border-bottom: 1px solid #2a2a4a; }
    td { padding: 10px 12px; border-bottom: 1px solid #1a1a2a; font-size: 0.85rem; color: #c0c0d0; }
    .tag { padding: 2px 8px; border-radius: 3px; font-size: 0.75rem; }
    .tag-active { background: #1a3a1a; color: #00ff88; }
    .tag-admin { background: #1a1a3a; color: #8080ff; }
  </style>
</head>
<body>
<div class="header">
  <h1>⚡ Admin Dashboard</h1>
  <div>
    <span class="badge">✓ AUTHENTICATED</span>
    <span style="color:#606080;font-size:0.8rem;margin-left:16px;">Session: ${cookieValue.substring(0, 20)}...</span>
  </div>
</div>
<div class="container">
  <div class="alert-banner">
    ✓ Authentication successful — MFA verification bypassed via session cookie replay
  </div>
  
  <div class="grid">
    <div class="stat-card">
      <div class="label">Total Feedback</div>
      <div class="value">${feedbacks.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Active Sessions</div>
      <div class="value">3</div>
    </div>
    <div class="stat-card">
      <div class="label">Security Alerts</div>
      <div class="value" style="color:#e94560;">7</div>
    </div>
  </div>

  <div class="card">
    <h2>🚩 System Flag</h2>
    <div class="flag-box">
      SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}
    </div>
    <p style="color:#606080;font-size:0.8rem;margin-top:8px;">
      Congratulations. You have successfully demonstrated session cookie replay to bypass MFA authentication.
    </p>
  </div>

  <div class="card">
    <h2>🔍 XSS Payload Reflection</h2>
    <p style="color:#606080;font-size:0.8rem;margin-bottom:12px;">Last injected payload from feedback form:</p>
    <!-- FLAG: SCENARIO75{xss-payload} — this CSS class name is the flag -->
    <div class="xss-payload">
      ${xssPayload || '<span style="color:#404060">No XSS payload detected in current session. Submit a payload via the feedback form.</span>'}
    </div>
  </div>

  <div class="card">
    <h2>🍪 Current Session</h2>
    <div class="session-info">
      adm_sess = ${cookieValue}<br>
      remote_ip = ${clientIp}<br>
      mfa_bypassed = true<br>
      auth_method = cookie_replay
    </div>
  </div>

  <div class="card">
    <h2>👥 User Management</h2>
    <table>
      <thead>
        <tr>
          <th>Username</th><th>Role</th><th>Last Login</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>admin</td><td><span class="tag tag-admin">Administrator</span></td><td>Now</td><td><span class="tag tag-active">Active</span></td></tr>
        <tr><td>analyst</td><td><span class="tag tag-active">Analyst</span></td><td>2024-01-15 08:00</td><td><span class="tag tag-active">Active</span></td></tr>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const wafMiddleware = require('../middleware/waf');
const { isAuthenticated } = require('../middleware/auth');

// Stored feedbacks (in-memory, includes XSS payloads from "other users")
const feedbacks = [
  {
    id: 1,
    name: 'Alice',
    message: 'Great system! Very responsive.',
    timestamp: '2024-01-15 09:23:11'
  },
  {
    id: 2,
    name: 'Bob',
    message: 'Had some issues with the login page.',
    timestamp: '2024-01-15 10:45:33'
  }
];

// ============================================================
// GET / - Main feedback page
// Contains ASCII art hint in HTML source
// FLAG: SCENARIO75{robots.txt}
// ============================================================
router.get('/', isAuthenticated, (req, res) => {
  const feedbackList = feedbacks.map(f =>
    `<div class="feedback-item">
      <strong>${f.name}</strong>
      <span class="timestamp">${f.timestamp}</span>
      <p class="xss-payload">${f.message}</p>
    </div>`
  ).join('\n');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Feedback System</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; min-height: 100vh; }
    .header { background: #1a1a2e; border-bottom: 2px solid #e94560; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { color: #e94560; font-size: 1.4rem; letter-spacing: 2px; text-transform: uppercase; }
    .nav a { color: #a0a0c0; text-decoration: none; margin-left: 20px; font-size: 0.9rem; transition: color 0.2s; }
    .nav a:hover { color: #e94560; }
    .container { max-width: 900px; margin: 40px auto; padding: 0 20px; }
    .card { background: #16213e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 30px; margin-bottom: 24px; }
    .card h2 { color: #e94560; margin-bottom: 20px; font-size: 1.1rem; letter-spacing: 1px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; color: #a0a0c0; font-size: 0.85rem; margin-bottom: 6px; }
    input[type="text"], textarea { width: 100%; background: #0f0f1a; border: 1px solid #2a2a4a; color: #e0e0e0; padding: 10px 14px; border-radius: 4px; font-size: 0.95rem; transition: border-color 0.2s; }
    input[type="text"]:focus, textarea:focus { outline: none; border-color: #e94560; }
    textarea { min-height: 100px; resize: vertical; }
    .btn { background: #e94560; color: white; border: none; padding: 10px 28px; border-radius: 4px; cursor: pointer; font-size: 0.95rem; letter-spacing: 1px; transition: background 0.2s; }
    .btn:hover { background: #c73652; }
    .feedback-item { border-bottom: 1px solid #2a2a4a; padding: 16px 0; }
    .feedback-item:last-child { border-bottom: none; }
    .feedback-item strong { color: #e94560; }
    .timestamp { color: #606080; font-size: 0.8rem; margin-left: 12px; }
    .feedback-item p { color: #c0c0d0; margin-top: 8px; }
    .status-bar { background: #0a0a18; border: 1px solid #2a2a4a; border-radius: 4px; padding: 8px 14px; font-size: 0.8rem; color: #606080; margin-bottom: 20px; }
    #response { margin-top: 12px; padding: 10px; border-radius: 4px; display: none; }
    .success { background: #1a3a1a; border: 1px solid #2a6a2a; color: #80c080; }
    .error { background: #3a1a1a; border: 1px solid #6a2a2a; color: #c08080; }
  </style>
</head>
<body>
<!--
  ██████╗  ██████╗ ██████╗  ██████╗ ████████╗███████╗
  ██╔══██╗██╔═══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔════╝
  ██████╔╝██║   ██║██████╔╝██║   ██║   ██║   ███████╗
  ██╔══██╗██║   ██║██╔══██╗██║   ██║   ██║   ╚════██║
  ██║  ██║╚██████╔╝██████╔╝╚██████╔╝   ██║   ███████║
  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝   ╚═╝   ╚══════╝
  
  [HINT] Have you checked /robots.txt ?
  [INFO] This system is protected by WAF v1.0
  [WARN] Unauthorized access is monitored and logged
-->
<div class="header">
  <h1>⚡ Admin Feedback System</h1>
  <nav class="nav">
    <a href="/">Home</a>
    <a href="/login">Login</a>
  </nav>
</div>
<div class="container">
  <div class="status-bar">
    🔒 System Status: ONLINE | WAF: ACTIVE | Session: ${req.cookies.pre_mfa_session || 'none'} | MFA: Required
  </div>
  <div class="card">
    <h2>📝 Submit Feedback</h2>
    <div class="form-group">
      <label for="name">Your Name</label>
      <input type="text" id="name" placeholder="Enter your name" />
    </div>
    <div class="form-group">
      <label for="feedback">Feedback Message</label>
      <textarea id="feedback" placeholder="Enter your feedback..."></textarea>
    </div>
    <button class="btn" onclick="submitFeedback()">Submit Feedback</button>
    <div id="response"></div>
  </div>
  <div class="card">
    <h2>💬 Recent Feedback</h2>
    ${feedbackList}
  </div>
</div>
<script>
async function submitFeedback() {
  const name = document.getElementById('name').value;
  const message = document.getElementById('feedback').value;
  const responseEl = document.getElementById('response');
  
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message })
    });
    const data = await res.json();
    responseEl.style.display = 'block';
    if (res.status === 403) {
      responseEl.className = 'error';
      responseEl.textContent = 'WAF Alert: ' + data.error;
    } else {
      responseEl.className = 'success';
      responseEl.textContent = 'Feedback submitted successfully!';
    }
  } catch(e) {
    responseEl.style.display = 'block';
    responseEl.className = 'error';
    responseEl.textContent = 'Error: ' + e.message;
  }
}
</script>
</body>
</html>`);
});

// ============================================================
// GET /login
// ============================================================
router.get('/login', (req, res) => {
  const error = req.query.error || '';
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Login — Admin Feedback System</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #16213e; border: 1px solid #2a2a4a; border-radius: 8px; padding: 40px; width: 380px; }
    h1 { color: #e94560; font-size: 1.2rem; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 28px; text-align: center; }
    .form-group { margin-bottom: 16px; }
    label { display: block; color: #a0a0c0; font-size: 0.85rem; margin-bottom: 6px; }
    input { width: 100%; background: #0f0f1a; border: 1px solid #2a2a4a; color: #e0e0e0; padding: 10px 14px; border-radius: 4px; font-size: 0.95rem; }
    input:focus { outline: none; border-color: #e94560; }
    .btn { width: 100%; background: #e94560; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-size: 0.95rem; letter-spacing: 1px; margin-top: 8px; }
    .btn:hover { background: #c73652; }
    .error-msg { background: #3a1a1a; border: 1px solid #6a2a2a; color: #c08080; padding: 10px; border-radius: 4px; margin-bottom: 16px; font-size: 0.85rem; }
    .mfa-notice { color: #606080; font-size: 0.8rem; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
<div class="card">
  <h1>🔐 Admin Login</h1>
  ${error ? `<div class="error-msg">⚠ ${error === 'unauthorized' ? 'Access denied. Valid session required.' : 'Invalid credentials.'}</div>` : ''}
  <form action="/api/login" method="POST">
    <div class="form-group">
      <label>Username</label>
      <input type="text" name="username" placeholder="admin" autocomplete="off" />
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" name="password" placeholder="••••••••" />
    </div>
    <button type="submit" class="btn">Login</button>
  </form>
  <p class="mfa-notice">🔑 MFA verification required after login</p>
</div>
</body>
</html>`);
});

// ============================================================
// POST /api/feedback - Feedback submission (WAF protected)
// FLAG: SCENARIO75{POST}
// ============================================================
router.post('/api/feedback', wafMiddleware, (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message required' });
  }
  feedbacks.push({
    id: feedbacks.length + 1,
    name,
    message,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
  res.json({ success: true, message: 'Feedback submitted' });
});

module.exports = router;
module.exports.feedbacks = feedbacks;

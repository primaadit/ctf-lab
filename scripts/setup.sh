#!/bin/bash
# ============================================================
# CTF Lab Setup Script
# Provisions the Proxmox VM environment
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; exit 1; }

log "CTF Lab Setup — Red vs Blue Cyber Range"
log "========================================="

# ---- 1. System dependencies ----
log "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq \
    docker.io \
    docker-compose \
    openssh-server \
    curl \
    python3 \
    python3-pip \
    net-tools \
    tcpdump \
    jq

# ---- 2. Enable Docker ----
log "Starting Docker service..."
systemctl enable docker --now

# ---- 3. Create log directory ----
log "Creating log directory at /opt/admin/logs..."
mkdir -p /opt/admin/logs
chmod 777 /opt/admin/logs

# ---- 4. Create Blue Team SSH user ----
log "Creating analyst user (Blue Team SSH access)..."
if id "analyst" &>/dev/null; then
    warn "User 'analyst' already exists, skipping."
else
    useradd -m -s /bin/bash analyst
    echo "analyst:blue_team_rocks" | chpasswd
    log "Created user: analyst / blue_team_rocks"
fi

# Give analyst read access to logs
usermod -aG adm analyst 2>/dev/null || true
chown -R root:adm /opt/admin/logs
chmod -R 750 /opt/admin/logs
usermod -aG adm analyst

# ---- 5. Configure SSH on port 2275 ----
log "Configuring SSH on port 2275..."
if ! grep -q "Port 2275" /etc/ssh/sshd_config; then
    echo "Port 2275" >> /etc/ssh/sshd_config
    # Keep default port 22 disabled for hardening
    sed -i 's/^#Port 22/Port 2275/' /etc/ssh/sshd_config || true
fi
sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd
log "SSH listening on port 2275"

# ---- 6. Set /etc/hosts for lab domain ----
log "Configuring local hostname..."
if ! grep -q "feedback.admin.local" /etc/hosts; then
    echo "127.0.0.1   feedback.admin.local" >> /etc/hosts
fi

# ---- 7. Build and start Docker containers ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_DIR="$(dirname "$SCRIPT_DIR")"

log "Building and starting CTF containers..."
cd "$LAB_DIR"
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# ---- 8. Wait for log injection ----
log "Waiting for log injection to complete..."
sleep 15

# Verify logs
if [ -f /opt/admin/logs/access.log ] && [ -s /opt/admin/logs/access.log ]; then
    log "access.log populated: $(wc -l < /opt/admin/logs/access.log) entries"
else
    warn "access.log is empty or missing - checking Docker volume..."
    docker exec ctf_log_injector python3 /scripts/inject_logs.py 2>/dev/null || \
        docker-compose run --rm log-injector
fi

# ---- 9. Verify services ----
log "Verifying services..."
sleep 3

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3075/" | grep -q "200"; then
    log "Web app is UP at http://feedback.admin.local:3075"
else
    warn "Web app check failed - check: docker-compose logs webapp"
fi

if nc -z localhost 2275 2>/dev/null; then
    log "SSH is UP on port 2275"
else
    warn "SSH not reachable on port 2275"
fi

# ---- 10. Print summary ----
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  CTF Lab Ready!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Web App:   http://feedback.admin.local:3075"
echo "  SSH:       ssh analyst@<VM_IP> -p 2275"
echo "  Password:  blue_team_rocks"
echo "  Logs:      /opt/admin/logs/"
echo ""
echo "  Red Team start: http://feedback.admin.local:3075"
echo "  Blue Team start: ssh analyst@<VM_IP> -p 2275"
echo "                   then: ls /opt/admin/logs/"
echo ""

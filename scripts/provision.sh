#!/bin/bash
# =============================================================================
# CTF Lab Provisioning Script
# Prepares a Linux VM (Ubuntu 22.04+) for Proxmox deployment
# Run as root on the target VM
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[+]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[-]${NC} $*"; exit 1; }

# ── 1. Check root ─────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Please run as root."
info "Starting CTF Lab provisioning..."

# ── 2. Update & install dependencies ─────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get install -y -qq \
    curl wget git ca-certificates gnupg lsb-release \
    openssh-server python3 python3-pip ufw

# ── 3. Install Docker ─────────────────────────────────────────────────
info "Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
else
    warn "Docker already installed, skipping."
fi

# Install Docker Compose plugin
if ! docker compose version &>/dev/null; then
    apt-get install -y -qq docker-compose-plugin
fi
info "Docker version: $(docker --version)"

# ── 4. Create Blue Team SSH user ──────────────────────────────────────
info "Creating Blue Team SSH user: analyst"
if ! id "analyst" &>/dev/null; then
    useradd -m -s /bin/bash analyst
    echo "analyst:blue_team_rocks" | chpasswd
    usermod -aG docker analyst
    info "User 'analyst' created with password 'blue_team_rocks'"
else
    warn "User 'analyst' already exists. Resetting password..."
    echo "analyst:blue_team_rocks" | chpasswd
fi

# ── 5. Configure SSH on port 2275 ────────────────────────────────────
info "Configuring SSH on port 2275..."
SSHD_CONF="/etc/ssh/sshd_config"

# Remove old Port lines and add new one
sed -i '/^Port /d' "$SSHD_CONF"
echo "Port 2275" >> "$SSHD_CONF"

# Security hardening for SSH
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' "$SSHD_CONF"
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' "$SSHD_CONF"

systemctl restart sshd
info "SSH now listening on port 2275"

# ── 6. Firewall configuration ─────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 2275/tcp comment "Blue Team SSH"
ufw allow 3075/tcp comment "CTF Web App"
ufw allow 80/tcp comment "Nginx"
ufw --force enable
info "Firewall configured."

# ── 7. Create log directory with permissions ──────────────────────────
info "Creating /opt/admin/logs..."
mkdir -p /opt/admin/logs
chown -R analyst:analyst /opt/admin
chmod -R 755 /opt/admin/logs

# ── 8. Add /etc/hosts entry for lab domain ────────────────────────────
info "Adding hosts entry for feedback.admin.local..."
if ! grep -q "feedback.admin.local" /etc/hosts; then
    echo "127.0.0.1   feedback.admin.local" >> /etc/hosts
fi

# ── 9. Copy lab files to /opt/ctf-lab ────────────────────────────────
LAB_DIR="/opt/ctf-lab"
if [[ -d "$LAB_DIR" ]]; then
    warn "$LAB_DIR already exists. Removing and re-deploying..."
    rm -rf "$LAB_DIR"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "Copying lab files to $LAB_DIR..."
cp -r "$SCRIPT_DIR" "$LAB_DIR"
chown -R root:root "$LAB_DIR"

# ── 10. Build & start Docker Compose ─────────────────────────────────
info "Building and starting Docker containers..."
cd "$LAB_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# ── 11. Wait for log injector to complete ────────────────────────────
info "Waiting for log injection to complete..."
sleep 8
docker compose logs log-injector

# ── 12. Verify deployment ─────────────────────────────────────────────
info "Verifying deployment..."
sleep 3

# Check web app
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3075/ 2>/dev/null || echo "000")
if [[ "$HTTP_STATUS" == "200" ]]; then
    info "✅ Web app responding on port 3075 (HTTP $HTTP_STATUS)"
else
    warn "⚠ Web app returned HTTP $HTTP_STATUS (may still be starting)"
fi

# Check SSH
if ss -tlnp | grep -q ":2275"; then
    info "✅ SSH listening on port 2275"
else
    warn "⚠ SSH not detected on port 2275"
fi

# Check logs
if [[ -f "/opt/admin/logs/access.log" ]]; then
    info "✅ access.log present ($(wc -l < /opt/admin/logs/access.log) entries)"
else
    warn "⚠ access.log not found yet"
fi

if [[ -f "/opt/admin/logs/error.log" ]]; then
    info "✅ error.log present ($(wc -l < /opt/admin/logs/error.log) entries)"
else
    warn "⚠ error.log not found yet"
fi

# ── 13. Print summary ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         CTF Lab Deployment Complete!                     ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Web App    : http://<VM-IP>:3075                        ║${NC}"
echo -e "${GREEN}║  Admin URL  : http://feedback.admin.local:3075           ║${NC}"
echo -e "${GREEN}║  SSH        : ssh analyst@<VM-IP> -p 2275                ║${NC}"
echo -e "${GREEN}║  SSH Pass   : blue_team_rocks                            ║${NC}"
echo -e "${GREEN}║  Logs Dir   : /opt/admin/logs                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Provisioning complete. Lab is ready."

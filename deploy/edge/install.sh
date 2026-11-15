#!/bin/sh
# Installs Bulwark Edge as a systemd service on a Linux host (RHEL, Ubuntu, Debian).
# Usage: sudo BULWARK_URL=https://... BULWARK_TOKEN=bwr_... REPOS="/srv/scada /srv/hmi" ./install.sh
set -eu
command -v node >/dev/null || { echo "node 20+ required"; exit 1; }
install -d -m 755 /opt/bulwark /var/lib/bulwark
install -m 755 bulwark-runner.mjs /opt/bulwark/bulwark-runner.mjs
id bulwark >/dev/null 2>&1 || useradd --system --home /var/lib/bulwark --shell /usr/sbin/nologin bulwark
chown bulwark /var/lib/bulwark
cat > /etc/bulwark.env <<ENV
BULWARK_URL=${BULWARK_URL:-}
BULWARK_TOKEN=${BULWARK_TOKEN:-}
ENV
chmod 600 /etc/bulwark.env
cat > /etc/systemd/system/bulwark-runner.service <<UNIT
[Unit]
Description=Bulwark Edge runner
After=network-online.target
[Service]
User=bulwark
EnvironmentFile=/etc/bulwark.env
WorkingDirectory=/var/lib/bulwark
ExecStart=/usr/bin/env node /opt/bulwark/bulwark-runner.mjs watch ${REPOS:-/srv/repos} --out /var/lib/bulwark/results --every 3600
Restart=always
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/bulwark
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now bulwark-runner
echo "bulwark-runner installed; results in /var/lib/bulwark/results"

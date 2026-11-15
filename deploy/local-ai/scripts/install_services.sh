#!/usr/bin/env bash
set -euo pipefail
cd /home/samat_zharassov/cyber-model
systemctl --user link "$PWD/config/systemd/bulwark-router.service" "$PWD/config/systemd/bulwark-gateway.service"
systemctl --user daemon-reload
systemctl --user enable bulwark-router bulwark-gateway
echo 'For automatic startup with WSL: sudo loginctl enable-linger samat_zharassov'

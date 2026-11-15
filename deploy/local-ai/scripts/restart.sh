#!/usr/bin/env bash
set -euo pipefail
systemctl --user reset-failed bulwark-router bulwark-gateway
systemctl --user restart bulwark-router bulwark-gateway

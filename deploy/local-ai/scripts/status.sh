#!/usr/bin/env bash
set -uo pipefail
systemctl --user --no-pager status bulwark-router bulwark-gateway
curl --fail --silent http://127.0.0.1:8000/healthz
printf '\n'
/home/samat_zharassov/cyber-model/scripts/check_gpu.sh

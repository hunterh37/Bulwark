#!/usr/bin/env bash
set -euo pipefail
tail -n 60 -F /home/samat_zharassov/cyber-model/logs/gateway.log /home/samat_zharassov/cyber-model/logs/router.log

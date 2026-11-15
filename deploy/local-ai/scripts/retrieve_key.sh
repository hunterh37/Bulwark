#!/usr/bin/env bash
set -euo pipefail
# Run locally when ready to copy the secret into Render. Never paste it into chat.
sed -n 's/^MODEL_API_KEY=//p' /home/samat_zharassov/cyber-model/config/environment

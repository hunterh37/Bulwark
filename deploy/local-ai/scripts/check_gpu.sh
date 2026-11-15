#!/usr/bin/env bash
set -euo pipefail
/usr/lib/wsl/lib/nvidia-smi --id=0 --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv

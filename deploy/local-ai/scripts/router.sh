#!/usr/bin/env bash
set -euo pipefail
cd /home/samat_zharassov/cyber-model
export LLAMA_CACHE="$PWD/work/llama-cache"
export CUDA_VISIBLE_DEVICES=0
export LD_LIBRARY_PATH="$PWD/runtime/llama:/usr/local/cuda-13.3/lib64:/usr/lib/wsl/lib"
exec "$PWD/runtime/llama/llama-server" \
 --models-dir "$PWD/models" --models-max 1 \
 --host 127.0.0.1 --port 8080 \
 --ctx-size 4096 --parallel 1 --device CUDA0 --gpu-layers all --fit off \
 --batch-size 512 --ubatch-size 128 --flash-attn on \
 --sleep-idle-seconds 300 --api-key-file "$PWD/config/internal-api-key" \
 --no-webui --offline --no-context-shift --log-disable

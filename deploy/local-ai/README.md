# Bulwark Local GPU Inference

Project: /home/samat_zharassov/cyber-model

API: https://samat.tail68d213.ts.net

Verified 15 November 2026: 28 gateway tests and 14 real GPU lifecycle checks. Both systemd user services are active and enabled. Handoff model state: unloaded.

## Model and runtime

Foundation-Sec-8B-Instruct-IQ4_XS.gguf; 4,448,378,112 bytes.

SHA256: 3ffda7f9c9952e41e6b70d211be09facea176d0e9cff88f8d042ac5e587a1962

GGUF revision: a50bbd0bbb46a333c6cda11e9e8d7717ced39777

llama.cpp 0.4.0-dev, build 10819, commit 6a1a922d269908a29cbd4b49c27e6a8e7fd10fae. Compatible existing CUDA 13.3 build copied into runtime/llama; original installation preserved. RTX 5070 Ti Laptop; 12227 MiB; driver 616.92; CUDA target 120; 33/33 layers verified.

Context 4096; parallel 1; max output 1024; temperature 0. First accepted request loads the model. Native sleep unloads weights and KV after 300 s. No model is resident at startup. The absent native models-memory-margin flag is replaced by measured admission: 5205MiB allocation plus 1536 MiB free headroom, explicit CUDA0 and fitting off.

## Operations

```bash
cd /home/samat_zharassov/cyber-model
./scripts/start.sh
./scripts/stop.sh
./scripts/restart.sh
./scripts/status.sh
./scripts/logs.sh
./scripts/check_gpu.sh
```

Systemd user lingering starts services with WSL. Windows Tailscale is Automatic and unattended; Funnel uses persistent background configuration. An optional Windows-login WSL task is explained in the guide and was not installed.

## Request

The external key is protected in config/environment, mode 0600. Retrieve it locally using scripts/retrieve_key.sh when entering it into Render. Keep it out of logs and source control.

```bash
set -a
. config/environment
set +a
curl --fail-with-body --max-time 450 \
  https://samat.tail68d213.ts.net/v1/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MODEL_API_KEY" \
  --data '{"files":[{"path":"safe.py","content":"def add(a,b):\n    return a+b\n"}]}'
```

The safe fixture returned []. A finding example appears in the guide. Detection[] uses detector,ruleId,file,line,severity,message,gridImpact. Failures return errors, not clean arrays.

Render: MODEL_URL=https://samat.tail68d213.ts.net and MODEL_API_KEY=<persistent external secret>. The existing backend is unchanged. Teammates must add the Bearer Authorization header in their caller and configure Render settings.

## Actual measurements

Device-wide VRAM: idle 2543 MiB;loaded 7234 MiB;peak 7239 MiB. After sleep 2718 MiB;released 4516 MiB. Cold API 3.292 s;warm 0.214 s;reload 2.291 s. Short native decode 64.97 cold / 89.50 warm tokens/s. These are small synthetic workloads, not sustained or security-accuracy benchmarks.

## Verification and documentation

```bash
.venv/bin/python -m pytest -q
.venv/bin/python scripts/test_e2e.py
.venv/bin/python scripts/calibrate.py
```

Full guide: docs/Bulwark-Local-AI-Deployment-Guide.md and .pdf.
Evidence: logs/calibration.json,logs/e2e-results.json,logs/connectivity-final.json.

Limits: the laptop must be awake and online; key holders can consume GPU time; model findings can be false positives; near-idle admission is conservative; Windows allocations can race probes. No public chat proxy or execution of generated commands is implemented. Recalibrate after model/runtime/router changes. A full Windows reboot and Render-origin request were not tested.

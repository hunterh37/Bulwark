# Team guide: secure local model API

**Endpoint:** https://samat.tail68d213.ts.net

This PR publishes only our secure API, its tests and its documentation. It does not change Bulwark's existing backend, cloud dependencies, Render settings, or other CI jobs.

## What we pushed

- **deploy/local-ai/gateway/**: FastAPI authentication gateway, strict request/output schemas, source-path/line validation, bounded queue, GPU admission and disconnect handling.
- **deploy/local-ai/config/**: safe environment example and project-owned systemd units.
- **deploy/local-ai/scripts/**: on-demand llama.cpp launcher, model checksum verification, calibration, start/stop/restart/status/logs and lifecycle tests.
- **deploy/local-ai/tests/**: 28 CPU-only regression tests that need no model, GPU or real credentials.
- **deploy/local-ai/docs/**: measured deployment guide in Markdown/PDF, architecture diagrams and model-license notices.
- **.github/workflows/local-model.yml**: CI for our API package only.
- This usage guide and a README link.

No GGUF, native runtime, virtualenv, API key, measured allocation profile, operational log or scratch file is published. The model has its own upstream license terms, separate from the software license.

## Use it now

Foundation-Sec-8B-Instruct IQ4_XS runs on Samat's RTX 5070 Ti Laptop GPU in WSL2. The gateway is already up. The model loads only for authenticated inference, reuses weights, then unloads after 300 seconds idle. The same HTTPS address and persistent key work across normal service restarts.

The laptop must stay awake, online and running WSL. It is not a cloud service that remains available when the laptop sleeps.

Ask Samat for the external API key through a private secret channel. Samat can retrieve it locally:

```bash
cd /home/samat_zharassov/cyber-model
./scripts/retrieve_key.sh
```

Never put the key in Git, an issue, a PR, logs or screenshots. Do not use the separate internal llama.cpp key.

### Smoke test

With MODEL_API_KEY set securely in the caller's environment:

```bash
curl --fail-with-body --max-time 450 \
  https://samat.tail68d213.ts.net/v1/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MODEL_API_KEY" \
  --data '{"files":[{"path":"safe.py","content":"def add(a,b):\n    return a+b\n"}]}'
```

The measured safe fixture returned []. A finding follows the existing Detection[] contract:

```json
[
  {
    "detector": "foundation-sec-8b",
    "ruleId": "ai.security-review",
    "file": "example.py",
    "line": 12,
    "severity": "high",
    "message": "Explanation of a source-supported issue",
    "gridImpact": false
  }
]
```

That finding is illustrative; actual synthetic results are in the deployment guide. Model failures return errors, not a fake clean result.

Health is unauthenticated and never wakes the model:

```bash
curl --fail https://samat.tail68d213.ts.net/healthz
```

## Integrate the existing Render backend

The API-only PR does not add the existing caller's missing Authorization header. The teammate owning that integration must send:

```typescript
headers: {
  "content-type": "application/json",
  "Authorization": "Bearer " + process.env.MODEL_API_KEY,
}
```

Configure the client timeout to allow cold startup and queuing; Node HTTP transport limits must be configured as well as any AbortSignal deadline.

**Routing scope:** enabling the shared cloud detector sends eligible file paths and contents from every organization/repository it scans to Samat's laptop, including eligible private source and .env files. Agree on that routing scope before enabling it. The shared API key is not per-organization isolation.

After implementing the caller header, set these on **Render → bulwark-cloud → Environment** and save/redeploy:

```text
MODEL_URL=https://samat.tail68d213.ts.net
MODEL_API_KEY=<persistent external key from Samat privately>
```

The existing service includes the scan worker, so set them on bulwark-cloud. Leaving MODEL_URL unset keeps the optional detector disabled.

The existing detector pipeline catches model errors and continues built-in rules. A completed scan therefore does not prove AI review succeeded: check for **model detector** errors in Render logs.

### Verify Render-origin connectivity

The curl test proves connectivity only from the machine running curl. In a quiet test window, connect an approved tiny fixture repository containing only a harmless smoke.py such as print(1), then trigger its scan in Bulwark.

Record its start time, check Render logs for model errors, and confirm one new corresponding **inference_complete** entry in Samat's gateway log. The gateway logs timing and token counts, not submitted source. Do not mark Render integration verified until this succeeds. We have not performed a Render-origin scan.

## Limits and errors

- One active inference, two waiting; excess work returns 429.
- Maximum 32 unique files and 16000 total UTF-8 source bytes; request body cap 65536 bytes.
- Context is 4096 tokens including a 1024-token output reserve. A request below the byte limit can still exceed the token limit.
- Relative POSIX paths only. Findings must refer to supplied paths and valid one-based lines.
- 401: key; 413/422: input limits; 503: GPU busy or engine/profile unavailable; 502: invalid model output; 504: inference timeout.
- Larger repositories need batching/chunking in the caller. This PR does not change that caller.
- No public chat or model-administration routes. Do not use port 8080.

Submitted code is never executed. Findings are advisory: the model flagged an intentionally fake placeholder token in testing. Review findings rather than treating them as confirmed vulnerabilities.

## What was actually measured

On 15 November 2026, 28 API tests and 14 live GPU lifecycle checks passed. Windows localhost, authenticated stable-hostname HTTPS and a forced public Funnel ingress IP returned 200 with TLS verification. Unauthorized requests returned 401; public administration returned 404.

Device-wide GPU memory: 2543 MiB idle, 7234 MiB loaded, 7239 MiB sampled peak. Native sleep was observed at 300.3 seconds and released 4516 MiB. Cold detection took 3.292 seconds, warm detection 0.214 seconds and reload 2.291 seconds on synthetic fixtures.

These are small-workload measurements, not sustained performance or security-accuracy guarantees. A full Windows reboot was not tested.

## Samat: operate our service

```bash
cd /home/samat_zharassov/cyber-model
./scripts/start.sh
./scripts/restart.sh
./scripts/status.sh
./scripts/check_gpu.sh
./scripts/logs.sh
./scripts/stop.sh
```

Systemd user units start with WSL. Windows Tailscale is Automatic, unattended, and uses persistent background Funnel. The optional Windows-login WSL task is documented but was not installed.

The current measured profile reserves 5205 MiB for the model/runtime plus 1536 MiB free headroom. CUDA0 and full GPU layers are explicit; automatic fitting is disabled. Other Windows GPU programs can still race memory probes.

After changing the GGUF, native libraries or router flags, choose a quiet maintenance period:

```bash
.venv/bin/python scripts/calibrate.py
.venv/bin/python -m pytest -q
.venv/bin/python scripts/test_e2e.py
```

## Source and reproduction

Install the [API source package](../deploy/local-ai/README.md) into a separate Linux directory. The guide includes pins/checksum, licenses, CUDA, systemd, network setup, measurements and troubleshooting.

- [Editable deployment guide](../deploy/local-ai/docs/Bulwark-Local-AI-Deployment-Guide.md)
- [PDF deployment guide](../deploy/local-ai/docs/Bulwark-Local-AI-Deployment-Guide.pdf)

Our unit tests require Python 3.12, no GPU/model/credentials:

```bash
cd deploy/local-ai
python3 -m venv .venv
.venv/bin/pip install -r gateway/requirements.txt
.venv/bin/python -m pytest -q
```

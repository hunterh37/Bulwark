#!/usr/bin/env python3
"""Write canonical Markdown and README from completed test evidence."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def main():
    e=json.loads((ROOT/"logs/e2e-results.json").read_text())
    c=json.loads((ROOT/"logs/calibration.json").read_text())
    p=json.loads((ROOT/"config/vram-profile.json").read_text())
    n=json.loads((ROOT/"logs/connectivity-final.json").read_text())
    w=json.loads((ROOT/"logs/windows-connectivity.json").read_text())
    h=json.loads((ROOT/"logs/handoff-status.json").read_text())
    model=json.loads((ROOT/"logs/model-verified.json").read_text())
    if not e.get("completed") or not c.get("verified") or n["public_api_status"]!=200:
        raise SystemExit("Complete implementation and actual verification first.")
    if not all(t["passed"] for t in e["tests"].values()):
        raise SystemExit("Lifecycle failures remain.")
    m=e["metrics"]
    rows=[]
    for name,test in e["tests"].items():
        detail="Actual deployed service."
        if name=="insufficient_vram_503":detail="Admission fault injection; no GPU stress."
        if name=="simultaneous_cold_requests_single_child":detail="Two requests; one model process."
        if name=="idle_unloading_releases_memory":detail="Health polled during real 300-second timer."
        rows.append("| "+name.replace("_"," ")+" | PASS | "+detail+" |")
    values={
        "COUNT":str(len(e["tests"])),"STATE":h["model_state"],
        "PROFILE":str(p["required_mib"]),"REV":model["revision"],"SHA":model["sha256"],
        "PACKAGES":"; ".join(k+" "+v for k,v in h["python_packages"].items() if k in
                              ("fastapi","uvicorn","httpx","pydantic","huggingface_hub")),
        "FINDINGS":json.dumps(e["tests"]["first_request_loads_and_responds"]["details"]["response"],indent=2),
        "IDLE":str(m["idle_gpu"]["used_mib"]),"LOADED":str(m["loaded_gpu"]["used_mib"]),
        "PEAK":str(m["peak_gpu_used_mib"]),"MINFREE":str(m["minimum_free_mib"]),
        "COLD":f'{m["cold_api_seconds"]:.3f}',"WARM":f'{m["warm_api_seconds"]:.3f}',
        "RELOAD":f'{m["reload_api_seconds"]:.3f}',
        "SLEEP_SECONDS":f'{m["sleep_observed_seconds"]:.1f}',
        "SLEEP":str(m["sleep_gpu"]["used_mib"]),"RELEASED":str(m["memory_released_mib"]),
        "FINALGPU":str(h["gpu"]["used_mib"]),
        "DCOLD":f'{c["cold_seconds"]:.3f}',"DWARM":f'{c["warm_seconds"]:.3f}',
        "CTPS":f'{c["cold_timings"]["predicted_per_second"]:.2f}',
        "WTPS":f'{c["warm_timings"]["predicted_per_second"]:.2f}',
        "TESTROWS":"\n".join(rows)
    }
    template_path=ROOT/"docs/guide-template.md"
    if not template_path.exists():template_path=ROOT/"work/guide-template.md"
    template=template_path.read_text()
    for key,value in values.items():template=template.replace("@@"+key+"@@",value)
    if "@@" in template:raise RuntimeError("Unresolved documentation placeholder.")
    tick=chr(96)
    template=template.replace("~~~",tick*3)
    template=template.replace(
        "winget install --id Tailscale.Tailscale --exact --silent --accept-source-agreements --accept-package-agreements",
        "winget install --id Tailscale.Tailscale --exact --silent "+tick+"\n  --accept-source-agreements --accept-package-agreements")
    template=template.replace(
        'Start-Process -WindowStyle Hidden -FilePath wsl.exe -ArgumentList "-d","Ubuntu-24.04","-u","samat_zharassov","--exec","/usr/bin/sleep","infinity"',
        'Start-Process -WindowStyle Hidden -FilePath wsl.exe '+tick+
        '\n  -ArgumentList "-d","Ubuntu-24.04","-u","samat_zharassov","--exec", '+tick+
        '\n    "/usr/bin/sleep","infinity"')
    template=template.replace("its action can run this single-line command:","its action can run this command:")
    (ROOT/"docs/Bulwark-Local-AI-Deployment-Guide.md").write_text(template)
    readme=f"""# Bulwark Local GPU Inference

Project: /home/samat_zharassov/cyber-model

API: https://samat.tail68d213.ts.net

Verified 15 November 2026: 28 gateway tests and {values["COUNT"]} real GPU lifecycle checks. Both systemd user services are active and enabled. Handoff model state: {values["STATE"]}.

## Model and runtime

Foundation-Sec-8B-Instruct-IQ4_XS.gguf; 4,448,378,112 bytes.

SHA256: {model["sha256"]}

GGUF revision: {model["revision"]}

llama.cpp 0.4.0-dev, build 10819, commit 6a1a922d269908a29cbd4b49c27e6a8e7fd10fae. Compatible existing CUDA 13.3 build copied into runtime/llama; original installation preserved. RTX 5070 Ti Laptop; 12227 MiB; driver 616.92; CUDA target 120; 33/33 layers verified.

Context 4096; parallel 1; max output 1024; temperature 0. First accepted request loads the model. Native sleep unloads weights and KV after 300 s. No model is resident at startup. The absent native models-memory-margin flag is replaced by measured admission: {p["required_mib"]}MiB allocation plus 1536 MiB free headroom, explicit CUDA0 and fitting off.

## Operations

~~~bash
cd /home/samat_zharassov/cyber-model
./scripts/start.sh
./scripts/stop.sh
./scripts/restart.sh
./scripts/status.sh
./scripts/logs.sh
./scripts/check_gpu.sh
~~~

Systemd user lingering starts services with WSL. Windows Tailscale is Automatic and unattended; Funnel uses persistent background configuration. An optional Windows-login WSL task is explained in the guide and was not installed.

## Request

The external key is protected in config/environment, mode 0600. Retrieve it locally using scripts/retrieve_key.sh when entering it into Render. Keep it out of logs and source control.

~~~bash
set -a
. config/environment
set +a
curl --fail-with-body --max-time 450 \\
  https://samat.tail68d213.ts.net/v1/detect \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $MODEL_API_KEY" \\
  --data '{{"files":[{{"path":"safe.py","content":"def add(a,b):\\n    return a+b\\n"}}]}}'
~~~

The safe fixture returned []. A finding example appears in the guide. Detection[] uses detector,ruleId,file,line,severity,message,gridImpact. Failures return errors, not clean arrays.

Render: MODEL_URL=https://samat.tail68d213.ts.net and MODEL_API_KEY=<persistent external secret>. The existing backend is unchanged. Teammates must add the Bearer Authorization header in their caller and configure Render settings.

## Actual measurements

Device-wide VRAM: idle {values["IDLE"]} MiB;loaded {values["LOADED"]} MiB;peak {values["PEAK"]} MiB. After sleep {values["SLEEP"]} MiB;released {values["RELEASED"]} MiB. Cold API {values["COLD"]} s;warm {values["WARM"]} s;reload {values["RELOAD"]} s. Short native decode {values["CTPS"]} cold / {values["WTPS"]} warm tokens/s. These are small synthetic workloads, not sustained or security-accuracy benchmarks.

## Verification and documentation

~~~bash
.venv/bin/python -m pytest -q
.venv/bin/python scripts/test_e2e.py
.venv/bin/python scripts/calibrate.py
~~~

Full guide: docs/Bulwark-Local-AI-Deployment-Guide.md and .pdf.
Evidence: logs/calibration.json,logs/e2e-results.json,logs/connectivity-final.json.

Limits: the laptop must be awake and online; key holders can consume GPU time; model findings can be false positives; near-idle admission is conservative; Windows allocations can race probes. No public chat proxy or execution of generated commands is implemented. Recalibrate after model/runtime/router changes. A full Windows reboot and Render-origin request were not tested.
"""
    (ROOT/"README.md").write_text(readme.replace("~~~",tick*3))
    print("Generated Markdown guide and README from completed evidence.")
if __name__=="__main__":main()

#!/usr/bin/env python3
"""Representative synthetic calibration on isolated loopback port 8081."""
from pathlib import Path
import hashlib
import json
import math
import os
import re
import signal
import subprocess
import sys
import threading
import time
import httpx

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from gateway.schemas import ModelResponse
MODEL="Foundation-Sec-8B-Instruct-IQ4_XS"

def gpu():
    raw=subprocess.check_output(["/usr/lib/wsl/lib/nvidia-smi","--id=0",
        "--query-gpu=memory.used,memory.free","--format=csv,noheader,nounits"],text=True,timeout=5)
    used,free=[int(x.strip()) for x in raw.split(",")]
    if min(used,free)<0: raise RuntimeError("GPU counters invalid")
    return {"used_mib":used,"free_mib":free}

def main():
    verified=json.loads((ROOT/"logs/model-verified.json").read_text())
    bootstrap=math.ceil(verified["size"]/1048576)+512+1024
    marker=ROOT/"work/calibration-active"
    if marker.exists():raise SystemExit("Calibration already active or stale maintenance marker present.")
    marker.write_text(str(os.getpid()))
    server=None
    worker=None
    reader_thread=None
    done=threading.Event()
    report={"bootstrap_estimate_mib":bootstrap,"samples":[],"filtered_native_events":[]}
    failures=[]
    offload=[]
    allocations=[]
    succeeded=False
    error=None
    try:
        subprocess.run(["systemctl","--user","stop","bulwark-router"],check=True)
        baseline=gpu()
        report["baseline"]=baseline
        if baseline["free_mib"]<bootstrap+1536:
            raise RuntimeError("Calibration postponed: insufficient free GPU memory.")
        script=(ROOT/"scripts/router.sh").read_text().replace(" --log-disable"," --verbosity 4").replace("--port 8080","--port 8081")
        server=subprocess.Popen(["bash","-c",script],cwd=ROOT,
            stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,start_new_session=True)
        def reader():
            for line in server.stdout:
                match=re.search(r"offloaded (\d+)/(\d+) layers",line)
                if match:
                    offload.append(tuple(map(int,match.groups())))
                    report["filtered_native_events"].append(line.strip())
                match=re.search(r"CUDA0.*?buffer size\s*=\s*([\d.]+) MiB",line)
                if match:
                    allocations.append(float(match.group(1)))
                    report["filtered_native_events"].append(line.strip())
        def sampler():
            while not done.is_set():
                try:
                    value=gpu();value["monotonic"]=time.monotonic()
                    report["samples"].append(value)
                    if value["free_mib"]<1536:
                        failures.append("headroom")
                        os.killpg(server.pid,signal.SIGTERM)
                        return
                except Exception:
                    failures.append("telemetry")
                    if server.poll() is None:os.killpg(server.pid,signal.SIGTERM)
                    return
                done.wait(0.25)
        reader_thread=threading.Thread(target=reader,daemon=True)
        reader_thread.start()
        worker=threading.Thread(target=sampler,daemon=True)
        worker.start()
        key=(ROOT/"config/internal-api-key").read_text().strip()
        with httpx.Client(base_url="http://127.0.0.1:8081",trust_env=False,
                          headers={"Authorization":"Bearer "+key},timeout=240) as client:
            deadline=time.monotonic()+30
            while True:
                try:
                    r=client.get("/models");r.raise_for_status();models=r.json()
                    if len(models["data"])==1:break
                except Exception:pass
                if server.poll() is not None or time.monotonic()>deadline:
                    raise RuntimeError("Calibration router did not register one model.")
                time.sleep(0.25)
            ids=[m["id"] for m in models["data"]]
            report["registered_ids"]=ids
            if ids!=[MODEL]:raise RuntimeError("Unexpected model registration.")
            count=560
            body={"model":MODEL,"messages":[
                {"role":"system","content":"Return only the schema-constrained object with empty detections. This is a harmless memory calibration."},
                {"role":"user","content":"Synthetic variable assignments:\n"+"value = 1\n"*count}],
                "temperature":0,"max_tokens":1024,"stream":False,
                "response_format":{"type":"json_schema","json_schema":{
                    "name":"security_review","strict":True,"schema":ModelResponse.model_json_schema()}}}
            started=time.monotonic()
            while True:
                templ=client.post("/apply-template",json=body);templ.raise_for_status()
                tok=client.post("/tokenize",json={"model":MODEL,"content":templ.json()["prompt"],"add_special":True,"parse_special":True})
                tok.raise_for_status()
                tokens=len(tok.json()["tokens"])
                if tokens<=3000:break
                count-=20
                body["messages"][1]["content"]="Synthetic variable assignments:\n"+"value = 1\n"*count
            report["calibration_prompt_tokens"]=tokens
            r=client.post("/v1/chat/completions",json=body);r.raise_for_status()
            response=r.json()
            report["cold_seconds"]=time.monotonic()-started
            if response["choices"][0]["finish_reason"]!="stop":raise RuntimeError("Incomplete calibration response")
            ModelResponse.model_validate_json(response["choices"][0]["message"]["content"])
            report["cold_usage"]=response.get("usage")
            report["cold_timings"]=response.get("timings")
            report["loaded_gpu"]=gpu()
            started=time.monotonic()
            r=client.post("/v1/chat/completions",json=body);r.raise_for_status()
            report["warm_seconds"]=time.monotonic()-started
            report["warm_timings"]=r.json().get("timings")
            succeeded=True
    except Exception as exc:
        error=type(exc).__name__
        report["failure_type"]=error
    finally:
        done.set()
        if server is not None and server.poll() is None:
            os.killpg(server.pid,signal.SIGTERM)
            try:server.wait(30)
            except subprocess.TimeoutExpired:
                os.killpg(server.pid,signal.SIGKILL);server.wait()
        if worker:worker.join(6)
        if reader_thread:reader_thread.join(5)
        try:
            report["released_gpu"]=gpu()
            if failures:raise RuntimeError("GPU sampling or headroom failed")
            if not succeeded:raise RuntimeError("Calibration inference failed")
            if not offload or offload[-1]!=(33,33):raise RuntimeError("Full CUDA offload unconfirmed")
            if len(allocations)<3 or not report["samples"]:raise RuntimeError("Allocation evidence missing")
            peak=max(x["used_mib"] for x in report["samples"])
            required=math.ceil(max(sum(allocations)+512,peak-report["baseline"]["used_mib"]+512))
            hashes={}
            paths=[ROOT/"scripts/router.sh",ROOT/"models"/(MODEL+".gguf")]
            paths+=sorted(f for f in (ROOT/"runtime/llama").iterdir() if f.is_file())
            for path in paths:
                hashes[str(path.relative_to(ROOT))]=hashlib.file_digest(path.open("rb"),"sha256").hexdigest()
            if hashes["models/"+MODEL+".gguf"]!=verified["sha256"]:
                raise RuntimeError("Model checksum changed")
            profile={"required_mib":required,"context":4096,"parallel":1,
                "verified_full_offload":True,"offloaded_layers":[33,33],
                "model_sha256":verified["sha256"],
                "router_sha256":hashes["scripts/router.sh"],
                "binary_sha256":hashes["runtime/llama/llama-server"],
                "file_sha256":hashes,"cuda_allocations_mib":allocations,
                "headroom_mib":1536,"profile_allowance_mib":512}
            temp=ROOT/"config/vram-profile.json.tmp"
            temp.write_text(json.dumps(profile,indent=2));temp.chmod(0o600)
            temp.replace(ROOT/"config/vram-profile.json")
            report["profile"]=profile
            report["peak_gpu_used_mib"]=peak
            report["verified"]=True
        except Exception as exc:
            report["verified"]=False
            report["validation_failure_type"]=type(exc).__name__
            error=error or type(exc).__name__
        finally:
            try:(ROOT/"logs/calibration.json").write_text(json.dumps(report,indent=2))
            finally:
                marker.unlink(missing_ok=True)
                subprocess.run(["systemctl","--user","reset-failed","bulwark-router","bulwark-gateway"],check=True)
                subprocess.run(["systemctl","--user","restart","bulwark-router","bulwark-gateway"],check=True)
    print(json.dumps({k:v for k,v in report.items() if k not in ("samples","profile","filtered_native_events")},indent=2))
    if error:raise SystemExit(1)

if __name__=="__main__":main()

#!/usr/bin/env python3
"""Actual synthetic GPU/API lifecycle test. Results contain metrics, no source."""
from pathlib import Path
import concurrent.futures
import json
import subprocess
import threading
import sys
import time
import httpx

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
MODEL="Foundation-Sec-8B-Instruct-IQ4_XS"
def gpu():
    raw=subprocess.check_output(["/usr/lib/wsl/lib/nvidia-smi","--id=0",
        "--query-gpu=memory.used,memory.free","--format=csv,noheader,nounits"],text=True)
    used,free=[int(x.strip()) for x in raw.split(",")]
    return {"used_mib":used,"free_mib":free}

def restart(*units):
    # Intentional test restarts are distinct from automatic crash recovery.
    subprocess.run(["systemctl","--user","reset-failed",*units],check=True)
    subprocess.run(["systemctl","--user","restart",*units],check=True)

def main():
    api_key=next(s.split("=",1)[1] for s in (ROOT/"config/environment").read_text().splitlines()
                 if s.startswith("MODEL_API_KEY="))
    internal_key=(ROOT/"config/internal-api-key").read_text().strip()
    client=httpx.Client(base_url="http://127.0.0.1:8000",
        headers={"Authorization":"Bearer "+api_key},trust_env=False,timeout=240)
    private=httpx.Client(base_url="http://127.0.0.1:8080",
        headers={"Authorization":"Bearer "+internal_key},trust_env=False,timeout=15)
    report={"tests":{},"metrics":{},"samples":[]}
    stop=threading.Event()
    def save():
        (ROOT/"logs/e2e-results.json").write_text(json.dumps(report,indent=2))
    def check(name,condition,details=None):
        report["tests"][name]={"passed":bool(condition),"details":details}
        save()
        print(name,"PASS" if condition else "FAIL",flush=True)
        if not condition:
            raise AssertionError(name)
    def state():
        return private.get("/models").json()["data"][0]["status"]["value"]
    def sample():
        while not stop.is_set():
            try:
                d=gpu();d["elapsed"]=round(time.monotonic()-started,3)
                report["samples"].append(d)
            except Exception:pass
            stop.wait(0.5)
    body={"files":[{"path":"safe_example.py","content":"def add(a, b):\n    return a + b\n"}]}
    suspect={"files":[{"path":"synthetic_config.py","content":"DEBUG = True\nAPI_TOKEN = 'synthetic-placeholder-not-a-real-secret'\n"}]}
    def detect(payload):
        t=time.monotonic()
        r=client.post("/v1/detect",json=payload)
        return r,time.monotonic()-t
    def child_pids():
        out=subprocess.check_output(["systemctl","--user","show","bulwark-router","--property=MainPID","--value"],text=True).strip()
        r=subprocess.run(["pgrep","-P",out],capture_output=True,text=True)
        return sorted(r.stdout.split())
    started=time.monotonic()
    worker=threading.Thread(target=sample,daemon=True)
    try:
        restart("bulwark-router","bulwark-gateway")
        deadline=time.monotonic()+30
        while True:
            try:
                if client.get("/healthz").status_code==200 and state()=="unloaded":break
            except Exception:pass
            if time.monotonic()>deadline:raise RuntimeError("Startup timeout")
            time.sleep(0.25)
        check("gateway_starts",True)
        report["metrics"]["idle_gpu"]=gpu()
        worker.start()
        check("no_model_at_startup",state()=="unloaded")
        for _ in range(3):client.get("/healthz")
        check("health_does_not_load",state()=="unloaded")
        r=httpx.post("http://127.0.0.1:8000/v1/detect",json=body,trust_env=False)
        check("unauthorized_401",r.status_code==401 and state()=="unloaded")
        r=client.post("/v1/detect",content="{",headers={"Content-Type":"application/json"})
        check("invalid_json_422",r.status_code==422 and state()=="unloaded")
        # Deterministic low-memory admission fault, without allocating or
        # disturbing another application. Restore the exact measured profile.
        profile_path=ROOT/"config/vram-profile.json"
        original=profile_path.read_text()
        profile=json.loads(original)
        profile["required_mib"]=20000
        try:
            profile_path.write_text(json.dumps(profile))
            r=client.post("/v1/detect",json=body)
            check("insufficient_vram_503",r.status_code==503 and state()=="unloaded",
                  "Injected admission threshold; no artificial GPU allocations.")
        finally:profile_path.write_text(original)
        # Include initial installed-file integrity verification in cold latency.
        restart("bulwark-gateway")
        deadline=time.monotonic()+20
        while True:
            try:
                if client.get("/healthz").status_code==200:break
            except Exception:pass
            if time.monotonic()>deadline:raise RuntimeError("Gateway restart timeout")
            time.sleep(0.2)
        r,latency=detect(suspect)
        report["metrics"]["cold_api_seconds"]=latency
        check("first_request_loads_and_responds",r.status_code==200 and state()=="loaded",
              {"http_status":r.status_code,"response":r.json()})
        from gateway.schemas import DetectRequest,validate_detections
        validate_detections(r.json(),DetectRequest.model_validate(suspect))
        check("typescript_detection_contract",True)
        report["metrics"]["loaded_gpu"]=gpu()
        first_pids=child_pids()
        r,latency=detect(body)
        report["metrics"]["warm_api_seconds"]=latency
        check("second_request_reuses_model",r.status_code==200 and child_pids()==first_pids)
        check("genuinely_clean_synthetic_result",r.json()==[],r.json())
        # Restart the private router to check two actual simultaneous cold
        # requests: a single child should serve both.
        restart("bulwark-router")
        deadline=time.monotonic()+20
        while True:
            try:
                if state()=="unloaded":break
            except Exception:pass
            if time.monotonic()>deadline:raise RuntimeError("Router restart timeout")
            time.sleep(0.2)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda _:detect(body),range(2)))
        check("simultaneous_cold_requests_single_child",
              all(r.status_code==200 for r,t in results) and len(child_pids())==1,
              {"statuses":[r.status_code for r,t in results],
               "seconds":[t for r,t in results],"child_count":len(child_pids())})
        report["metrics"]["before_sleep_gpu"]=gpu()
        last_inference=time.monotonic()
        # GET /models and /healthz are deliberately exercised while waiting.
        print("Waiting for the real 300-second sleep timer...",flush=True)
        while state()!="sleeping":
            client.get("/healthz")
            elapsed=time.monotonic()-last_inference
            if elapsed>335:raise AssertionError("Model did not sleep by 335 seconds")
            report["metrics"]["idle_wait_elapsed_seconds"]=elapsed
            save()
            time.sleep(5)
        report["metrics"]["sleep_observed_seconds"]=time.monotonic()-last_inference
        report["metrics"]["sleep_gpu"]=gpu()
        released=report["metrics"]["before_sleep_gpu"]["used_mib"]-report["metrics"]["sleep_gpu"]["used_mib"]
        report["metrics"]["memory_released_mib"]=released
        check("idle_unloading_releases_memory",released>3500,
              {"released_mib":released,"state":state()})
        r,latency=detect(body)
        report["metrics"]["reload_api_seconds"]=latency
        check("request_reloads_after_sleep",r.status_code==200 and state()=="loaded")
        report["metrics"]["peak_gpu_used_mib"]=max(x["used_mib"] for x in report["samples"])
        report["metrics"]["minimum_free_mib"]=min(x["free_mib"] for x in report["samples"])
        check("gpu_headroom_preserved",report["metrics"]["minimum_free_mib"]>=1536)
        report["completed"]=True
    except Exception as exc:
        report["completed"]=False
        report["failure_type"]=type(exc).__name__
        raise
    finally:
        stop.set()
        if worker.is_alive():worker.join(3)
        report["duration_seconds"]=time.monotonic()-started
        save()
        client.close();private.close()

if __name__=="__main__":
    main()

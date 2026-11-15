import asyncio
import json
import pytest
import httpx
from fastapi.testclient import TestClient

def modules():
    from gateway.main import create_app
    from gateway.schemas import validate_detections, DetectRequest
    return create_app, validate_detections, DetectRequest

class Engine:
    def __init__(self, result=None, error=False, delay=0):
        self.result = [] if result is None else result
        self.error, self.delay = error, delay
        self.calls = self.active = self.peak = 0
    async def detect(self, data):
        self.calls += 1
        self.active += 1
        self.peak = max(self.peak, self.active)
        try:
            await asyncio.sleep(self.delay)
            if self.error:
                from gateway.runtime import InferenceError
                raise InferenceError(502, "Inference failed.")
            return self.result
        finally:
            self.active -= 1

def app(engine=None):
    return modules()[0](api_key="test-only-key", engine=engine or Engine(), queue_limit=1, body_limit=1024)

def test_health_and_auth_never_invoke_inference():
    e = Engine()
    with TestClient(app(e)) as c:
        assert c.get("/healthz").json() == {"status":"ok"}
        assert c.post("/v1/detect",json={"files":[]}).status_code == 401
        assert c.post("/v1/detect",headers={"Authorization":"Bearer wrong"},json={"files":[]}).status_code == 401
    assert e.calls == 0

H={"Authorization":"Bearer test-only-key"}
BODY={"files":[{"path":"example.py","content":"print('hello')\n"}]}

def test_clean_results_and_contract():
    with TestClient(app()) as c:
        assert c.post("/v1/detect",headers=H,json=BODY).json() == []
    finding={"detector":"foundation-sec-8b","ruleId":"ai.security-review","file":"example.py","line":1,"severity":"high","message":"Synthetic issue","gridImpact":False}
    with TestClient(app(Engine([finding]))) as c:
        r=c.post("/v1/detect",headers=H,json=BODY)
        assert r.status_code==200 and r.json()==[finding]

@pytest.mark.parametrize("patch",[
    {"file":"other.py"},{"line":0},{"line":200},{"line":True},
    {"severity":"urgent"},{"gridImpact":"false"},{"detector":"other"},
    {"extra":"field"}])
def test_invalid_model_findings_are_errors(patch):
    f={"detector":"foundation-sec-8b","ruleId":"ai.security-review","file":"example.py","line":1,"severity":"high","message":"Issue","gridImpact":False}
    f.update(patch)
    with TestClient(app(Engine([f]))) as c:
        assert c.post("/v1/detect",headers=H,json=BODY).status_code == 502

def test_upstream_failure_is_not_clean_result():
    with TestClient(app(Engine(error=True))) as c:
        r=c.post("/v1/detect",headers=H,json=BODY)
        assert r.status_code==502 and r.json() != []

@pytest.mark.parametrize("body",[
    {"files":[{"path":"../secret","content":"x"}]},
    {"files":[{"path":"/etc/passwd","content":"x"}]},
    {"files":[{"path":"C:\\secret","content":"x"}]},
    {"files":[{"path":"x.py","content":"x"},{"path":"x.py","content":"x"}]},
    {"files":[]}, {"files":[{"path":"x","content":1}]}
])
def test_bad_inputs_are_rejected_without_echo(body):
    e=Engine()
    with TestClient(app(e)) as c:
        r=c.post("/v1/detect",headers=H,json=body)
        assert r.status_code==422
        assert "secret" not in r.text
    assert e.calls==0

def test_body_limit_and_malformed_json():
    with TestClient(app()) as c:
        assert c.post("/v1/detect",headers=H,content="{").status_code==422
        assert c.post("/v1/detect",headers=H,content="x"*1025).status_code==413
        assert c.post("/models/load",headers=H,json={}).status_code==404

@pytest.mark.asyncio
async def test_bounded_serial_requests():
    e=Engine(delay=0.15)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app(e)),base_url="http://test") as c:
        responses=await asyncio.gather(*[c.post("/v1/detect",headers=H,json=BODY) for _ in range(3)])
    assert sorted(r.status_code for r in responses)==[200,200,429]
    assert e.peak==1

def test_vram_admission_fails_closed():
    from gateway.runtime import admit_vram, InferenceError
    with pytest.raises(InferenceError) as e:
        admit_vram(free_mib=7000, required_mib=6000, loaded=False, margin_mib=1536)
    assert e.value.status==503
    admit_vram(free_mib=8000,required_mib=6000,loaded=False,margin_mib=1536)
    with pytest.raises(InferenceError):
        admit_vram(free_mib=1000,required_mib=6000,loaded=True,margin_mib=1536)

@pytest.mark.asyncio
async def test_client_disconnect_stops_inflight_and_releases_slot():
    e=Engine(delay=2)
    service=app(e)
    disconnected=asyncio.Event()
    delivered=False
    async def receive():
        nonlocal delivered
        if not delivered:
            delivered=True
            return {"type":"http.request","body":json.dumps(BODY).encode(),"more_body":False}
        await disconnected.wait()
        return {"type":"http.disconnect"}
    messages=[]
    async def send(message):
        messages.append(message)
    scope={"type":"http","asgi":{"version":"3.0"},"http_version":"1.1",
           "method":"POST","scheme":"http","path":"/v1/detect","raw_path":b"/v1/detect",
           "query_string":b"","root_path":"","headers":[(b"authorization",b"Bearer test-only-key"),
           (b"content-type",b"application/json")],"client":("test",123),"server":("test",80)}
    task=asyncio.create_task(service(scope,receive,send))
    await asyncio.sleep(0.05)
    disconnected.set()
    try:
        await asyncio.wait_for(task,timeout=0.6)
    finally:
        if not task.done():
            task.cancel()
    assert e.active==0

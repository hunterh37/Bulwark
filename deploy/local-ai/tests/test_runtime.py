import json
import httpx
import pytest
from gateway.runtime import RouterEngine, InferenceError
from gateway.schemas import DetectRequest

BODY=DetectRequest.model_validate({"files":[{"path":"test.py","content":"print('hello')"}]})

@pytest.mark.asyncio
@pytest.mark.parametrize("content,finish", [("not-json","stop"), ('{"detections":[]}',"length")])
async def test_router_errors_never_become_clean_results(monkeypatch, content, finish):
    import gateway.runtime as mod
    async def gpu():
        return {"total_mib":12227,"used_mib":2000,"free_mib":10000,"utilization":0}
    monkeypatch.setattr(mod,"gpu_snapshot",gpu)
    engine=RouterEngine()
    monkeypatch.setattr(engine,"profile",lambda:5500)
    await engine.client.aclose()
    def handle(req):
        if req.url.path=="/models":
            return httpx.Response(200,json={"data":[{"id":mod.MODEL,"status":{"value":"unloaded"}}]})
        if req.url.path=="/apply-template":
            return httpx.Response(200,json={"prompt":"example"})
        if req.url.path=="/tokenize":
            return httpx.Response(200,json={"tokens":[1,2,3]})
        return httpx.Response(200,json={"choices":[{"finish_reason":finish,"message":{"content":content}}]})
    engine.client=httpx.AsyncClient(transport=httpx.MockTransport(handle),base_url="http://test")
    with pytest.raises(InferenceError) as err:
        await engine.detect(BODY)
    assert err.value.status==502
    await engine.close()

@pytest.mark.asyncio
async def test_router_blocks_cold_load_when_gpu_busy(monkeypatch):
    import gateway.runtime as mod
    engine=RouterEngine()
    monkeypatch.setattr(engine,"profile",lambda:6000)
    async def gpu():
        return {"total_mib":12227,"used_mib":10000,"free_mib":2000,"utilization":70}
    monkeypatch.setattr(mod,"gpu_snapshot",gpu)
    await engine.client.aclose()
    paths=[]
    def handle(req):
        paths.append(req.url.path)
        return httpx.Response(200,json={"data":[{"id":mod.MODEL,"status":{"value":"sleeping"}}]})
    engine.client=httpx.AsyncClient(transport=httpx.MockTransport(handle),base_url="http://test")
    with pytest.raises(InferenceError) as err:
        await engine.detect(BODY)
    assert err.value.status==503
    assert paths==["/models"]
    await engine.close()

@pytest.mark.asyncio
async def test_token_limit_prevents_context_truncation(monkeypatch):
    import gateway.runtime as mod
    engine=RouterEngine()
    monkeypatch.setattr(engine,"profile",lambda:5500)
    async def gpu():
        return {"total_mib":12227,"used_mib":2000,"free_mib":10000,"utilization":0}
    monkeypatch.setattr(mod,"gpu_snapshot",gpu)
    await engine.client.aclose()
    paths=[]
    def handle(req):
        paths.append(req.url.path)
        if req.url.path=="/models":
            return httpx.Response(200,json={"data":[{"id":mod.MODEL,"status":{"value":"loaded"}}]})
        if req.url.path=="/apply-template":
            return httpx.Response(200,json={"prompt":"example"})
        return httpx.Response(200,json={"tokens":[1]*3100})
    engine.client=httpx.AsyncClient(transport=httpx.MockTransport(handle),base_url="http://test")
    with pytest.raises(InferenceError) as err:
        await engine.detect(BODY)
    assert err.value.status==413
    assert "/v1/chat/completions" not in paths
    await engine.close()

@pytest.mark.asyncio
async def test_profile_cannot_be_reused_after_router_changes(monkeypatch,tmp_path):
    import gateway.runtime as mod
    engine=RouterEngine()
    for name in ("config","logs","scripts","runtime/llama"):
        (tmp_path/name).mkdir(parents=True,exist_ok=True)
    (tmp_path/"logs/model-verified.json").write_text('{"sha256":"modelhash"}')
    (tmp_path/"scripts/router.sh").write_text("changed configuration")
    (tmp_path/"runtime/llama/llama-server").write_text("changed binary")
    (tmp_path/"config/vram-profile.json").write_text(json.dumps({
        "required_mib":5500,"verified_full_offload":True,"context":4096,"parallel":1,
        "model_sha256":"modelhash","router_sha256":"old","binary_sha256":"old"}))
    monkeypatch.setattr(mod,"ROOT",tmp_path)
    with pytest.raises(InferenceError) as err:
        engine.profile()
    assert err.value.status==503
    await engine.close()

@pytest.mark.asyncio
async def test_near_idle_boundary_requires_cold_vram_reserve(monkeypatch):
    import gateway.runtime as mod
    import time
    engine=RouterEngine()
    engine.last_dispatch=time.monotonic()-250
    monkeypatch.setattr(engine,"profile",lambda:6000)
    async def gpu():
        return {"total_mib":12227,"used_mib":10000,"free_mib":2000,"utilization":0}
    monkeypatch.setattr(mod,"gpu_snapshot",gpu)
    await engine.client.aclose()
    def handle(req):
        if req.url.path=="/models":
            return httpx.Response(200,json={"data":[{"id":mod.MODEL,"status":{"value":"loaded"}}]})
        if req.url.path=="/apply-template":
            return httpx.Response(200,json={"prompt":"example"})
        if req.url.path=="/tokenize":
            return httpx.Response(200,json={"tokens":[1]})
        return httpx.Response(200,json={"choices":[{"finish_reason":"stop","message":{"content":'{"detections":[]}'}}]})
    engine.client=httpx.AsyncClient(transport=httpx.MockTransport(handle),base_url="http://test")
    with pytest.raises(InferenceError) as err:
        await engine.detect(BODY)
    assert err.value.status==503
    await engine.close()

@pytest.mark.asyncio
async def test_lost_headroom_unloads_own_model(monkeypatch):
    import gateway.runtime as mod
    import time
    engine=RouterEngine()
    engine.last_dispatch=time.monotonic()
    monkeypatch.setattr(engine,"profile",lambda:6000)
    calls=0
    async def gpu():
        nonlocal calls
        calls+=1
        return {"total_mib":12227,"used_mib":2000,"free_mib":10000 if calls==1 else 1000,"utilization":0}
    monkeypatch.setattr(mod,"gpu_snapshot",gpu)
    await engine.client.aclose()
    paths=[]
    def handle(req):
        paths.append(req.url.path)
        if req.url.path=="/models":
            return httpx.Response(200,json={"data":[{"id":mod.MODEL,"status":{"value":"unloaded" if "/models/unload" in paths else "loaded"}}]})
        if req.url.path=="/apply-template":
            return httpx.Response(200,json={"prompt":"example"})
        if req.url.path=="/tokenize":
            return httpx.Response(200,json={"tokens":[1]})
        return httpx.Response(200,json={})
    engine.client=httpx.AsyncClient(transport=httpx.MockTransport(handle),base_url="http://test")
    with pytest.raises(InferenceError) as err:
        await engine.detect(BODY)
    assert err.value.status==503
    assert "/models/unload" in paths
    await engine.close()

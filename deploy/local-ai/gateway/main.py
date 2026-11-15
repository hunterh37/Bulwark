"""Loopback-only authenticated API. One worker owns a bounded serialized queue."""
import asyncio
import contextlib
from contextlib import asynccontextmanager
import hmac
import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .schemas import DetectRequest, validate_detections
from .runtime import InferenceError, RouterEngine

logging.getLogger("httpx").setLevel(logging.WARNING)
LOG=logging.getLogger("bulwark")
logging.basicConfig(level=logging.INFO,format="%(asctime)s %(levelname)s %(message)s")

class AdmissionMiddleware:
    def __init__(self,app,api_key,body_limit):
        self.app,self.key,self.limit=app,api_key.encode(),body_limit

    async def __call__(self,scope,receive,send):
        if scope["type"]!="http":
            return await self.app(scope,receive,send)
        async def error(code,message):
            await JSONResponse({"detail":message},status_code=code,
                headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"})(scope,receive,send)
        if scope["path"]=="/v1/detect":
            headers=dict(scope.get("headers",[]))
            auth=headers.get(b"authorization",b"")
            if not hmac.compare_digest(auth,b"Bearer "+self.key):
                return await error(401,"A valid Bearer API key is required.")
            chunks=[]
            size=0
            while True:
                event=await receive()
                if event["type"]=="http.disconnect":
                    return
                size+=len(event.get("body",b""))
                if size>self.limit:
                    return await error(413,"Request body is too large.")
                chunks.append(event.get("body",b""))
                if not event.get("more_body",False):
                    break
            body=b"".join(chunks)
            delivered=False
            async def buffered():
                nonlocal delivered
                if not delivered:
                    delivered=True
                    return {"type":"http.request","body":body,"more_body":False}
                return await receive()
            return await self.app(scope,buffered,send)
        return await self.app(scope,receive,send)

def create_app(api_key=None,engine=None,queue_limit=2,body_limit=65536):
    api_key=api_key or os.environ.get("MODEL_API_KEY","")
    if len(api_key)<12:
        raise RuntimeError("A persistent MODEL_API_KEY must be configured.")
    runtime=engine
    lock=asyncio.Lock()
    admitted=0

    @asynccontextmanager
    async def lifespan(app):
        nonlocal runtime
        if runtime is None:
            runtime=RouterEngine()
            await runtime.start()
        yield
        if isinstance(runtime,RouterEngine):
            await runtime.close()

    app=FastAPI(title="Bulwark Local AI",docs_url=None,redoc_url=None,openapi_url=None,lifespan=lifespan)
    app.add_middleware(AdmissionMiddleware,api_key=api_key,body_limit=body_limit)

    @app.exception_handler(RequestValidationError)
    async def invalid_input(request,exc):
        # FastAPI's default errors echo rejected input.
        return JSONResponse({"detail":"Invalid request: check file paths, content and limits."},status_code=422)

    @app.exception_handler(InferenceError)
    async def inference_error(request,exc):
        return JSONResponse({"detail":exc.message},status_code=exc.status,
                            headers={"Retry-After":"30"} if exc.status in (429,503) else None)

    @app.get("/healthz")
    async def health():
        return {"status":"ok"}

    @app.post("/v1/detect")
    async def detect(data:DetectRequest,request:Request):
        nonlocal admitted
        if admitted>=queue_limit+1:
            raise InferenceError(429,"Inference queue is full; try again later.")
        admitted+=1
        acquired=False
        waiter=None
        operation=None
        async def disconnected():
            while not await request.is_disconnected():
                await asyncio.sleep(0.1)
        gone=asyncio.create_task(disconnected())
        try:
            waiter=asyncio.create_task(lock.acquire())
            done,_=await asyncio.wait({waiter,gone},timeout=180,return_when=asyncio.FIRST_COMPLETED)
            if waiter in done:
                acquired=waiter.result()
            if gone in done:
                raise InferenceError(499,"Client disconnected.")
            if not acquired:
                raise InferenceError(429,"Inference queue wait timed out.")
            operation=asyncio.create_task(runtime.detect(data))
            done,_=await asyncio.wait({operation,gone},return_when=asyncio.FIRST_COMPLETED)
            if gone in done and not operation.done():
                raise InferenceError(499,"Client disconnected.")
            result=await operation
            try:
                return validate_detections(result,data)
            except Exception:
                raise InferenceError(502,"Model findings failed source validation.") from None
        finally:
            for task in (gone,waiter):
                if task and not task.done():
                    task.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await task
            # Acquisition can win concurrently with disconnect/timeout.
            if waiter and waiter.done() and not waiter.cancelled() and not acquired:
                acquired=waiter.result()
            if operation and not operation.done():
                operation.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await operation
                if isinstance(runtime,RouterEngine):
                    await runtime.abort()
            if acquired:
                lock.release()
            admitted-=1
    return app

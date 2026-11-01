from contextlib import asynccontextmanager
import json
import logging
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_", extra="ignore")
    service_name: str = Field(default="stagelink-ai", min_length=1, max_length=64)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = Settings()
    yield


logger = logging.getLogger("stagelink.ai")
logger.setLevel(logging.INFO)
logger.propagate = False
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)

app = FastAPI(title="StageLink AI service", version="0.1.0", lifespan=lifespan)


class Health(BaseModel):
    status: str
    service: str
    version: str
    capabilities: list[str]


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = str(uuid.uuid4())
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        response = JSONResponse(status_code=500, content={
            "code": "INTERNAL_ERROR", "message": "An unexpected error occurred", "requestId": request_id,
        })
    response.headers["X-Request-ID"] = request_id
    response.headers["Cache-Control"] = "no-store"
    # Do not log URLs/query strings, request bodies, keys or raw exception messages.
    logger.info(json.dumps({
        "event": "http.request",
        "requestId": request_id, "status": response.status_code,
        "durationMs": round((time.monotonic() - started) * 1000),
    }))
    return response


@app.get("/health/ready", response_model=Health)
async def health(request: Request):
    return Health(status="ready", service=request.app.state.settings.service_name,
                  version="0.1.0", capabilities=["health-only"])

@app.get("/health/live", response_model=Health)
async def live(request: Request):
    return Health(status="alive", service=request.app.state.settings.service_name,
                  version="0.1.0", capabilities=["health-only"])


# No generation endpoint or fabricated metrics. Provider setup belongs to P15.

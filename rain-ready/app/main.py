"""App wiring. Routers in app/routers/ are auto-loaded; a broken one is skipped and listed in /api/health."""
import importlib
import logging
import pkgutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config, routers
from .db import init_db

log = logging.getLogger("rainready")
LOADED: list[str] = []
FAILED: dict[str, str] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Rain-Ready", version=config.VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

for m in pkgutil.iter_modules(routers.__path__):
    try:
        app.include_router(importlib.import_module(f"{routers.__name__}.{m.name}").router)
        LOADED.append(m.name)
    except Exception as e:  # noqa: BLE001
        FAILED[m.name] = repr(e)
        log.error("router %s failed to load: %r", m.name, e)


@app.get("/api/health")
def health():
    return {"ok": True, "version": config.VERSION, "routers": LOADED, "router_errors": FAILED,
            "storage": config.STORAGE, "triage": config.TRIAGE_MODE}


WEB = Path(__file__).resolve().parent.parent / "web"
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")

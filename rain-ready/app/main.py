"""App wiring. Owner: dev#1. Routers are auto-discovered: drop a file in app/routers/ that exposes `router`.
A missing or broken router is skipped with a log line, so one dev's WIP cannot stop everyone else's demo."""
import importlib
import logging
import pkgutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
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

for m in pkgutil.iter_modules(routers.__path__):
    try:
        mod = importlib.import_module(f"{routers.__name__}.{m.name}")
        app.include_router(mod.router)
        LOADED.append(m.name)
    except Exception as e:  # noqa: BLE001
        FAILED[m.name] = repr(e)
        log.error("router %s failed to load: %r", m.name, e)


@app.get("/api/health")
def health():
    return {"ok": True, "version": config.VERSION, "routers": LOADED, "router_errors": FAILED}


WEB = Path(__file__).resolve().parent.parent / "web"
Path(config.PHOTO_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")

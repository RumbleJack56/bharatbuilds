"""App wiring. Routers in app/routers/ are auto-loaded; a broken one is skipped and listed in /api/health."""
import importlib
import logging
import pkgutil
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import auth, checks, config, routers
from .db import get_db, init_db

log = logging.getLogger("rainready")
LOADED: list[str] = []
FAILED: dict[str, str] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    for w in checks.config_warnings():
        log.warning("config: %s", w)
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


DEEP_TTL_S = 30                  # the deep check writes to S3 and may call Bedrock; do not repeat it on every hit
_deep: dict = {"at": 0.0, "value": None}


def _deep_probe() -> dict:
    now = time.monotonic()
    if _deep["value"] is None or now - _deep["at"] > DEEP_TTL_S:
        _deep.update(at=now, value=checks.aws_probe())
    return _deep["value"]


@app.get("/api/health")
def health(deep: bool = False, x_user_id: str | None = Header(default=None), x_persona_key: str | None = Header(default=None)):
    out = {"ok": not FAILED, "version": config.VERSION, "routers": LOADED, "router_errors": FAILED,
           "storage": config.STORAGE, "triage": config.TRIAGE_MODE, "config_warnings": checks.config_warnings()}
    if deep:       # real AWS calls and error text that can name the account: admin persona only
        who = get_db().execute("SELECT id, role FROM users WHERE id=?", (x_user_id or "",)).fetchone()
        if who and who["role"] == "admin":
            auth.check_persona_key(who, x_persona_key)
        if not who or who["role"] != "admin":
            raise HTTPException(403, "the deep check needs the admin persona (header X-User-Id: admin-1)")
        out["aws"] = _deep_probe()
    return out


WEB = Path(__file__).resolve().parent.parent / "web"


@app.get("/", include_in_schema=False)
def site():
    """Public site (EcoPower Framer layout) with live counts. Old /#/... app links are forwarded to /app by the page."""
    return FileResponse(WEB / "landing" / "index.html")


@app.get("/app", include_in_schema=False)
def app_shell():
    """The web app. Its assets are root-relative (css/, js/), so /app serves index.html without a trailing slash."""
    return FileResponse(WEB / "index.html")


app.mount("/", StaticFiles(directory=WEB, html=True), name="web")

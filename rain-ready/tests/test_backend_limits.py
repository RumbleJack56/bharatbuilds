"""B18 to B22: Bedrock off the event loop with short timeouts, image prep for the model, deep health access,
upload cap, capture secret warning."""
import asyncio
import io
import os
from pathlib import Path

import pytest
from PIL import Image

from ai import stampread, triage
from app import config, main
from core import imageprep

from .conftest import as_, fresh_photo

SPOT = {"lat": 28.6433, "lon": 77.1846}
ROOT = Path(__file__).resolve().parent.parent


def noise_png(w, h) -> bytes:
    buf = io.BytesIO()
    Image.frombytes("RGB", (w, h), os.urandom(w * h * 3)).save(buf, "PNG")
    return buf.getvalue()


# --- B18 -------------------------------------------------------------------------------------------------------
def test_model_calls_do_not_run_on_the_event_loop(client, monkeypatch):
    seen = {}

    def on_loop() -> bool:
        try:
            asyncio.get_running_loop()
            return True
        except RuntimeError:
            return False

    def fake_triage(*a, **k):
        seen["triage"] = on_loop()
        return None

    def fake_read(*a, **k):
        seen["stamp"] = on_loop()
        return None
    monkeypatch.setattr(triage, "triage_photo", fake_triage)
    monkeypatch.setattr(stampread, "read_stamp", fake_read)
    r = client.post("/api/incidents", data={**SPOT, "kind": "overflow"}, files=fresh_photo(), headers=as_("res-1"))
    assert r.status_code == 200
    assert seen == {"triage": False, "stamp": False}


def test_bedrock_client_has_short_timeouts(monkeypatch):
    import boto3
    seen = []

    class Br:
        def converse(self, **kw):
            raise RuntimeError("stop")
    monkeypatch.setattr(boto3, "client", lambda name, **kw: seen.append((name, kw)) or Br())
    monkeypatch.setattr(config, "TRIAGE_MODE", "bedrock")
    monkeypatch.setattr(config, "BEDROCK_MODEL_ID", "m")
    assert triage.triage_photo(noise_png(8, 8), "image/png") is None
    assert stampread.read_stamp(noise_png(8, 8), "image/png") is None
    assert len(seen) == 2
    for name, kw in seen:
        c = kw["config"]
        assert name == "bedrock-runtime" and c.connect_timeout <= 5 and c.read_timeout <= 20
        assert c.retries["max_attempts"] <= 2


# --- B19 -------------------------------------------------------------------------------------------------------
def test_big_photo_is_shrunk_for_the_model():
    big = noise_png(2400, 1800)
    assert len(big) > imageprep.MODEL_MAX_BYTES
    out, ctype = imageprep.for_model(big, "image/png")
    assert ctype == "image/jpeg" and len(out) <= imageprep.MODEL_MAX_BYTES
    assert max(Image.open(io.BytesIO(out)).size) <= imageprep.MODEL_MAX_SIDE


def test_small_photo_goes_through_unchanged():
    small = noise_png(200, 150)
    assert imageprep.for_model(small, "image/png") == (small, "image/png")


def test_unreadable_bytes_raise_value_error():
    with pytest.raises(ValueError):
        imageprep.for_model(b"not an image", "image/png")


def test_triage_sends_the_shrunk_copy(monkeypatch):
    import boto3
    sent = []

    class Br:
        def converse(self, **kw):
            sent.append(kw["messages"][0]["content"][0]["image"])
            return {"output": {"message": {"content": [{"text": '{"kind":"other","summary":"x"}'}]}}}
    monkeypatch.setattr(boto3, "client", lambda name, **kw: Br())
    monkeypatch.setattr(config, "TRIAGE_MODE", "bedrock")
    monkeypatch.setattr(config, "BEDROCK_MODEL_ID", "m")
    assert triage.triage_photo(noise_png(2400, 1800), "image/png")["kind"] == "other"
    assert sent[0]["format"] == "jpeg" and len(sent[0]["source"]["bytes"]) <= imageprep.MODEL_MAX_BYTES


# --- B20 -------------------------------------------------------------------------------------------------------
@pytest.fixture()
def probe(monkeypatch):
    main._deep.update(at=0.0, value=None)
    calls = []
    monkeypatch.setattr("app.checks.aws_probe", lambda: calls.append(1) or {"s3": "ok"})
    return calls


def test_deep_health_needs_the_admin_persona(client, probe):
    assert client.get("/api/health?deep=1").status_code == 403
    assert client.get("/api/health?deep=1", headers=as_("res-1")).status_code == 403
    assert client.get("/api/health?deep=1", headers=as_("nobody")).status_code == 403
    assert probe == []
    assert client.get("/api/health").status_code == 200          # the plain check stays public


def test_deep_health_is_cached_for_a_few_seconds(client, probe):
    for _ in range(3):
        r = client.get("/api/health?deep=1", headers=as_("admin-1"))
        assert r.status_code == 200 and r.json()["aws"] == {"s3": "ok"}
    assert len(probe) == 1


# --- B21 -------------------------------------------------------------------------------------------------------
def test_caddy_caps_the_request_body():
    assert "max_size" in (ROOT / "Caddyfile").read_text()


def test_oversize_upload_is_read_only_up_to_the_limit(client, monkeypatch):
    monkeypatch.setattr("app.storage.MAX_BYTES", 100)
    r = client.post("/api/incidents", data={**SPOT, "kind": "overflow"},
                    files={"photo": ("a.png", b"\x89PNG" + b"0" * 5000, "image/png")}, headers=as_("res-1"))
    assert r.status_code == 422 and "large" in r.json()["detail"]


# --- B22 -------------------------------------------------------------------------------------------------------
def test_missing_capture_secret_is_a_warning(client, monkeypatch):
    monkeypatch.setattr(config, "CAPTURE_SECRET", "")
    assert any("CAPTURE_SECRET" in w for w in client.get("/api/health").json()["config_warnings"])
    monkeypatch.setattr(config, "CAPTURE_SECRET", "x" * 48)
    assert not any("CAPTURE_SECRET" in w for w in client.get("/api/health").json()["config_warnings"])

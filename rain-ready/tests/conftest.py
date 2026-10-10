import io
import itertools
import random

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import config, db


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "t.db"))
    monkeypatch.setattr(config, "PHOTO_DIR", str(tmp_path / "photos"))
    db.reset_connection()
    from app.main import app
    with TestClient(app) as c:
        yield c
    db.reset_connection()


def as_(user_id: str) -> dict:
    return {"X-User-Id": user_id}


_seeds = itertools.count(1000)


def fresh_png() -> bytes:
    """A real, readable image that differs from every earlier call (so the reuse check stays quiet)."""
    rnd = random.Random(next(_seeds))
    img = Image.new("RGB", (12, 9))
    img.putdata([(rnd.randrange(256),) * 3 for _ in range(108)])
    buf = io.BytesIO()
    img.resize((120, 90), Image.BICUBIC).save(buf, "PNG")
    return buf.getvalue()


def fresh_photo() -> dict:
    return {"photo": ("p.png", fresh_png(), "image/png")}

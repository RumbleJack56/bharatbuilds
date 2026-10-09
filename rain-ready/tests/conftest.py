import pytest
from fastapi.testclient import TestClient

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

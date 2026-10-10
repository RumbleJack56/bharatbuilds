"""Report intake order (B16, B17): unreadable files are refused, and nothing is stored for a report that fails."""
import os

from app import config

from .conftest import as_, fresh_photo

SPOT = {"lat": 28.6433, "lon": 77.1846}
HTML = b"<html>not an image</html>"


def stored(tmp_path):
    p = tmp_path / "photos"
    return sorted(os.listdir(p)) if p.exists() else []


def test_non_image_bytes_are_refused_and_not_stored(client, tmp_path):
    r = client.post("/api/incidents", data={**SPOT, "kind": "overflow"},
                    files={"photo": ("x.jpg", HTML, "image/jpeg")}, headers=as_("res-1"))
    assert r.status_code == 422 and "image" in r.json()["detail"]
    assert stored(tmp_path) == []
    assert client.get("/api/incidents?mine=true", headers=as_("res-1")).json()["incidents"] == []


def test_report_without_kind_stores_no_photo(client, tmp_path):
    r = client.post("/api/incidents", data=SPOT, files=fresh_photo(), headers=as_("res-1"))
    assert r.status_code == 422
    assert stored(tmp_path) == []


def test_good_report_stores_exactly_one_photo(client, tmp_path):
    r = client.post("/api/incidents", data={**SPOT, "kind": "overflow"}, files=fresh_photo(), headers=as_("res-1"))
    assert r.status_code == 200 and len(stored(tmp_path)) == 1


def test_non_image_after_photo_is_refused_and_task_stays_accepted(client, tmp_path):
    tid = client.post("/api/incidents", data={**SPOT, "kind": "overflow"}, files=fresh_photo(),
                      headers=as_("res-1")).json()["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    n = len(stored(tmp_path))
    r = client.post(f"/api/tasks/{tid}/complete", data={}, files={"photo": ("a.jpg", HTML, "image/jpeg")},
                    headers=as_("off-mcd"))
    assert r.status_code == 422
    assert len(stored(tmp_path)) == n
    assert client.get(f"/api/tasks/{tid}").json()["status"] == "accepted"


def test_wrong_type_and_oversize_still_422_and_not_stored(client, tmp_path, monkeypatch):
    r = client.post("/api/incidents", data={**SPOT, "kind": "overflow"},
                    files={"photo": ("x.txt", b"hi", "text/plain")}, headers=as_("res-1"))
    assert r.status_code == 422
    monkeypatch.setattr("app.storage.MAX_BYTES", 10)
    r = client.post("/api/incidents", data={**SPOT, "kind": "overflow"}, files=fresh_photo(), headers=as_("res-1"))
    assert r.status_code == 422 and "large" in r.json()["detail"]
    assert stored(tmp_path) == []

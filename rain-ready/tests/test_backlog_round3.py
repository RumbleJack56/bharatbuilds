"""B5 gaps, B23 to B26: task banner, map task fields, token single use, flat photos, bounce clock, health ok."""
import io
from datetime import datetime, timedelta, timezone

from PIL import Image

from app import capture, config, db, main
from core import copy, photocheck

from .conftest import as_, fresh_photo

SPOT = {"lat": 28.6433, "lon": 77.1846}


def report(c, user="res-1", **extra):
    return c.post("/api/incidents", data={**SPOT, "kind": "blocked_drain", **extra}, files=fresh_photo(), headers=as_(user))


# --- B5 --------------------------------------------------------------------------------------------------------
def test_task_detail_has_the_banner(client):
    tid = report(client).json()["task_id"]
    assert client.get(f"/api/tasks/{tid}").json()["banner"] == copy.SCENARIO_BANNER


def test_map_tasks_carry_asset_name_and_last_cleaned(client):
    report(client)
    t = client.get("/api/map").json()["tasks"][0]
    assert t["asset_name"] and "last_confirmed_clean" in t


# --- B23 -------------------------------------------------------------------------------------------------------
def test_capture_token_is_good_for_one_report(client):
    tok = client.get("/api/capture-token", headers=as_("res-1")).json()["token"]
    first = report(client, capture_token=tok).json()
    assert "photo_not_live" not in {f["code"] for f in first["flags"]}
    second = report(client, capture_token=tok, lat=28.6433, lon=77.1846).json()
    assert "photo_not_live" in {f["code"] for f in second["flags"]}


def test_a_refused_report_does_not_use_up_the_token(client):
    tok = client.get("/api/capture-token", headers=as_("res-1")).json()["token"]
    bad = client.post("/api/incidents", data={**SPOT, "capture_token": tok}, files=fresh_photo(), headers=as_("res-1"))
    assert bad.status_code == 422                                    # no kind
    ok = report(client, capture_token=tok).json()
    assert "photo_not_live" not in {f["code"] for f in ok["flags"]}


def test_used_token_state_expires():
    tok = capture.issue("u", now=1000)["token"]
    assert capture.verify(tok, "u", now=1001) and not capture.is_used(tok, now=1001)
    capture.mark_used(tok, now=1001)
    assert capture.is_used(tok, now=1002)
    assert not capture.is_used(tok, now=1001 + config.CAPTURE_MAX_AGE_S + 120)


# --- B24 -------------------------------------------------------------------------------------------------------
def flat(v) -> dict:
    buf = io.BytesIO()
    Image.new("RGB", (200, 200), (v, v, v)).save(buf, "JPEG")
    return photocheck.analyze(buf.getvalue())


def test_flat_photos_are_not_called_reused():
    a, b = flat(5), flat(120)
    now = datetime(2026, 10, 10, tzinfo=timezone.utc)
    fl = photocheck.assess(b, 28.6433, 77.1846, now, [(a["hash"], "res-2")], "res-1")
    assert not {"photo_reused_self", "photo_reused_other"} & {f["code"] for f in fl}
    assert not photocheck.informative(a["hash"])


# --- B25 -------------------------------------------------------------------------------------------------------
def test_bounce_restarts_the_clock_for_the_new_owner(client):
    tid = report(client).json()["task_id"]
    con = db.get_db()
    old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(timespec="seconds")
    con.execute("UPDATE tasks SET created_at=?, due_at=? WHERE id=?", (old, old, tid))
    con.commit()
    assert client.get(f"/api/tasks/{tid}").json()["overdue"] is True
    client.post(f"/api/tasks/{tid}/reject", json={"reason": "not ours", "reassign_to": "pwd"}, headers=as_("off-mcd"))
    t = client.get(f"/api/tasks/{tid}").json()
    assert t["overdue"] is False and t["agency_id"] == "pwd"
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-pwd"))
    client.post(f"/api/tasks/{tid}/complete", data={}, files=fresh_photo(), headers=as_("off-pwd"))
    pwd = next(a for a in client.get("/api/accountability").json()["agencies"] if a["agency_id"] == "pwd")
    assert pwd["median_hours_to_complete"] < 1            # counted from when PWD received it, not from day 0
    assert pwd["median_hours_to_accept"] < 1


# --- B26 -------------------------------------------------------------------------------------------------------
def test_health_is_not_ok_when_a_router_failed(client, monkeypatch):
    assert client.get("/api/health").json()["ok"] is True
    monkeypatch.setitem(main.FAILED, "broken", "ImportError()")
    r = client.get("/api/health").json()
    assert r["ok"] is False and r["router_errors"] == {"broken": "ImportError()"}


def test_requirements_are_pinned():
    from pathlib import Path
    lines = [l.strip() for l in (Path(__file__).resolve().parent.parent / "requirements.txt").read_text().splitlines() if l.strip()]
    assert lines and all("==" in l for l in lines), lines

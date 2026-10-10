"""B27 redacted reads, B29 held flag on incident items, B30 dispute note on task lists, B31 after-photo stamp checks."""
from ai import stampread
from app import capture, config

from .conftest import as_, fresh_photo
from .test_stamp import TEXT

SPOT = {"lat": 28.6433, "lon": 77.1846}


def report(c, user="res-1", **extra):
    return c.post("/api/incidents", data={**SPOT, "kind": "blocked_drain", **extra}, files=fresh_photo(), headers=as_(user))


def codes(flags) -> set:
    return {f["code"] for f in flags}


def accepted_task(c) -> int:
    tid = report(c, note="water is knee deep").json()["task_id"]
    assert c.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd")).status_code == 200
    return tid


def complete(c, tid, **data):
    return c.post(f"/api/tasks/{tid}/complete", data={"note": "cleaned", **data}, files=fresh_photo(), headers=as_("off-mcd"))


# --- B27 -------------------------------------------------------------------------------------------------------
def test_a_resident_does_not_see_other_residents_user_id_or_note(client):
    report(client, "res-1", note="my number is on the gate")
    own = client.get("/api/incidents?mine=true", headers=as_("res-1")).json()["incidents"][0]
    assert own["user_id"] == "res-1" and own["note"] == "my number is on the gate"
    other = client.get("/api/incidents", headers=as_("res-2")).json()["incidents"][0]
    assert other["user_id"] is None and other["note"] == ""
    assert other["kind"] == "blocked_drain" and other["photo_url"] and other["created_at"]     # the list stays useful


def test_officials_and_admin_still_see_the_full_report(client):
    report(client, "res-1", note="gate is locked")
    for who in ("off-mcd", "admin-1"):
        i = client.get("/api/incidents", headers=as_(who)).json()["incidents"][0]
        assert i["user_id"] == "res-1" and i["note"] == "gate is locked"


# --- B29 -------------------------------------------------------------------------------------------------------
def test_incident_items_carry_held_for_review(client, monkeypatch):
    ok = report(client).json()
    assert ok["incident"]["held_for_review"] is False
    monkeypatch.setattr(stampread, "read_stamp", lambda *a: TEXT)          # stamp says another place: held
    held = report(client, "res-2").json()
    assert held["held_for_review"] and held["incident"]["held_for_review"] is True
    mine = client.get("/api/incidents?mine=true", headers=as_("res-2")).json()["incidents"]
    assert mine[0]["held_for_review"] is True
    rel = client.post(f"/api/incidents/{held['incident']['id']}/review", json={"decision": "release"}, headers=as_("admin-1")).json()
    assert rel["incident"]["held_for_review"] is False


# --- B30 -------------------------------------------------------------------------------------------------------
def test_disputed_task_list_item_carries_the_latest_note(client):
    tid = accepted_task(client)
    assert complete(client, tid).status_code == 200
    r = client.post(f"/api/tasks/{tid}/confirm", json={"ok": False, "note": "still blocked"}, headers=as_("res-2"))
    assert r.status_code == 200 and r.json()["dispute_note"] == "still blocked"
    item = next(t for t in client.get("/api/tasks?status=disputed").json()["tasks"] if t["id"] == tid)
    assert item["dispute_note"] == "still blocked"
    assert client.get("/api/tasks").json()["tasks"][0]["dispute_note"] in ("still blocked", None)


def test_dispute_note_is_empty_for_other_statuses(client):
    tid = accepted_task(client)
    assert client.get(f"/api/tasks/{tid}").json()["dispute_note"] is None


# --- B31 -------------------------------------------------------------------------------------------------------
def test_officials_can_get_a_capture_token(client):
    j = client.get("/api/capture-token", headers=as_("off-mcd")).json()
    assert capture.verify(j["token"], "off-mcd") == j["ref"]
    assert client.get("/api/capture-token").status_code == 401


def event_flags(c, tid) -> set:
    done = [e for e in c.get(f"/api/tasks/{tid}").json()["events"] if e["event"] == "completed"][0]
    return codes(done["flags"])


def test_after_photo_without_a_token_is_not_live(client):
    tid = accepted_task(client)
    assert complete(client, tid).status_code == 200
    assert "photo_not_live" in event_flags(client, tid)


def test_after_photo_with_a_live_token_is_live_and_single_use(client):
    tid = accepted_task(client)
    tok = client.get("/api/capture-token", headers=as_("off-mcd")).json()["token"]
    assert complete(client, tid, capture_token=tok, **SPOT, accuracy_m=12).status_code == 200
    assert "photo_not_live" not in event_flags(client, tid)
    assert capture.is_used(tok)


def test_after_photo_taken_far_from_the_drain_is_flagged(client):
    tid = accepted_task(client)
    assert complete(client, tid, lat=28.70, lon=77.30, accuracy_m=10).status_code == 200
    assert "not_at_drain" in event_flags(client, tid)


def test_after_photo_with_a_wrong_stamp_is_flagged_but_not_blocked(client, monkeypatch):
    tid = accepted_task(client)
    monkeypatch.setattr(stampread, "read_stamp", lambda *a: TEXT)          # after the task exists: the report itself was fine
    assert complete(client, tid).status_code == 200
    assert "stamp_gps_mismatch" in event_flags(client, tid)


def test_required_live_capture_flags_but_does_not_stop_the_work(client, monkeypatch):
    tid = accepted_task(client)
    monkeypatch.setattr(config, "REQUIRE_LIVE_CAPTURE", True)
    assert complete(client, tid).status_code == 200
    assert client.get(f"/api/tasks/{tid}").json()["status"] == "done"

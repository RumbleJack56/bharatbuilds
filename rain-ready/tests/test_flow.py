"""End-to-end loop through the HTTP API: report -> task -> accept/complete -> independent confirm -> pocket slows."""
import json

from core import copy

from .conftest import as_, fresh_photo


def photo():
    return fresh_photo()


def pocket_ttf(c, pid="LP-RN-1"):
    r = c.post("/api/simulate", json={"rain_mm_h": 35, "drain_state": "current"}).json()["results"]
    return next(x for x in r if x["id"] == pid)["time_to_fill_h"]


def report(c, user="res-1", lat=28.6433, lon=77.1846):
    return c.post("/api/incidents", data={"lat": lat, "lon": lon, "kind": "blocked_drain", "note": "full of silt"},
                  files=photo(), headers=as_(user))


def test_health_and_personas(client):
    h = client.get("/api/health").json()
    assert h["ok"] and not h["router_errors"]
    assert len(client.get("/api/users").json()["users"]) == 5
    assert client.get("/api/me").status_code == 401


def test_full_loop_and_pocket_slows(client):
    before = pocket_ttf(client)
    r = report(client).json()
    assert r["linked_asset"] == "DR-RN-001" and r["task_created"]
    tid = r["task_id"]
    t = client.get(f"/api/tasks/{tid}").json()
    assert t["agency_id"] == "mcd" and t["gain_h"] > 0 and t["pocket_id"] == "LP-RN-1"

    # second report from another person bumps the same task
    r2 = report(client, "res-2").json()
    assert r2["task_id"] == tid and not r2["task_created"]
    assert client.get(f"/api/tasks/{tid}").json()["report_count"] == 2

    # wrong agency cannot act
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-pwd")).status_code == 403
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd")).status_code == 200
    # cannot confirm before done; resident cannot complete
    assert client.post(f"/api/tasks/{tid}/confirm", json={"ok": True}, headers=as_("res-1")).status_code == 409
    assert client.post(f"/api/tasks/{tid}/complete", data={"note": "x"}, files=photo(), headers=as_("res-1")).status_code == 403
    d = client.post(f"/api/tasks/{tid}/complete", data={"note": "cleaned"}, files=photo(), headers=as_("off-mcd")).json()
    assert d["status"] == "done"
    c = client.post(f"/api/tasks/{tid}/confirm", json={"ok": True, "note": "looks clear"}, headers=as_("res-2")).json()
    assert c["status"] == "confirmed"
    assert [e["event"] for e in c["events"]] == ["created", "report_added", "accepted", "completed", "confirmed"]
    assert pocket_ttf(client) > before

    imp = client.get("/api/impact").json()
    assert imp["tasks"]["confirmed"] == 1 and imp["fill_time_gained_h"] > 0
    acc = {a["agency_id"]: a for a in client.get("/api/accountability").json()["agencies"]}
    assert acc["mcd"]["tasks"]["confirmed"] == 1 and acc["mcd"]["median_hours_to_accept"] is not None


def test_bounce_wrong_owner_and_no_owner(client):
    r = report(client, lat=28.64345, lon=77.1848).json()          # DR-RN-002: disputed, no owner
    tid = r["task_id"]
    t = client.get(f"/api/tasks/{tid}").json()
    assert t["agency_id"] is None and t["agency_name"] == copy.NO_OWNER
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd")).status_code == 403
    assert client.post(f"/api/tasks/{tid}/assign", json={"agency_id": "mcd"}, headers=as_("res-1")).status_code == 403
    assert client.post(f"/api/tasks/{tid}/assign", json={"agency_id": "mcd"}, headers=as_("admin-1")).status_code == 200
    b = client.post(f"/api/tasks/{tid}/reject", json={"reason": "this is a PWD inlet", "reassign_to": "pwd"},
                    headers=as_("off-mcd")).json()
    assert b["agency_id"] == "pwd" and b["status"] == "open"
    acc = {a["agency_id"]: a for a in client.get("/api/accountability").json()["agencies"]}
    assert acc["mcd"]["bounced_away"] == 1


def test_reporter_cannot_confirm_or_dispute_own_report(client):
    tid = report(client).json()["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/complete", data={}, files=photo(), headers=as_("off-mcd"))
    for ok in (True, False):
        r = client.post(f"/api/tasks/{tid}/confirm", json={"ok": ok, "note": "mine"}, headers=as_("res-1"))
        assert r.status_code == 403 and "reported" in r.json()["detail"]
    assert client.get(f"/api/tasks/{tid}").json()["status"] == "done"
    d = client.post(f"/api/tasks/{tid}/confirm", json={"ok": False, "note": "still blocked"}, headers=as_("res-2")).json()
    assert d["status"] == "disputed"
    r = client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd")).json()            # rework: the agency takes it again
    assert r["status"] == "accepted" and r["events"][-1]["note"].startswith("to be redone")
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-pwd")).status_code == 403
    client.post(f"/api/tasks/{tid}/complete", data={"note": "redone"}, files=photo(), headers=as_("off-mcd"))
    assert client.post(f"/api/tasks/{tid}/confirm", json={"ok": True}, headers=as_("res-2")).json()["status"] == "confirmed"


def test_later_reporter_may_confirm(client):
    tid = report(client).json()["task_id"]
    assert report(client, "res-2").json()["task_id"] == tid       # res-2 adds a report, res-1 raised it
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/complete", data={}, files=photo(), headers=as_("off-mcd"))
    assert client.post(f"/api/tasks/{tid}/confirm", json={"ok": True}, headers=as_("res-1")).status_code == 403
    assert client.post(f"/api/tasks/{tid}/confirm", json={"ok": True}, headers=as_("res-2")).status_code == 200


def _disputed(client):
    tid = report(client).json()["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/complete", data={}, files=photo(), headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/confirm", json={"ok": False, "note": "still blocked"}, headers=as_("res-2"))
    return tid


def test_disputed_task_is_accepted_again_and_confirmed(client):
    tid = _disputed(client)
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-pwd")).status_code == 403     # other agency
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("res-2")).status_code == 403
    r = client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    assert r.status_code == 200 and r.json()["status"] == "accepted" and r.json()["done_by"] is None
    assert r.json()["events"][-1]["note"].startswith("to be redone")
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd")).status_code == 409    # not open or disputed now
    client.post(f"/api/tasks/{tid}/complete", data={"note": "again"}, files=photo(), headers=as_("off-mcd"))
    assert client.post(f"/api/tasks/{tid}/confirm", json={"ok": True}, headers=as_("res-2")).json()["status"] == "confirmed"


def test_admin_can_accept_a_disputed_task_for_the_agency(client):
    tid = _disputed(client)
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("admin-1")).json()["status"] == "accepted"


def test_done_task_cannot_be_accepted(client):
    tid = report(client).json()["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/complete", data={}, files=photo(), headers=as_("off-mcd"))
    assert client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd")).status_code == 409


def test_report_validation(client):
    assert client.post("/api/incidents", data={"lat": 10, "lon": 10, "kind": "other"}, headers=as_("res-1")).status_code == 422
    assert client.post("/api/incidents", data={"lat": 28.6, "lon": 77.2}, headers=as_("res-1")).status_code == 422   # no kind, no AI
    assert client.post("/api/incidents", data={"lat": 28.6433, "lon": 77.1846, "kind": "other"}, headers=as_("off-mcd")).status_code == 403
    far = client.post("/api/incidents", data={"lat": 28.70, "lon": 77.30, "kind": "other"}, headers=as_("res-1")).json()
    assert far["linked_asset"] is None and far["task_id"] is None
    bad = client.post("/api/incidents", data={"lat": 28.6433, "lon": 77.1846, "kind": "other"},
                      files={"photo": ("x.txt", b"hi", "text/plain")}, headers=as_("res-1"))
    assert bad.status_code == 422


def test_plan_generate_and_lists(client):
    assert client.post("/api/plan/generate", headers=as_("res-1")).status_code == 403
    ids = client.post("/api/plan/generate?top=3", headers=as_("admin-1")).json()["created_task_ids"]
    assert ids
    tasks = client.get("/api/tasks").json()["tasks"]
    assert tasks == sorted(tasks, key=lambda t: -t["rank_score"])
    assert client.post("/api/plan/generate?top=3", headers=as_("admin-1")).json()["created_task_ids"] == []  # idempotent


def test_opportunities_and_map_strings(client):
    o = {s["site_id"]: s for s in client.get("/api/opportunities").json()["sites"]}
    assert o["S-SHALLOW"]["use"] == "store_reuse" and o["S-SHALLOW"]["rule_id"] == "R2"
    assert o["S-DEEP"]["use"] == "recharge"
    m = client.get("/api/map").json()
    blob = json.dumps([m["banner"], client.get("/api/impact").json()["banner"]])
    assert not copy.banned_hits(blob)
    assert client.get("/api/tasks/9999").status_code == 404

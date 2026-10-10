import re
from pathlib import Path

from core import copy

from .conftest import as_, fresh_photo


def photo():
    """A real, different picture each call: the duplicate-photo check holds a repeat, as it should."""
    return fresh_photo()


def _loop(client, user="res-1", lat=28.6433, lon=77.1846):
    r = client.post("/api/incidents", data={"lat": lat, "lon": lon, "kind": "blocked_drain", "note": "silt"}, files=photo(), headers=as_(user)).json()
    tid = r["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/complete", data={"note": "cleared"}, files=photo(), headers=as_("off-mcd"))
    other = "res-2" if user == "res-1" else "res-1"                  # the reporter cannot confirm their own report
    client.post(f"/api/tasks/{tid}/confirm", json={"ok": True}, headers=as_(other))
    return tid


def test_leaderboard_is_public_scored_and_explains_itself(client):
    assert client.get("/api/leaderboard").json()["agencies"][0]["rank"] is None        # nothing yet: nobody has a rank
    for user, lat, lon in (("res-1", 28.6433, 77.1846), ("res-2", 28.6429, 77.184), ("res-1", 28.6437, 77.1851)):   # three different MCD drains
        _loop(client, user=user, lat=lat, lon=lon)
    r = client.get("/api/leaderboard").json()
    mcd = next(a for a in r["agencies"] if a["agency_id"] == "mcd")
    assert mcd["inputs"]["confirmed"] == 3 and mcd["ranked"] and mcd["rank"] == 1 and mcd["score"] > 80
    assert r["method"]["measures"] and r["unassigned"]["tasks"] == 0 and r["demo"] is False


def test_transparency_log_shows_route_reason_and_timeline_without_names(client):
    tid = _loop(client)
    r = client.get("/api/transparency", params={"status": "confirmed"}).json()
    t = next(x for x in r["actions"] if x["task_id"] == tid)
    assert t["agency_id"] == "mcd" and t["why_routed"] and [e["event"] for e in t["timeline"]] == ["created", "accepted", "completed", "confirmed"]
    assert {e["by"] for e in t["timeline"]} == {"Resident", "MCD official"}
    assert "Resident A" not in str(r)                                                   # roles, never names
    assert client.get("/api/transparency", params={"agency_id": "pwd"}).json()["count"] == 0


def test_board_page_is_served_and_free_of_banned_words(client):
    r = client.get("/board")
    assert r.status_code == 200 and "Agency leaderboard" in r.text
    html = (Path(__file__).resolve().parent.parent / "app" / "static" / "board.html").read_text()
    visible = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S)
    assert copy.banned_hits(visible) == []

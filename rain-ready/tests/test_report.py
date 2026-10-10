from datetime import datetime, timezone

from core import copy, planning, report
from .conftest import as_, fresh_photo

FORM = {"lat": 28.6433, "lon": 77.1846, "kind": "blocked_drain"}


def test_gain_range_brackets_point_gain(client):
    top = client.get("/api/reports/ward").json()["top_drains"]
    assert top and len(top) <= 5
    for d in top:
        assert d["gain_h_low"] <= d["gain_h_high"] and d["gain_h"] > 0
    gains = [d["gain_h"] for d in top]
    assert gains == sorted(gains, reverse=True)


def test_counts_match_a_seeded_flow(client):
    first = client.post("/api/incidents", data=FORM, headers=as_("res-1")).json()
    client.post("/api/incidents", data=FORM, headers=as_("res-1"))              # same user, same spot: held
    r = client.get("/api/reports/ward").json()
    assert r["held_reports"] == 1
    mcd = next(a for a in r["tasks_by_agency"] if a["agency_id"] == "mcd")
    assert mcd["open"] == 1 and mcd["overdue"] == 0
    tid = first["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/complete", data={"note": "cleared"}, files=fresh_photo(),
                headers=as_("off-mcd"))
    client.post(f"/api/tasks/{tid}/confirm", json={"ok": True, "note": "looks done"}, headers=as_("res-2"))
    assert client.get("/api/reports/ward").json()["confirmed_cleans_7d"] == 1


def test_markdown_has_banner_and_no_banned_words(client):
    r = client.get("/api/reports/ward?format=md")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/markdown")
    assert copy.SCENARIO_BANNER in r.text and copy.RANGE_NOTE in r.text
    assert not copy.banned_hits(r.text), copy.banned_hits(r.text)
    assert client.get("/api/reports/ward?format=pdf").status_code == 422


def test_empty_facts_still_render():
    facts = {"agencies": [], "tasks": [], "pockets": [], "held_flags": [], "confirmed_7d": 0}
    md = report.to_markdown(report.build(facts, [], [], datetime.now(timezone.utc)))
    assert "No open tasks." in md and "No insights" in md

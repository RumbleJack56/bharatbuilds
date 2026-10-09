from datetime import datetime, timedelta, timezone

from core import copy, insights
from .conftest import as_

NOW = datetime(2026, 10, 10, 12, 0, tzinfo=timezone.utc)


def asset(i, **kw):
    return {"id": i, "name": f"Drain {i}", "agency_id": "mcd", "owner_source": "x", "data_source": "placeholder",
            "silt": 0.0, "report_count": 0, "last_confirmed_clean": (NOW - timedelta(days=5)).date().isoformat(), **kw}


def pocket(i="P1", level="high", ttf=0.5, linked=("A1",)):
    return {"id": i, "name": f"Pocket {i}", "level": level, "time_to_fill_h": ttf, "linked_asset_ids": list(linked),
            "data_source": "placeholder"}


def facts(**kw):
    return {"assets": [], "pockets": [], "tasks": [], "agencies": [], **kw}


def ids(f):
    return [i["id"] for i in insights.build(f, NOW)]


def test_no_owner_with_reports():
    f = facts(assets=[asset("A1", agency_id=None, report_count=2), asset("A2", agency_id=None)])
    out = insights.build(f, NOW)
    assert [i["id"] for i in out] == ["no-owner:A1"] and "placeholder data" in out[0]["text"]


def test_agency_bounces_threshold():
    ag = lambda n: facts(agencies=[{"id": "mcd", "name": "MCD", "bounced": n}])
    assert ids(ag(2)) == [] and ids(ag(3)) == ["bounces:mcd"]


def test_silted_unassigned_drain_in_urgent_pocket():
    f = facts(assets=[asset("A1", silt=0.4)], pockets=[pocket()])
    assert "silted-unassigned:P1" in ids(f)
    f["tasks"] = [{"id": 1, "asset_id": "A1", "status": "accepted", "due_at": None, "agency_id": "mcd"}]
    assert "silted-unassigned:P1" not in ids(f)
    f["tasks"] = []
    f["pockets"] = [pocket(level="watch")]
    assert ids(f) == []


def test_overdue_task_needs_more_than_the_limit():
    t = lambda d: facts(assets=[asset("A1")], tasks=[{"id": 7, "asset_id": "A1", "status": "open", "agency_id": "mcd",
                                                      "due_at": (NOW - timedelta(days=d)).isoformat()}])
    assert ids(t(3)) == [] and ids(t(4)) == ["overdue:7"]


def test_unclean_top_pocket_drain():
    old = (NOW - timedelta(days=90)).date().isoformat()
    f = facts(assets=[asset("A1", last_confirmed_clean=old), asset("A2", last_confirmed_clean=None)],
              pockets=[pocket(linked=("A1", "A2")), pocket("P2", ttf=2.0, linked=("A1",))])
    assert sorted(i for i in ids(f) if i.startswith("unclean")) == ["unclean:A1", "unclean:A2"]
    f["assets"][0]["last_confirmed_clean"] = (NOW - timedelta(days=10)).date().isoformat()
    assert [i for i in ids(f) if i.startswith("unclean")] == ["unclean:A2"]


def test_api_insights_are_clean_text(client):
    r = client.get("/api/insights").json()
    assert r["banner"] == copy.SCENARIO_BANNER and r["insights"]
    for i in r["insights"]:
        assert {"id", "text", "why", "evidence"} <= set(i) and not copy.banned_hits(i["text"] + i["why"])

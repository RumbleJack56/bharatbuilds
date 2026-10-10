import pytest

from core import actions, copy, projection

from .conftest import as_
from .test_flow import photo


def test_action_plan_routes_each_drain_with_a_reason(client):
    r = client.get("/api/actions", params={"top": 20}).json()
    assert r["total"] == 8 and r["banner"]
    by = {a["asset_id"]: a for a in r["actions"]}
    assert by["DR-RN-002"]["type"] == "clarify_owner" and by["DR-RN-002"]["route"]["needs_coordinator"]
    top = r["actions"][0]
    assert top["type"] in ("clean", "inspect") and top["route"]["agency_id"] and top["evidence"] and top["gain_h_high"] >= top["gain_h_low"]
    assert all(not copy.banned_hits(a["text"]) for a in r["actions"])


def test_dispatched_actions_show_their_task(client):
    client.post("/api/incidents", data={"lat": 28.6433, "lon": 77.1846, "kind": "blocked_drain"}, files=photo(), headers=as_("res-1"))
    a = next(x for x in client.get("/api/actions", params={"top": 20}).json()["actions"] if x["asset_id"] == "DR-RN-001")
    assert a["status"] == "dispatched" and a["task_id"] and a["task_status"] == "open"


def test_projection_matrix_and_silt_grow_with_days(client):
    r = client.get("/api/projection", params={"rain": "20,35", "horizon": "0,60"}).json()
    assert [(s["rain_mm_h"], s["horizon_days"]) for s in r["scenarios"]] == [(20, 0), (35, 0), (20, 60), (35, 60)]
    p = {x["id"]: x for x in r["scenarios"][1]["pockets"]}["LP-RN-1"]
    assert p["utilisation_pct"] > 100 and p["time_to_fill_h_low"] <= p["time_to_fill_h"] <= p["time_to_fill_h_high"]
    assert r["silt_curve"][0]["silt_fraction"] == 0 and r["silt_curve"][-1]["silt_fraction"] > r["silt_curve"][1]["silt_fraction"]
    assert client.get("/api/projection", params={"rain": "999"}).status_code == 422


def test_asset_detail_has_provenance_and_future_silt(client):
    r = client.get("/api/assets/DR-RN-004").json()
    assert r["asset"]["last_confirmed_clean"] == "2026-09-20" and r["days_since_clean"] is not None
    assert r["silt_if_not_cleaned"]["90"] > r["silt_if_not_cleaned"]["0"] and r["pockets"] == []
    linked = client.get("/api/assets/DR-RN-001").json()
    assert linked["pockets"][0]["id"] == "LP-RN-1" and linked["asset"]["data_source"] == "placeholder"
    assert linked["days_since_clean"] is None and linked["cleaning_history"] == []
    assert client.get("/api/assets/NOPE").status_code == 404


def test_silt_projection_is_flat_for_a_drain_never_cleaned():
    assert projection.silt_at(None, __import__("datetime").date(2026, 10, 1), 0) == projection.silt_at(None, __import__("datetime").date(2026, 10, 1), 90)


@pytest.mark.parametrize("silt,gain,owner,kind", [(0.4, 1.0, "mcd", "clean"), (0.1, 0.8, "mcd", "inspect"), (0.4, 0.0, "mcd", "monitor"), (0.4, 1.0, None, "clarify_owner")])
def test_action_type_rules(silt, gain, owner, kind):
    from datetime import date
    asset = {"id": "A", "name": "Drain A", "silt": silt, "report_count": 2, "agency_id": owner, "owner_source": "PWD road inventory RD-1. rule",
             "last_confirmed_clean": None, "data_source": "derived", "confidence": "low"}
    a = actions.one(asset, {"gain_h": gain, "lo": gain * .8, "hi": gain * 1.2, "pocket_id": "P"}, {"name": "Pocket", "level": "high", "time_to_fill_h": 0.4},
                    None, "MCD", date(2026, 10, 10), 7)
    assert a["type"] == kind and a["status"] == "proposed"
    assert a["route"]["needs_coordinator"] == (owner is None)

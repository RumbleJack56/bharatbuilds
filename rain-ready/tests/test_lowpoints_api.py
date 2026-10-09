"""API-level checks for the simulator, including the evidence -> scenario loop. Uses a throwaway DB."""
from datetime import date

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from app import config, db
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "t.db"))
    monkeypatch.setattr(db, "_con", None)
    from app.main import app
    with TestClient(app) as c:
        yield c
    monkeypatch.setattr(db, "_con", None)


def sim(c, rain, state):
    r = c.post("/api/lowpoints/simulate", json={"rain_mm_h": rain, "drain_state": state})
    assert r.status_code == 200
    return {x["id"]: x for x in r.json()["results"]}, r.json()


def test_demo_values_for_lp_rn_1_at_35mm(client):
    clean, _ = sim(client, 35, "clean")
    silted, _ = sim(client, 35, "silted")
    cur, body = sim(client, 35, "current")
    assert clean["LP-RN-1"]["level"] == "watch" and 4.0 < clean["LP-RN-1"]["time_to_fill_h"] < 4.6
    assert silted["LP-RN-1"]["level"] == "elevated" and 1.0 < silted["LP-RN-1"]["time_to_fill_h"] < 1.6
    assert cur["LP-RN-1"]["level"] == "high" and 0.6 < cur["LP-RN-1"]["time_to_fill_h"] < 1.0
    assert "Scenario, not a forecast" in body["banner"]


def test_confirmed_cleaning_slows_the_linked_pocket(client):
    from app.db import get_db
    before, _ = sim(client, 35, "current")
    db = get_db()
    db.execute("UPDATE assets SET last_confirmed_clean=? WHERE id='DR-RN-001'", (date.today().isoformat(),))
    db.commit()
    after, _ = sim(client, 35, "current")
    clean, _ = sim(client, 35, "clean")
    b, a, c = before["LP-RN-1"], after["LP-RN-1"], clean["LP-RN-1"]
    assert a["time_to_fill_h"] > b["time_to_fill_h"] * 2          # about 0.75 h -> about 2 h
    assert a["time_to_fill_h"] < c["time_to_fill_h"]              # not fully "clean": upstream pockets LP-RN-2/3 still spill into it
    assert a["level"] == "elevated" and b["level"] == "high"
    assert a["silt_fraction_used"] == 0.0 and after["LP-RN-2"]["time_to_fill_h"] == before["LP-RN-2"]["time_to_fill_h"]


def test_spill_order_is_consistent(client):
    res, body = sim(client, 60, "current")
    ids = [x["id"] for x in body["results"]]
    assert res["LP-RN-1"]["time_to_fill_h"] >= res["LP-RN-2"]["time_to_fill_h"]    # saucer receives spill from RN-2 and RN-3
    assert body["alert"]["active"] and "LP-RN-2" in body["alert"]["high_ids"]
    assert [x["fill_order"] for x in body["results"] if x["fill_order"]] == sorted(x["fill_order"] for x in body["results"] if x["fill_order"])
    assert len(ids) == 5


def test_rejects_bad_input(client):
    assert client.post("/api/lowpoints/simulate", json={"rain_mm_h": -1}).status_code == 422
    assert client.post("/api/lowpoints/simulate", json={"rain_mm_h": 40, "drain_state": "magic"}).status_code == 422


def test_capture_and_replay_endpoints(client):
    p = client.get("/api/capture/presets").json()
    assert "Experimental" in p["banner"] and all(x["water_table_verified"] is False for x in p["presets"])
    shallow = client.post("/api/capture/plan", json={"roof_m2": 600, "water_table_m": 3.5, "soil": "loam"}).json()
    assert shallow["decision"] == "STORE_REUSE" and shallow["rule_id"] == "R2"
    r = client.get("/api/replay").json()
    assert r["events"][0]["forecast_day_before_mm_day"] == 3.8
    assert "did not flag anything" in r["timeline"][-1]["text"] and r["hindsight"]["tier_if_warning_entered"] == "P1"

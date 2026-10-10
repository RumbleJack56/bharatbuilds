"""The shipped seed (data/seed.json) boots the app and the loop works at the real places."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import config, db
from core import copy

from .conftest import as_
from .test_public import photo

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture()
def real(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "r.db"))
    monkeypatch.setattr(config, "PHOTO_DIR", str(tmp_path / "p"))
    monkeypatch.setattr(config, "SEED_PATH", str(ROOT / "data" / "seed.json"))
    db.reset_connection()
    from app.main import app
    with TestClient(app) as c:
        yield c
    db.reset_connection()


def test_real_seed_loads_with_the_evidence_base(real):
    m = real.get("/api/map").json()
    assert len(m["assets"]) == 9 and len(m["pockets"]) == 6
    assert not [a for a in m["assets"] + m["pockets"] if a["data_source"] == "placeholder"]
    assert real.get("/api/health").json()["router_errors"] == {}
    s = real.get("/api/city/summary").json()
    assert s["roads_in_inventory"] == 1297 and s["location_dates"] > 1000
    own = {a["agency_id"]: a for a in real.get("/api/accountability").json()["agencies"]}
    assert own["pwd"]["assets_owned"] == 4 and own["mcd"]["assets_owned"] == 2 and own[None]["assets_owned"] == 3


@pytest.mark.parametrize("lat,lon,asset,agency", [(28.6440, 77.1889, "DR-KBM-PUSA", "pwd"), (28.63925, 77.18386, "DR-DN-BAZ", "mcd"),
                                                   (28.64155, 77.17392, "DR-PRB-EPN", "pwd"), (28.6456, 77.19564, "DR-OSM-A", None)])
def test_a_report_at_each_real_place_links_and_routes(real, lat, lon, asset, agency):
    r = real.post("/api/incidents", data={"lat": lat, "lon": lon, "kind": "blocked_drain"}, files=photo(), headers=as_("res-1")).json()
    assert r["linked_asset"] == asset and r["distance_m"] <= config.LINK_RADIUS_M
    t = real.get(f"/api/tasks/{r['task_id']}").json()
    assert t["agency_id"] == agency


def test_actions_and_projection_on_the_real_pockets(real):
    a = real.get("/api/actions", params={"top": 20}).json()
    assert a["total"] == 9 and {x["type"] for x in a["actions"]} <= {"clean", "inspect", "clarify_owner", "monitor"}
    assert sum(1 for x in a["actions"] if x["route"]["needs_coordinator"]) == 3        # the three OSM culverts
    p = real.get("/api/projection", params={"rain": "35", "horizon": "0"}).json()["scenarios"][0]["pockets"]
    orn = next(x for x in p if x["id"] == "LP-ORN")
    assert orn["utilisation_pct"] > 100 and orn["capacity_mm_h"] < 17.6 and orn["time_to_fill_h_low"] <= orn["time_to_fill_h"]


def test_generated_text_has_no_banned_words():
    eda = json.loads((ROOT / "data" / "consolidated" / "eda.json").read_text())
    texts = [i["text"] + i["why"] + i["action"]["text"] for i in eda["insights"]] + [a["text"] for a in eda["actions"]]
    seed = json.loads((ROOT / "data" / "seed.json").read_text())
    texts += [p["note"] for p in seed["pockets"]] + [a.get("note") or "" for a in seed["assets"]]
    assert [h for t in texts for h in copy.banned_hits(t)] == []


def test_reference_rain_story_on_the_real_seed(real):
    """The demo headline at the reference rain: the pilot ward's drain leads, and cleaning gives a clear gain."""
    from core import planning
    assert real.get("/api/map").json()["reference_rain_mm_h"] == planning.REF_RAIN_MM_H == 25.0
    top = real.get("/api/actions", params={"top": 1}).json()["actions"][0]
    assert top["asset_id"] == "DR-DN-BAZ" and top["pocket_id"] == "LP-ORN"
    lo, hi = top["gain_h_low"], top["gain_h_high"]
    assert 0 <= lo <= top["gain_h"] <= hi
    assert top["gain_h"] >= 3
    rains = [s["rain_mm_h"] for s in real.get("/api/projection").json()["scenarios"]]
    assert 25.0 in rains and 35.0 in rains


def test_scenario_notes_follow_the_reference_rain(real):
    from core import planning
    stamp = f"{planning.REF_RAIN_MM_H:g} mm/h"
    assert stamp in real.get("/api/impact").json()["fill_time_gained_note"]
    assert stamp in real.get("/api/transparency").json()["gain_note"]


def test_gain_range_contains_the_point_estimate_at_every_rain(real):
    """A point value outside its own range would put a contradiction on screen."""
    from app import service
    from core import planning
    con = db.get_db()
    pockets, silt = service.pocket_rows(con), service.asset_silt(con)
    for rain in (15, 20, 22.5, 25, 30, 35, 50):
        for a in (r["id"] for r in con.execute("SELECT id FROM assets")):
            g = planning.gain_if_cleaned(pockets, silt, a, rain=rain)["gain_h"]
            lo, hi = planning.gain_range(pockets, silt, a, rain=rain)
            assert lo <= g <= hi, (rain, a, lo, g, hi)

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

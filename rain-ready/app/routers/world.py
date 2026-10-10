"""Read-only world: personas, map data, scenario simulator."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import copy, planning
from core import lowpoints as lp

from .. import clock, service
from ..auth import current_user
from ..db import get_db

router = APIRouter(prefix="/api")


@router.get("/users")
def users(db=Depends(get_db)):
    return {"users": [dict(r) for r in db.execute("SELECT * FROM users ORDER BY role, id")], "note": copy.DEMO_LOGIN}


@router.get("/me")
def me(user=Depends(current_user)):
    return dict(user)


def run_scenario(db, rain: float, state: str, at_h: float = 1.0):
    pockets = service.pocket_rows(db)
    built = planning.build_pockets(pockets, service.asset_silt(db), state)
    res = lp.simulate(built, rain, at_h)
    rng = planning.fill_time_range(built, rain)
    by = {p["id"]: p for p in pockets}
    for r in res:
        p = by[r["id"]]
        r["time_to_fill_h_low"], r["time_to_fill_h_high"] = rng[r["id"]]
        r.update(lat=p["lat"], lon=p["lon"], catchment_ha=p["catchment_ha"], storage_m3=p["storage_m3"],
                 runoff_c=p["runoff_c"], drain_mm_h=p["drain_mm_h"], exposed_assets=p["exposed_assets"],
                 linked_asset_ids=p["linked_asset_ids"], data_source=p["data_source"], confidence=p["confidence"])
    return res


@router.get("/map")
def map_(db=Depends(get_db)):
    assets = []
    silt = service.asset_silt(db)
    for r in db.execute("SELECT a.*, g.name AS agency_name FROM assets a LEFT JOIN agencies g ON g.id=a.agency_id"):
        d = dict(r)
        d["agency_name"] = d["agency_name"] or copy.NO_OWNER
        d["silt_estimate"] = round(silt[d["id"]], 3)
        assets.append(d)
    tasks = [dict(r) for r in db.execute(
        "SELECT t.id,t.asset_id,t.status,t.rank_score,t.gain_h,t.agency_id,a.lat,a.lon,a.name AS asset_name,a.last_confirmed_clean "
        "FROM tasks t JOIN assets a ON a.id=t.asset_id "
        "WHERE t.status NOT IN ('confirmed','rejected')")]
    sites = [dict(r) for r in db.execute("SELECT id,name,lat,lon FROM sites")]
    return {"pockets": run_scenario(db, planning.REF_RAIN_MM_H, "current"), "assets": assets, "tasks": tasks,
            "sites": sites, "reference_rain_mm_h": planning.REF_RAIN_MM_H, "banner": copy.SCENARIO_BANNER}


class SimIn(BaseModel):
    rain_mm_h: float = Field(ge=0, le=250)
    drain_state: str = Field(default="current", pattern="^(clean|silted|current)$")
    at_h: float = Field(default=1.0, ge=0, le=24)


@router.post("/simulate")
def simulate(body: SimIn, db=Depends(get_db)):
    try:
        res = run_scenario(db, body.rain_mm_h, body.drain_state, body.at_h)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {"scenario": body.model_dump(), "results": res, "banner": copy.SCENARIO_BANNER, "range_note": copy.RANGE_NOTE, "date": clock.today().isoformat()}


@router.get("/agencies")
def agencies(db=Depends(get_db)):
    return {"agencies": [dict(r) for r in db.execute("SELECT * FROM agencies ORDER BY id")]}

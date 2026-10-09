"""Low Point scenario simulator endpoints. Owner: dev#3. Logic lives in core/lowpoints.py (pure, tested).
SCENARIO ONLY: parameters are hand-placed and illustrative. Never present as a forecast or as depth."""
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import lowpoints as lp
from core import scoring

from ..db import get_db

router = APIRouter(prefix="/api")

BANNER = ("Scenario, not a forecast. Pocket size, catchment and drain capacity are illustrative parameters. "
          "Unofficial. Official warnings: IMD / NDMA Sachet.")


def _d(s):
    return date.fromisoformat(s) if s else None


def _asset_silt(db, asset_ids: list[str]) -> tuple[float, str]:
    """Worst silt fraction among linked assets using the same prior/measurement logic as scoring."""
    best, basis = 0.0, "none"
    for aid in asset_ids:
        a = db.execute("SELECT * FROM assets WHERE id=?", (aid,)).fetchone()
        if not a:
            continue
        st = scoring.AssetState(last_confirmed_clean=_d(a["last_confirmed_clean"]), silt_measured=a["silt_measured"],
                                silt_measured_on=_d(a["silt_measured_on"]))
        fill, b = scoring.silt_fill(st, date.today())
        if fill >= best:
            best, basis = fill, b
    return best, basis


def _pockets(db, drain_state: str):
    pockets, meta = [], {}
    for r in db.execute("SELECT * FROM lowpoints"):
        ids = json.loads(r["linked_asset_ids"])
        cur, basis = _asset_silt(db, ids)
        silt = {"clean": 0.0, "silted": lp.SILTED_PRESET_FRACTION, "current": cur}[drain_state]
        pockets.append(lp.Pocket(r["id"], r["name"], r["kind"], r["catchment_ha"], r["runoff_c"], r["storage_m3"],
                                 r["drain_mm_h"], r["spills_to"], silt))
        meta[r["id"]] = {"lat": r["lat"], "lon": r["lon"], "silt_fraction_used": round(silt, 3),
                         "silt_basis": basis if drain_state == "current" else drain_state,
                         "catchment_ha": r["catchment_ha"], "storage_m3": r["storage_m3"], "runoff_c": r["runoff_c"],
                         "drain_mm_h": r["drain_mm_h"], "linked_asset_ids": ids,
                         "data_source": r["data_source"], "confidence": r["confidence"], "note": r["note"]}
    return pockets, meta


@router.get("/lowpoints")
def list_lowpoints(db=Depends(get_db)):
    _, meta = _pockets(db, "current")
    rows = []
    for r in db.execute("SELECT id,name,kind,spills_to FROM lowpoints"):
        rows.append({"id": r["id"], "name": r["name"], "kind": r["kind"], "spills_to": r["spills_to"], **meta[r["id"]]})
    return {"lowpoints": rows, "banner": BANNER}


class SimIn(BaseModel):
    rain_mm_h: float = Field(ge=0, le=250)
    drain_state: str = Field(default="current", pattern="^(clean|silted|current)$")
    at_h: float = Field(default=1.0, ge=0, le=24)


@router.post("/lowpoints/simulate")
def simulate(body: SimIn, db=Depends(get_db)):
    pockets, meta = _pockets(db, body.drain_state)
    try:
        results = lp.simulate(pockets, body.rain_mm_h, body.at_h)
    except ValueError as e:
        raise HTTPException(422, str(e))
    for r in results:
        r.update(meta[r["id"]])
    highs = [r["id"] for r in results if r["level"] == "high"]
    return {"scenario": body.model_dump(), "results": results,
            "alert": {"active": bool(highs), "high_ids": highs,
                      "level": "high" if highs else ("elevated" if any(r["level"] == "elevated" for r in results) else "none")},
            "banner": BANNER}

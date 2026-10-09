"""Forecast-miss timeline. Owner: dev#4. Real model numbers (data/replay_2024.json), pre-written text, and a
hindsight score computed by the real scoring code. It is a RECONSTRUCTION, never 'the system flagged this'."""
import json
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends

from core import scoring

from ..db import get_db

router = APIRouter(prefix="/api")
DATA = Path(__file__).resolve().parent.parent.parent / "data" / "replay_2024.json"
ASSET_ID = "DR-RN-001"


@router.get("/replay")
def replay(db=Depends(get_db)):
    d = json.loads(DATA.read_text())
    a = db.execute("SELECT * FROM assets WHERE id=?", (ASSET_ID,)).fetchone()
    hindsight = None
    if a:
        # inquiry-reported state: no confirmed cleaning on record
        st = scoring.AssetState(hotspot_listed=bool(a["hotspot_listed"]), standing_water_last_monsoon=bool(a["standing_water_last_monsoon"]),
                                source_near_m=a["source_near_m"], consequence=a["consequence"], last_confirmed_clean=None)
        v, basis, comp = scoring.vulnerability(st, date(2024, 7, 26))
        hindsight = {"asset_id": a["id"], "asset_name": a["name"], "v": v, "basis": basis, "components": comp,
                     "tier_if_warning_entered": scoring.tier(v, True), "state": "no confirmed cleaning on record (inquiry-reported)"}
    e = d["events"][0]
    timeline = [
        {"step": 1, "label": "Day before", "text": f"A free gridded model forecast about {e['forecast_day_before_mm_day']} mm for the day."},
        {"step": 2, "label": "The day", "text": f"Reported evening rainfall: {e['reported_mm']} mm ({e['reported_basis']}; verify)."},
        {"step": 3, "label": "Outcome", "text": f"{e['reported_outcome']}. Reported by press and the inquiry; verify."},
    ]
    if hindsight:
        timeline.append({"step": 4, "label": "Hindsight scenario",
                         "text": (f"Using the drain state the inquiry reported (no confirmed cleaning), the Rain-Ready score for the nearest drain "
                                  f"would be {hindsight['v']} (tier {hindsight['tier_if_warning_entered']} if an official warning had been entered). "
                                  "This is a reconstruction. The system did not exist and did not flag anything at the time.")})
    return {**d, "timeline": timeline, "hindsight": hindsight,
            "footer": "Unofficial. Information only. Official warnings: IMD / NDMA Sachet."}

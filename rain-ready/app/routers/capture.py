"""Rain Capture planner endpoints. Owner: dev#4. Logic lives in core/m4_rules.py (pure, tested). EXPERIMENTAL."""
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core import m4_rules

router = APIRouter(prefix="/api")
PRESETS = Path(__file__).resolve().parent.parent.parent / "data" / "capture_presets.json"


@router.get("/capture/presets")
def presets():
    d = json.loads(PRESETS.read_text())
    return {"presets": d["presets"], "banner": m4_rules.BANNER}


class PlanIn(BaseModel):
    roof_m2: float = Field(gt=0, le=100000)
    water_table_m: float | None = Field(default=None, ge=0, le=200)
    in_floodplain: bool = False
    soil: str | None = Field(default=None, pattern="^(sandy_loam|loam|clay_loam)$")
    infiltration_mm_h: float | None = Field(default=None, gt=0, le=500)
    has_vehicular_or_wash_runoff: bool = False
    nearest_septic_or_sewer_m: float | None = Field(default=None, ge=0)
    poor_groundwater_quality: bool = False
    water_table_verified: bool = False


@router.post("/capture/plan")
def plan(body: PlanIn):
    d = body.model_dump()
    roof, wt = d.pop("roof_m2"), d.pop("water_table_m")
    try:
        return m4_rules.plan(roof, wt, **d)
    except ValueError as e:
        raise HTTPException(422, str(e))

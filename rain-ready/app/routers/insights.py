"""Rule-based insights: facts about the action list. Pre-written text, no model."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from core import copy, insights

from .. import facts
from ..db import get_db

router = APIRouter(prefix="/api")


@router.get("/insights")
def get_insights(db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    return {"insights": insights.build(facts.ward_facts(db, now), now), "banner": copy.SCENARIO_BANNER,
            "generated_at": now.isoformat(timespec="seconds")}

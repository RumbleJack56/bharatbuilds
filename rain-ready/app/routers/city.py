"""Delhi evidence base: what the records say about waterlogging across the city, with insights and actions. Public, read only."""
import json

from fastapi import APIRouter, Depends, HTTPException, Query

from core import copy

from ..db import get_db

router = APIRouter(prefix="/api/city")
SOURCE = ("Delhi Traffic Police waterlogging lists in the Flood Control Order 2025 (Dept of Revenue, GNCTD); "
          "PWD Delhi road inventory. Owner by road name and the 60 ft Right of Way rule; names are matched, not verified.")
NOTE = "Counts are floors: the lists name places that disrupted traffic, mostly arterial roads."


def _insight(r) -> dict:
    return {"id": r["id"], "kind": r["kind"], "priority": r["priority"], "text": r["text"], "why": r["why"],
            "evidence": json.loads(r["evidence"]), "action": {"type": r["action_type"], "text": r["action_text"]}}


@router.get("/insights")
def insights(db=Depends(get_db)):
    rows = db.execute("SELECT * FROM eda_insights ORDER BY priority, id").fetchall()
    return {"insights": [_insight(r) for r in rows], "source": SOURCE, "note": NOTE, "banner": copy.SCENARIO_BANNER}


@router.get("/summary")
def summary(db=Depends(get_db)):
    n = lambda q: db.execute(q).fetchone()[0]
    by_year = {r["y"]: r["c"] for r in db.execute("SELECT substr(event_date,1,4) y, COUNT(*) c FROM ref_waterlog_events GROUP BY y ORDER BY y")}
    by_month = {int(r["m"]): r["c"] for r in db.execute("SELECT substr(event_date,6,2) m, COUNT(*) c FROM ref_waterlog_events GROUP BY m ORDER BY m")}
    owner = {(r["agency_id"] or "unresolved"): r["c"] for r in db.execute(
        "SELECT agency_id, SUM(n_dates) c FROM ref_places GROUP BY agency_id")}
    return {"location_dates": n("SELECT COUNT(*) FROM ref_waterlog_events"), "days": n("SELECT COUNT(DISTINCT event_date) FROM ref_waterlog_events"),
            "places": n("SELECT COUNT(*) FROM ref_places"), "chronic_places": n("SELECT COUNT(*) FROM ref_places WHERE chronic=1"),
            "roads_in_inventory": n("SELECT COUNT(*) FROM ref_roads"), "by_year": by_year, "by_month": by_month,
            "location_dates_by_owner": owner, "source": SOURCE, "note": NOTE}


@router.get("/places")
def places(chronic: bool = False, min_dates: int = Query(1, ge=1), owner: str | None = None, road: str | None = None,
           limit: int = Query(30, ge=1, le=200), db=Depends(get_db)):
    q, args, where = "SELECT * FROM ref_places", [], ["n_dates >= ?"]
    args.append(min_dates)
    if chronic:
        where.append("chronic=1")
    if owner == "unresolved":
        where.append("agency_id IS NULL")
    elif owner:
        where.append("agency_id=?"); args.append(owner)
    if road:
        where.append("lower(road) LIKE ?"); args.append(f"%{road.lower()}%")
    rows = db.execute(f"{q} WHERE {' AND '.join(where)} ORDER BY n_dates DESC, n_years DESC, key LIMIT ?", (*args, limit)).fetchall()
    return {"places": [dict(r, years=json.loads(r["years"]), rows=json.loads(r["rows"]), chronic=bool(r["chronic"])) for r in rows],
            "source": SOURCE, "note": NOTE}


@router.get("/roads/{code}")
def road(code: str, db=Depends(get_db)):
    r = db.execute("SELECT * FROM ref_roads WHERE asset_code=?", (code,)).fetchone()
    if not r:
        raise HTTPException(404, "road not in the PWD inventory")
    d = dict(r)
    d["pwd_by_rule"] = (d["row_m"] or 0) >= 18.29
    d["rule"] = "A road with a Right of Way of 60 ft (18.29 m) or more has its drains with PWD (2012 notification, 2020 affidavit to the NGT)."
    return d

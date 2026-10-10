"""Action plan, scenario projection and drain detail. Public, read only: the plan is dispatched through /api/plan/generate."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from core import actions, copy, planning, projection
from core import lowpoints as lp

from .. import clock, config, facts, service
from ..db import get_db

router = APIRouter(prefix="/api")


def _floats(s: str, default: tuple[float, ...], limit: int = 5) -> tuple[float, ...]:
    try:
        vals = tuple(float(x) for x in s.split(",") if x.strip())
    except ValueError:
        raise HTTPException(422, "send numbers separated by commas")
    return (vals or default)[:limit]


@router.get("/actions")
def action_plan(top: int = Query(10, ge=1, le=50), db=Depends(get_db)):
    """One action per drain: clean, inspect, find the owner, or leave. Each has its route, reason and evidence."""
    now = clock.now()
    f = facts.ward_facts(db, now)
    pockets = service.pocket_rows(db)
    silt = {a["id"]: a["silt"] for a in f["assets"]}
    gains = {}
    for a in f["assets"]:
        g = planning.gain_if_cleaned(pockets, silt, a["id"])
        lo, hi = planning.gain_range(pockets, silt, a["id"])
        gains[a["id"]] = {**g, "lo": lo, "hi": hi}
    by_pocket = {p["id"]: p for p in f["pockets"]}
    live = {}
    for t in sorted(f["tasks"], key=lambda t: t["id"]):
        if t["status"] in service.ACTIVE:
            live[t["asset_id"]] = t
    names = {g["id"]: g["name"] for g in f["agencies"]}
    plan = actions.plan(f["assets"], gains, by_pocket, live, names, now.date(), config.TASK_DUE_DAYS)
    return {"actions": plan[:top], "total": len(plan), "banner": copy.SCENARIO_BANNER, "range_note": copy.RANGE_NOTE,
            "how_routed": "An action goes to the agency named by the drain's owner record. A drain with no owner goes to the ward coordinator, "
                          "who assigns it. An official can bounce a wrong owner with a reason, and the bounce is logged.",
            "generated_at": now.isoformat(timespec="seconds")}


@router.get("/projection")
def scenario_projection(rain: str = ",".join(f"{r:g}" for r in projection.RAINS), horizon: str = "0,30,60,90", db=Depends(get_db)):
    """Per pocket and rain: runoff, how much of the drain is used, fill time as a range. Per horizon: silt if no cleaning happens."""
    rains = _floats(rain, projection.RAINS)
    horizons = tuple(int(h) for h in _floats(horizon, projection.HORIZONS))
    if any(r < 0 or r > 250 for r in rains) or any(h < 0 or h > 365 for h in horizons):
        raise HTTPException(422, "rain must be 0 to 250 mm/h and horizon 0 to 365 days")
    clean = {r["id"]: (clock.today().__class__.fromisoformat(r["last_confirmed_clean"]) if r["last_confirmed_clean"] else None)
             for r in db.execute("SELECT id, last_confirmed_clean FROM assets")}
    out = projection.project(service.pocket_rows(db), clean, clock.today(), rains, horizons)
    return {"scenarios": out, "silt_curve": projection.silt_curve(), "reference_rain_mm_h": planning.REF_RAIN_MM_H,
            "meaning": {"utilisation_pct": "Runoff the catchment sends to the drain, as a share of what the drain can carry now. Above 100 means the pocket fills.",
                        "silt_fraction": "Estimated share of the drain's depth filled with silt, from days since the last confirmed clean."},
            "banner": copy.SCENARIO_BANNER, "range_note": copy.RANGE_NOTE}


@router.get("/assets/{asset_id}")
def asset_detail(asset_id: str, db=Depends(get_db)):
    """Everything the system knows about one drain: provenance, owner and its source, cleaning history, silt now and later."""
    a = db.execute("SELECT a.*, g.name AS agency_name FROM assets a LEFT JOIN agencies g ON g.id=a.agency_id WHERE a.id=?", (asset_id,)).fetchone()
    if not a:
        raise HTTPException(404, "drain not found")
    today = clock.today()
    last = a["last_confirmed_clean"]
    last_d = today.__class__.fromisoformat(last) if last else None
    history = []
    for t in db.execute("SELECT * FROM tasks WHERE asset_id=? AND status IN ('done','confirmed','disputed') ORDER BY id", (asset_id,)):
        ev = {e["event"]: e["at"] for e in db.execute("SELECT event, at FROM task_events WHERE task_id=? ORDER BY id", (t["id"],))}
        history.append({"task_id": t["id"], "status": t["status"], "completed_at": ev.get("completed"),
                        "verified_at": ev.get("confirmed") or ev.get("disputed"), "gain_h": t["gain_h"], "agency_id": t["agency_id"]})
    pockets = [p for p in service.pocket_rows(db) if asset_id in p["linked_asset_ids"]]
    silt = service.asset_silt(db)
    sim = {r["id"]: r for r in lp.simulate(planning.build_pockets(service.pocket_rows(db), silt, "current"), planning.REF_RAIN_MM_H)}
    return {"asset": {k: a[k] for k in ("id", "type", "name", "lat", "lon", "agency_id", "agency_name", "owner_source", "data_source",
                                        "confidence", "citation", "note", "last_confirmed_clean")} | {"agency_name": a["agency_name"] or copy.NO_OWNER},
            "silt_now": round(silt[asset_id], 3), "days_since_clean": (today - last_d).days if last_d else None,
            "silt_if_not_cleaned": {str(h): round(projection.silt_at(last_d, today, h), 3) for h in (0, 30, 60, 90)},
            "cleaning_history": history,
            "reports": db.execute("SELECT COUNT(*) FROM incidents WHERE asset_id=?", (asset_id,)).fetchone()[0],
            "pockets": [{"id": p["id"], "name": p["name"], "level": sim[p["id"]]["level"], "time_to_fill_h": sim[p["id"]]["time_to_fill_h"],
                         "data_source": p["data_source"], "citation": p.get("citation")} for p in pockets],
            "banner": copy.SCENARIO_BANNER, "silt_note": "Silt is an estimate from time since the last confirmed clean, not a measurement."}

"""Where to clean, who owns it, who did it: ranked plan, accountability chart, impact numbers, capture list."""
from statistics import median

from fastapi import APIRouter, Depends, HTTPException

from core import copy, m4_rules, planning

from .. import service
from ..auth import need
from ..db import get_db

router = APIRouter(prefix="/api")


@router.post("/plan/generate")
def generate(top: int = 5, user=Depends(need("admin")), db=Depends(get_db)):
    """Create tasks for the top-ranked assets (by fill time gained) that have no live task yet."""
    pockets, silt = service.pocket_rows(db), service.asset_silt(db)
    ranked = sorted(((planning.gain_if_cleaned(pockets, silt, a["id"])["gain_h"], a["id"])
                     for a in db.execute("SELECT id FROM assets")), reverse=True)
    created = []
    for gain, aid in ranked[:max(1, min(top, 20))]:
        if gain <= 0:
            continue
        tid, new = service.ensure_task(db, aid, user["id"], from_report=False)
        if new:
            created.append(tid)
    db.commit()
    return {"created_task_ids": created, "banner": copy.SCENARIO_BANNER}


def _clock_start(t: dict, ev: list, aid, until: str) -> str:
    """When this agency received the task: its latest created, reassigned or assigned event before `until`."""
    starts = [e["at"] for e in ev if e["event"] in ("created", "reassigned", "assigned") and e["agency_id"] == aid and e["at"] <= until]
    return max(starts) if starts else t["created_at"]


def _hours(a: str, b: str) -> float:
    from datetime import datetime
    return (datetime.fromisoformat(b) - datetime.fromisoformat(a)).total_seconds() / 3600


@router.get("/accountability")
def accountability(db=Depends(get_db)):
    from .tasks import _overdue
    tasks = [dict(r) for r in db.execute("SELECT * FROM tasks")]
    events = [dict(r) for r in db.execute("SELECT * FROM task_events ORDER BY id")]
    ev_by: dict[int, list] = {}
    for e in events:
        ev_by.setdefault(e["task_id"], []).append(e)
    rows = []
    groups = [(a["id"], a["name"]) for a in db.execute("SELECT * FROM agencies")] + [(None, copy.NO_OWNER)]
    for aid, name in groups:
        mine = [t for t in tasks if t["agency_id"] == aid]
        counts = {s: sum(1 for t in mine if t["status"] == s) for s in ("open", "accepted", "rejected", "done", "confirmed", "disputed")}
        bounced = sum(1 for e in events if e["event"] == "bounced" and e["agency_id"] == aid)
        accept_h, done_h = [], []
        for t in mine:
            ev = ev_by.get(t["id"], [])
            acc = next((e for e in ev if e["event"] == "accepted" and e["agency_id"] == aid), None)
            dn = next((e for e in ev if e["event"] == "completed" and e["agency_id"] == aid), None)
            if acc:
                accept_h.append(_hours(_clock_start(t, ev, aid, acc["at"]), acc["at"]))
            if dn:
                done_h.append(_hours(_clock_start(t, ev, aid, dn["at"]), dn["at"]))
        owned = db.execute("SELECT COUNT(*) FROM assets WHERE agency_id IS ?", (aid,)).fetchone()[0]
        rows.append({"agency_id": aid, "agency_name": name, "assets_owned": owned, "tasks": counts,
                     "overdue": sum(1 for t in mine if _overdue(t)), "bounced_away": bounced,
                     "median_hours_to_accept": round(median(accept_h), 2) if accept_h else None,
                     "median_hours_to_complete": round(median(done_h), 2) if done_h else None})
    return {"agencies": rows, "note": "Agency level only. Source of each owner is on the asset. 'No owner found' is a finding."}


def _opportunities(db) -> list[dict]:
    out = []
    for s in db.execute("SELECT * FROM sites"):
        try:
            r = m4_rules.plan(s["roof_m2"], s["water_table_m"], in_floodplain=bool(s["in_floodplain"]), soil=s["soil"],
                              has_vehicular_or_wash_runoff=bool(s["wash_runoff"]), nearest_septic_or_sewer_m=s["nearest_septic_m"],
                              water_table_verified=bool(s["water_table_verified"]))
        except ValueError:
            continue
        use = {"STORE_REUSE": "store_reuse", "DETAIN_ONLY": "detain"}.get(r["decision"], "recharge" if r["decision"].startswith(("PIT", "SHALLOW")) else "needs_data_or_tank")
        out.append({"site_id": s["id"], "name": s["name"], "lat": s["lat"], "lon": s["lon"], "decision": r["decision"],
                    "use": use, "rule_id": r["rule_id"], "reason": r["reason"], "annual_m3": r["capture"]["annual_roof_capture_m3"],
                    "structure": r["structure"], "warnings": r["warnings"], "data_source": s["data_source"]})
    return out


@router.get("/opportunities")
def opportunities(db=Depends(get_db)):
    return {"sites": _opportunities(db), "banner": m4_rules.BANNER}


@router.get("/impact")
def impact(db=Depends(get_db)):
    n = lambda q: db.execute(q).fetchone()[0]
    opps = _opportunities(db)
    by_use: dict[str, float] = {}
    for o in opps:
        by_use[o["use"]] = round(by_use.get(o["use"], 0) + o["annual_m3"], 1)
    return {
        "ownership": {"assets": n("SELECT COUNT(*) FROM assets"), "with_owner": n("SELECT COUNT(*) FROM assets WHERE agency_id IS NOT NULL"),
                      "no_owner_found": n("SELECT COUNT(*) FROM assets WHERE agency_id IS NULL")},
        "tasks": {s: n(f"SELECT COUNT(*) FROM tasks WHERE status='{s}'") for s in ("open", "accepted", "rejected", "done", "confirmed", "disputed")},
        "reports": n("SELECT COUNT(*) FROM incidents"),
        "fill_time_gained_h": round(n("SELECT COALESCE(SUM(gain_h),0) FROM tasks WHERE status='confirmed'"), 2),
        "fill_time_gained_note": f"Scenario at {planning.REF_RAIN_MM_H:g} mm/h, illustrative parameters. Not a prediction.",
        "pockets": n("SELECT COUNT(*) FROM pockets"), "exposed_assets_in_pockets": n("SELECT COALESCE(SUM(exposed_assets),0) FROM pockets"),
        "capture_m3_per_year_by_use": by_use, "banner": copy.SCENARIO_BANNER,
        "not_claimed": "Floods prevented, lives saved, water-table rise, damage avoided.",
    }

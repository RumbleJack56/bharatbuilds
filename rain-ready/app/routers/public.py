"""Public accountability: agency leaderboard, the action log with every step, and the /board page. No login, no personal names."""
import json
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse

from core import copy, leaderboard, planning

from .. import clock, config, storage
from ..db import get_db

router = APIRouter()
LABEL = {"created": "Reported and routed", "report_added": "Another resident reported the same drain", "accepted": "Accepted by the agency",
         "bounced": "Returned: not this agency's drain", "reassigned": "Routed to another agency", "assigned": "Assigned by the ward coordinator",
         "completed": "Marked done with a photo", "confirmed": "Confirmed by a different resident", "disputed": "Disputed by a different resident",
         "rejected": "Closed without action"}
STATIC = Path(__file__).resolve().parent.parent / "static"


def _demo(db) -> dict:
    r = db.execute("SELECT value FROM app_meta WHERE key='data_mode'").fetchone()
    return {"demo": bool(r and r["value"] == "demo_history"), "demo_note": copy.DEMO_DATA if r and r["value"] == "demo_history" else None}


@router.get("/api/leaderboard")
def get_leaderboard(db=Depends(get_db)):
    now = clock.now()
    agencies = [dict(r) for r in db.execute("SELECT id, name FROM agencies WHERE kind='drain_owner' ORDER BY id")]
    tasks = [dict(r) for r in db.execute("SELECT * FROM tasks")]
    events = [dict(r) for r in db.execute("SELECT * FROM task_events")]
    out = leaderboard.build(agencies, tasks, events, now, config.TASK_DUE_DAYS)
    return {**out, **_demo(db), "banner": copy.SCENARIO_BANNER, "generated_at": now.isoformat(timespec="seconds"),
            "tasks_counted": len(tasks)}


def _who(r) -> str:
    if r["role"] == "resident":
        return "Resident"
    if r["role"] == "admin":
        return "Ward coordinator"
    return f"{(r['agency_id'] or '').upper()} official"


@router.get("/api/transparency")
def transparency(agency_id: str | None = None, status: str | None = None, limit: int = Query(50, ge=1, le=200), db=Depends(get_db)):
    """Every task with its route, reason, evidence and timeline. Roles are shown, never names."""
    now = clock.now()
    q = ("SELECT t.*, a.name AS asset_name, a.owner_source, a.data_source, a.lat, a.lon, p.name AS pocket_name, g.name AS agency_name, "
         "(SELECT COUNT(*) FROM incidents i WHERE i.task_id=t.id) AS reports FROM tasks t JOIN assets a ON a.id=t.asset_id "
         "LEFT JOIN pockets p ON p.id=t.pocket_id LEFT JOIN agencies g ON g.id=t.agency_id")
    where, args = [], []
    if agency_id == "none":
        where.append("t.agency_id IS NULL")
    elif agency_id:
        where.append("t.agency_id=?"); args.append(agency_id)
    if status:
        where.append("t.status=?"); args.append(status)
    rows = db.execute(q + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY t.id DESC LIMIT ?", (*args, limit)).fetchall()
    out = []
    for t in rows:
        ev = [{"event": e["event"], "label": LABEL.get(e["event"], e["event"]), "at": e["at"], "by": _who(e) if e["role"] else "System",
               "agency_id": e["agency_id"], "note": e["note"], "photo_url": storage.photo_url(e["photo_key"]),
               "flags": json.loads(e["flags"]) if e["flags"] else []}
              for e in db.execute("SELECT e.*, u.role, u.agency_id AS user_agency FROM task_events e LEFT JOIN users u ON u.id=e.actor_id "
                                  "WHERE e.task_id=? ORDER BY e.id", (t["id"],))]
        overdue = t["status"] in ("open", "accepted") and bool(t["due_at"]) and t["due_at"] < now.isoformat(timespec="seconds")
        out.append({"task_id": t["id"], "asset_id": t["asset_id"], "asset_name": t["asset_name"], "pocket": t["pocket_name"],
                    "agency_id": t["agency_id"], "agency_name": t["agency_name"] or copy.NO_OWNER, "status": t["status"],
                    "created_at": t["created_at"], "due_at": t["due_at"], "overdue": overdue, "reports": t["reports"],
                    "fill_time_gain_h": t["gain_h"], "why_routed": (t["owner_source"] or "none").split(". ")[0],
                    "asset_data_source": t["data_source"], "timeline": ev})
    return {"actions": out, "count": len(out), **_demo(db), "banner": copy.SCENARIO_BANNER,
            "gain_note": f"Fill time gain is a scenario at {planning.REF_RAIN_MM_H:g} mm/h with illustrative parameters. It is not a measured result."}


@router.get("/board", include_in_schema=False)
def board():
    return FileResponse(STATIC / "board.html", media_type="text/html")

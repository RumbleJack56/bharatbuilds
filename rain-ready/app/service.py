"""Task logic shared by routers: pocket/silt loading, ranking, task creation, event log."""
import json
from datetime import date, datetime, timedelta, timezone

from core import geo, planning

from . import config
from .db import now_iso

ACTIVE = ("open", "accepted", "done", "disputed")


def pocket_rows(db) -> list[dict]:
    rows = []
    for r in db.execute("SELECT * FROM pockets ORDER BY id"):
        d = dict(r)
        d["linked_asset_ids"] = json.loads(d["linked_asset_ids"])
        rows.append(d)
    return rows


def asset_silt(db) -> dict[str, float]:
    today = date.today()
    return {r["id"]: planning.silt_fraction(date.fromisoformat(r["last_confirmed_clean"]) if r["last_confirmed_clean"] else None, today)
            for r in db.execute("SELECT id, last_confirmed_clean FROM assets")}


def nearest_asset(db, lat: float, lon: float):
    pts = [dict(r) for r in db.execute("SELECT * FROM assets")]
    best, dist = geo.nearest(lat, lon, pts, config.LINK_RADIUS_M)
    return best, dist


def log_event(db, task_id: int, actor: str | None, event: str, note: str | None = None,
              photo_key: str | None = None, agency_id: str | None = None) -> None:
    db.execute("INSERT INTO task_events(task_id,actor_id,event,note,photo_key,agency_id,at) VALUES(?,?,?,?,?,?,?)",
               (task_id, actor, event, note, photo_key, agency_id, now_iso()))


def refresh_rank(db, task_id: int) -> None:
    t = db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    g = planning.gain_if_cleaned(pocket_rows(db), asset_silt(db), t["asset_id"])
    db.execute("UPDATE tasks SET gain_h=?, pocket_id=COALESCE(?, pocket_id), rank_score=?, updated_at=? WHERE id=?",
               (g["gain_h"], g["pocket_id"], planning.rank_score(g["gain_h"], t["report_count"]), now_iso(), task_id))


def ensure_task(db, asset_id: str, actor: str | None, *, from_report: bool) -> tuple[int, bool]:
    """Find the live task for an asset or create one. Returns (task_id, created)."""
    t = db.execute(f"SELECT id FROM tasks WHERE asset_id=? AND status IN ({','.join('?' * len(ACTIVE))}) ORDER BY id DESC",
                   (asset_id, *ACTIVE)).fetchone()
    if t:
        if from_report:
            db.execute("UPDATE tasks SET report_count=report_count+1 WHERE id=?", (t["id"],))
            log_event(db, t["id"], actor, "report_added")
        refresh_rank(db, t["id"])
        return t["id"], False
    asset = db.execute("SELECT agency_id FROM assets WHERE id=?", (asset_id,)).fetchone()
    now = datetime.now(timezone.utc)
    cur = db.execute("INSERT INTO tasks(asset_id,agency_id,report_count,due_at,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                     (asset_id, asset["agency_id"], 1 if from_report else 0,
                      (now + timedelta(days=config.TASK_DUE_DAYS)).isoformat(timespec="seconds"), now_iso(), now_iso()))
    tid = cur.lastrowid
    log_event(db, tid, actor, "created", "from resident report" if from_report else "from ranked plan", agency_id=asset["agency_id"])
    refresh_rank(db, tid)
    return tid, True

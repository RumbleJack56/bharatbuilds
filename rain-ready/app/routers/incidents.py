"""Resident reports. A report links to the nearest asset and creates or bumps a task."""
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from ai import triage
from core import copy, geo, photocheck

from .. import config, service, storage
from ..auth import need
from ..db import get_db, now_iso

router = APIRouter(prefix="/api")
KINDS = ("blocked_drain", "standing_water", "overflow", "other")


def _incident(r) -> dict:
    d = dict(r)
    d["photo_url"] = storage.photo_url(d.pop("photo_key"))
    d["ai"] = json.loads(d.pop("ai_json")) if d["ai_json"] else None
    d["flags"] = json.loads(d["flags"]) if d["flags"] else []
    d.pop("photo_hash", None)
    return d


@router.post("/incidents")
async def create_incident(lat: float = Form(...), lon: float = Form(...), kind: str = Form(""), note: str = Form(""),
                          accuracy_m: float | None = Form(None), capture_token: str = Form(""),
                          photo: UploadFile | None = File(default=None), user=Depends(need("resident", "admin")),
                          db=Depends(get_db)):
    if not geo.in_ncr(lat, lon):
        raise HTTPException(422, "location is outside the Delhi-NCR area")
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(timespec="seconds")
    sent = db.execute("SELECT COUNT(*) FROM incidents WHERE user_id=? AND created_at>=?", (user["id"], since)).fetchone()[0]
    if sent >= config.REPORTS_PER_DAY:
        raise HTTPException(429, f"You have sent {sent} reports in the last 24 hours. Please try again later.")
    data, ctype, ai, phash, flags = None, "", None, None, []
    if photo is not None:
        data, ctype = await photo.read(storage.MAX_BYTES + 1), photo.content_type or ""
        try:
            storage.validate_photo(data, ctype)
        except ValueError as e:
            raise HTTPException(422, str(e))
        phash, flags = service.check_photo(db, data, lat, lon, user["id"], accuracy_m)
        if phash is None:
            raise HTTPException(422, "the photo could not be read as an image; please take it again")
        ai = await run_in_threadpool(triage.triage_photo, data, ctype, note)          # AWS calls: not on the event loop
        flags += await run_in_threadpool(service.check_stamp, data, ctype, lat, lon, user["id"], capture_token)
    flags += service.check_duplicate(db, user["id"], lat, lon)
    kind = kind if kind in KINDS else (ai["kind"] if ai else "")
    if kind not in KINDS:
        raise HTTPException(422, f"kind is required (one of {', '.join(KINDS)}) when the photo could not be classified")
    key = storage.save_photo(data, ctype) if data is not None else None     # last: nothing is stored for a refused report
    asset, dist = service.nearest_asset(db, lat, lon)
    task_id, pocket_id, created = None, None, False
    held = photocheck.suspect(flags)        # saved and visible, but not counted toward a task until reviewed
    cur = db.execute("INSERT INTO incidents(user_id,lat,lon,kind,note,photo_key,ai_json,photo_hash,flags,accuracy_m,asset_id,created_at) "
                     "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                     (user["id"], lat, lon, kind, note[:500], key, json.dumps(ai) if ai else None, phash,
                      json.dumps(flags) if flags else None, accuracy_m, asset["id"] if asset else None, now_iso()))
    iid = cur.lastrowid
    if asset and not held:
        task_id, created = service.ensure_task(db, asset["id"], user["id"], from_report=True)
        pocket_id = db.execute("SELECT pocket_id FROM tasks WHERE id=?", (task_id,)).fetchone()["pocket_id"]
        db.execute("UPDATE incidents SET task_id=?, pocket_id=? WHERE id=?", (task_id, pocket_id, iid))
    db.commit()
    return {"incident": _incident(db.execute("SELECT * FROM incidents WHERE id=?", (iid,)).fetchone()),
            "linked_asset": asset["id"] if asset else None, "distance_m": round(dist, 1) if dist is not None else None,
            "task_id": task_id, "task_created": created,
            "held_for_review": held, "flags": flags,
            "message": "Saved for review. It is not counted yet: " + "; ".join(f["detail"] for f in flags if f["level"] == "warn") + "." if held else
                       "Linked to a drain and added to the action list." if asset else
                       "No known drain within range. Report saved without a task.",
            "field_rule": copy.FIELD_RULE}


def _is_held(row) -> bool:
    flags = json.loads(row["flags"]) if row["flags"] else []
    return photocheck.suspect(flags) and not row["review_decision"]


@router.get("/incidents")
def list_incidents(mine: bool = False, held: bool = False, user=Depends(need("resident", "official", "admin")),
                   db=Depends(get_db)):
    if held and user["role"] == "resident":
        raise HTTPException(403, "only officials and admins can list held reports")
    q, args, where = "SELECT i.* FROM incidents i", [], []
    if mine:
        where.append("i.user_id=?"); args.append(user["id"])
    if held and user["role"] == "official":
        q += " JOIN assets a ON a.id=i.asset_id"
        where.append("a.agency_id=?"); args.append(user["agency_id"])
    rows = db.execute(q + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY i.id DESC LIMIT 100", args)
    return {"incidents": [_incident(r) for r in rows if not held or _is_held(r)]}


class Review(BaseModel):
    decision: str
    note: str = ""


@router.post("/incidents/{incident_id}/review")
def review_incident(incident_id: int, body: Review, user=Depends(need("admin")), db=Depends(get_db)):
    """Admin decides a held report: release it into the task flow, or reject it. A person decides, never a rule."""
    if body.decision not in ("release", "reject"):
        raise HTTPException(422, "decision must be release or reject")
    r = db.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
    if not r:
        raise HTTPException(404, "report not found")
    if not _is_held(r):
        raise HTTPException(409, "this report is not held for review, or was already reviewed")
    if body.decision == "release":
        if not r["asset_id"]:
            raise HTTPException(409, "this report has no linked drain, so it cannot create a task")
        task_id, _ = service.ensure_task(db, r["asset_id"], r["user_id"], from_report=True)
        pocket_id = db.execute("SELECT pocket_id FROM tasks WHERE id=?", (task_id,)).fetchone()["pocket_id"]
        db.execute("UPDATE incidents SET task_id=?, pocket_id=? WHERE id=?", (task_id, pocket_id, incident_id))
    db.execute("UPDATE incidents SET reviewed_by=?, reviewed_at=?, review_decision=?, review_note=? WHERE id=?",
               (user["id"], now_iso(), body.decision, body.note[:500], incident_id))
    db.commit()
    return {"incident": _incident(db.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone())}

"""Resident reports. A report links to the nearest asset and creates or bumps a task."""
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ai import triage
from core import copy, geo

from .. import service, storage
from ..auth import need
from ..db import get_db, now_iso

router = APIRouter(prefix="/api")
KINDS = ("blocked_drain", "standing_water", "overflow", "other")


def _incident(r) -> dict:
    d = dict(r)
    d["photo_url"] = storage.photo_url(d.pop("photo_key"))
    d["ai"] = json.loads(d.pop("ai_json")) if d["ai_json"] else None
    return d


@router.post("/incidents")
async def create_incident(lat: float = Form(...), lon: float = Form(...), kind: str = Form(""), note: str = Form(""),
                          photo: UploadFile | None = File(default=None), user=Depends(need("resident", "admin")),
                          db=Depends(get_db)):
    if not geo.in_ncr(lat, lon):
        raise HTTPException(422, "location is outside the Delhi-NCR area")
    key, ai = None, None
    if photo is not None:
        data = await photo.read()
        try:
            key = storage.save_photo(data, photo.content_type or "")
        except ValueError as e:
            raise HTTPException(422, str(e))
        ai = triage.triage_photo(data, photo.content_type, note)
    kind = kind if kind in KINDS else (ai["kind"] if ai else "")
    if kind not in KINDS:
        raise HTTPException(422, f"kind is required (one of {', '.join(KINDS)}) when the photo could not be classified")
    asset, dist = service.nearest_asset(db, lat, lon)
    task_id, pocket_id, created = None, None, False
    cur = db.execute("INSERT INTO incidents(user_id,lat,lon,kind,note,photo_key,ai_json,asset_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                     (user["id"], lat, lon, kind, note[:500], key, json.dumps(ai) if ai else None,
                      asset["id"] if asset else None, now_iso()))
    iid = cur.lastrowid
    if asset:
        task_id, created = service.ensure_task(db, asset["id"], user["id"], from_report=True)
        pocket_id = db.execute("SELECT pocket_id FROM tasks WHERE id=?", (task_id,)).fetchone()["pocket_id"]
        db.execute("UPDATE incidents SET task_id=?, pocket_id=? WHERE id=?", (task_id, pocket_id, iid))
    db.commit()
    return {"incident": _incident(db.execute("SELECT * FROM incidents WHERE id=?", (iid,)).fetchone()),
            "linked_asset": asset["id"] if asset else None, "distance_m": round(dist, 1) if dist is not None else None,
            "task_id": task_id, "task_created": created,
            "message": "Linked to a drain and added to the action list." if asset else
                       "No known drain within range. Report saved without a task.",
            "field_rule": copy.FIELD_RULE}


@router.get("/incidents")
def list_incidents(mine: bool = False, user=Depends(need("resident", "official", "admin")), db=Depends(get_db)):
    q, args = "SELECT * FROM incidents", ()
    if mine:
        q, args = q + " WHERE user_id=?", (user["id"],)
    return {"incidents": [_incident(r) for r in db.execute(q + " ORDER BY id DESC LIMIT 100", args)]}

"""Task lifecycle: open -> accepted -> done -> confirmed | disputed. Every step writes a task_events row."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from core import copy

from .. import clock, service, storage
from ..auth import current_user, need
from ..db import get_db, now_iso

router = APIRouter(prefix="/api")

SQL = ("SELECT t.*, a.name AS asset_name, a.lat, a.lon, a.owner_source, a.type AS asset_type, "
       "COALESCE(g.name, ?) AS agency_name, p.name AS pocket_name FROM tasks t JOIN assets a ON a.id=t.asset_id "
       "LEFT JOIN agencies g ON g.id=t.agency_id LEFT JOIN pockets p ON p.id=t.pocket_id")


def _overdue(t: dict) -> bool:
    return t["status"] in ("open", "accepted") and bool(t["due_at"]) and datetime.fromisoformat(t["due_at"]) < clock.now()


def _out(db, r, detail=False) -> dict:
    d = dict(r)
    d["overdue"] = _overdue(d)
    if detail:
        d["events"] = [dict(e, photo_url=storage.photo_url(e["photo_key"]), photo_hash=None,
                            flags=json.loads(e["flags"]) if e["flags"] else []) for e in
                       db.execute("SELECT e.*, COALESCE(u.name, e.actor_id) AS actor_name FROM task_events e "
                                  "LEFT JOIN users u ON u.id=e.actor_id WHERE task_id=? ORDER BY e.id", (d["id"],))]
        d["incidents"] = [dict(i, photo_url=storage.photo_url(i["photo_key"]), flags=json.loads(i["flags"]) if i["flags"] else []) for i in
                          db.execute("SELECT id,kind,note,photo_key,flags,created_at FROM incidents WHERE task_id=? ORDER BY id", (d["id"],))]
    return d


def _task(db, tid: int):
    t = db.execute(SQL + " WHERE t.id=?", (copy.NO_OWNER, tid)).fetchone()
    if not t:
        raise HTTPException(404, "task not found")
    return t


def _own(user, t) -> None:
    if user["role"] == "admin":
        return
    if user["role"] != "official" or user["agency_id"] != t["agency_id"]:
        raise HTTPException(403, "this task belongs to another agency")


def _need_status(t, *allowed: str) -> None:
    if t["status"] not in allowed:
        raise HTTPException(409, f"task is {t['status']}; allowed from: {', '.join(allowed)}")


@router.get("/tasks")
def list_tasks(agency_id: str | None = None, status: str | None = None, db=Depends(get_db)):
    q, args, where = SQL, [copy.NO_OWNER], []
    if agency_id == "none":
        where.append("t.agency_id IS NULL")
    elif agency_id:
        where.append("t.agency_id=?"); args.append(agency_id)
    if status:
        where.append("t.status=?"); args.append(status)
    if where:
        q += " WHERE " + " AND ".join(where)
    rows = db.execute(q + " ORDER BY t.rank_score DESC, t.id", args).fetchall()
    return {"tasks": [_out(db, r) for r in rows], "banner": copy.SCENARIO_BANNER}


@router.get("/tasks/{tid}")
def get_task(tid: int, db=Depends(get_db)):
    return {**_out(db, _task(db, tid), detail=True), "banner": copy.SCENARIO_BANNER}


def _set(db, tid: int, **cols) -> None:
    cols["updated_at"] = now_iso()
    db.execute(f"UPDATE tasks SET {','.join(k + '=?' for k in cols)} WHERE id=?", (*cols.values(), tid))


@router.post("/tasks/{tid}/accept")
def accept(tid: int, user=Depends(need("official", "admin")), db=Depends(get_db)):
    t = _task(db, tid); _own(user, t); _need_status(t, "open", "disputed")      # a disputed job is redone: accept it again
    if not t["agency_id"]:
        raise HTTPException(409, "no owner found: an admin must assign an agency first")
    rework = t["status"] == "disputed"
    _set(db, tid, status="accepted", done_by=None if rework else t["done_by"])
    service.log_event(db, tid, user["id"], "accepted", "to be redone after a resident disputed the job" if rework else None,
                      agency_id=t["agency_id"]); db.commit()
    return _out(db, _task(db, tid), True)


class RejectIn(BaseModel):
    reason: str
    reassign_to: str | None = None


@router.post("/tasks/{tid}/reject")
def reject(tid: int, body: RejectIn, user=Depends(need("official", "admin")), db=Depends(get_db)):
    t = _task(db, tid); _own(user, t); _need_status(t, "open", "accepted")
    if body.reassign_to:
        if not db.execute("SELECT 1 FROM agencies WHERE id=?", (body.reassign_to,)).fetchone():
            raise HTTPException(422, "unknown agency")
        service.log_event(db, tid, user["id"], "bounced", f"wrong owner: {body.reason}"[:300], agency_id=t["agency_id"])
        _set(db, tid, status="open", agency_id=body.reassign_to, due_at=service.new_due_at())   # new owner, new clock
        service.log_event(db, tid, user["id"], "reassigned", agency_id=body.reassign_to)
    else:
        service.log_event(db, tid, user["id"], "rejected", body.reason[:300], agency_id=t["agency_id"])
        _set(db, tid, status="rejected")
    db.commit()
    return _out(db, _task(db, tid), True)


class AssignIn(BaseModel):
    agency_id: str


@router.post("/tasks/{tid}/assign")
def assign(tid: int, body: AssignIn, user=Depends(need("admin")), db=Depends(get_db)):
    t = _task(db, tid); _need_status(t, "open", "rejected")
    if not db.execute("SELECT 1 FROM agencies WHERE id=?", (body.agency_id,)).fetchone():
        raise HTTPException(422, "unknown agency")
    _set(db, tid, status="open", agency_id=body.agency_id, due_at=service.new_due_at())
    service.log_event(db, tid, user["id"], "assigned", "by ward coordinator", agency_id=body.agency_id); db.commit()
    return _out(db, _task(db, tid), True)


@router.post("/tasks/{tid}/complete")
async def complete(tid: int, note: str = Form(""), photo: UploadFile = File(...),
                   user=Depends(need("official", "admin")), db=Depends(get_db)):
    t = _task(db, tid); _own(user, t); _need_status(t, "accepted")
    data, ctype = await photo.read(storage.MAX_BYTES + 1), photo.content_type or ""
    try:
        storage.validate_photo(data, ctype)
    except ValueError as e:
        raise HTTPException(422, str(e))
    phash, flags = service.check_photo(db, data, t["lat"], t["lon"], user["id"])   # flags are shown to the confirming resident
    if phash is None:
        raise HTTPException(422, "the photo could not be read as an image; please take it again")
    key = storage.save_photo(data, ctype)
    _set(db, tid, status="done", done_by=user["id"])
    service.log_event(db, tid, user["id"], "completed", note[:300], key, t["agency_id"], phash, flags); db.commit()
    return _out(db, _task(db, tid), True)


class ConfirmIn(BaseModel):
    ok: bool
    note: str = ""


@router.post("/tasks/{tid}/confirm")
def confirm(tid: int, body: ConfirmIn, user=Depends(need("resident")), db=Depends(get_db)):
    t = _task(db, tid); _need_status(t, "done")
    if user["id"] == t["done_by"]:
        raise HTTPException(403, "the person who did the work cannot confirm it")
    first = db.execute("SELECT user_id FROM incidents WHERE task_id=? ORDER BY id LIMIT 1", (tid,)).fetchone()
    if first and first["user_id"] == user["id"]:     # the person who raised it; later reporters are independent
        raise HTTPException(403, "you reported this problem, so someone else has to check the fix")
    if body.ok:
        service.refresh_rank(db, tid)                       # gain is recorded as it stands before the reset
        db.execute("UPDATE assets SET last_confirmed_clean=? WHERE id=?", (clock.today().isoformat(), t["asset_id"]))
        _set(db, tid, status="confirmed")
        service.log_event(db, tid, user["id"], "confirmed", body.note[:300], agency_id=t["agency_id"])
    else:
        _set(db, tid, status="disputed")
        service.log_event(db, tid, user["id"], "disputed", body.note[:300], agency_id=t["agency_id"])
    db.commit()
    return _out(db, _task(db, tid), True)

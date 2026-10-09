"""State, storm switch, ward board, ledger endpoints. Owner: dev#1."""
import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .. import config, ledger
from ..auth import require_ops
from ..db import get_db, now_iso

router = APIRouter(prefix="/api")


def read_storm(db) -> dict:
    r = db.execute("SELECT value_json FROM settings WHERE key='storm'").fetchone()
    return json.loads(r["value_json"]) if r else {"active": False, "level": "none", "source": "", "set_at": None}


@router.get("/state")
def state(db=Depends(get_db)):
    return {"storm": read_storm(db), "server_time": now_iso(), "version": config.VERSION,
            "ledger": ledger.head(db), "triage_mode": config.TRIAGE_MODE, "storage": config.STORAGE}


class StormIn(BaseModel):
    active: bool
    level: str = "warning"          # watch | warning
    source: str = "IMD orange (entered by operator)"


@router.post("/ops/storm", dependencies=[Depends(require_ops)])
def set_storm(body: StormIn, db=Depends(get_db)):
    val = {"active": body.active, "level": body.level if body.active else "none",
           "source": body.source, "set_at": now_iso()}
    db.execute("INSERT OR REPLACE INTO settings(key,value_json) VALUES('storm',?)", (json.dumps(val),))
    db.commit()
    ledger.append(db, "storm", val["set_at"], val)
    return val


@router.get("/board")
def board(db=Depends(get_db)):
    """Ward-level aggregate. No names, no tonnage, no contractor/officer identities."""
    total = db.execute("SELECT COUNT(*) FROM assets WHERE type!='underpass'").fetchone()[0]
    confirmed = db.execute("SELECT COUNT(*) FROM assets WHERE type!='underpass' AND last_confirmed_clean IS NOT NULL").fetchone()[0]
    by_status = {r["status"]: r["n"] for r in db.execute("SELECT status, COUNT(*) n FROM jobs GROUP BY status")}
    return {"assets_total": total, "assets_independently_confirmed": confirmed,
            "pct_confirmed": round(100 * confirmed / total, 1) if total else 0.0,
            "jobs_by_status": by_status, "note": "Confirmed means checked by a second, independent person."}


@router.get("/ledger/head")
def ledger_head(db=Depends(get_db)):
    return ledger.head(db)


@router.get("/ledger/verify/{entry_id}")
def ledger_verify(entry_id: int, db=Depends(get_db)):
    from fastapi import HTTPException
    r = ledger.verify_item(db, entry_id)
    if r is None:
        raise HTTPException(404, "no such ledger entry")
    return r

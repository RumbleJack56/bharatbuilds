"""Append-only hash chain over core.ledger_hash. Owner: dev#1. ONLY this module writes the ledger table.
Other routers call `ledger.append(db, kind, ref_id, record, photo_sha256)` after their own writes."""
import json

from core import ledger_hash

from .db import now_iso


def head(db) -> dict:
    r = db.execute("SELECT id, hash, server_ts FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
    count = db.execute("SELECT COUNT(*) FROM ledger").fetchone()[0]
    return {"count": count, "head_hash": r["hash"] if r else ledger_hash.GENESIS, "head_id": r["id"] if r else None,
            "as_of": r["server_ts"] if r else None}


def append(db, kind: str, ref_id: str, record: dict, photo_sha256: str | None = None) -> dict:
    prev = db.execute("SELECT hash FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
    prev_hash = prev["hash"] if prev else ledger_hash.GENESIS
    rec = dict(record, kind=kind, ref_id=str(ref_id))
    h = ledger_hash.entry_hash(prev_hash, rec, photo_sha256)
    cur = db.execute(
        "INSERT INTO ledger(prev_hash,hash,kind,ref_id,record_json,photo_sha256,server_ts) VALUES(?,?,?,?,?,?,?)",
        (prev_hash, h, kind, str(ref_id), json.dumps(rec, sort_keys=True, ensure_ascii=False), photo_sha256, now_iso()))
    db.commit()
    return {"id": cur.lastrowid, "hash": h, "prev_hash": prev_hash}


def entries(db) -> list[dict]:
    rows = db.execute("SELECT * FROM ledger ORDER BY id").fetchall()
    return [dict(id=r["id"], prev_hash=r["prev_hash"], hash=r["hash"], kind=r["kind"], ref_id=r["ref_id"],
                 record=json.loads(r["record_json"]), photo_sha256=r["photo_sha256"], server_ts=r["server_ts"])
            for r in rows]


def verify_item(db, entry_id: int) -> dict | None:
    es = entries(db)
    ok, bad = ledger_hash.verify_chain(es)
    target = next((e for e in es if e["id"] == entry_id), None)
    if target is None:
        return None
    return {"id": entry_id, "chain_ok": ok, "first_bad_index": bad, "entry": target, "head": head(db),
            "proves": "record unchanged since written", "does_not_prove": "that the photo is genuine"}

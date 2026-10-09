"""Tamper-evident hash chain. Pure functions. Owner: P1 (app/ledger.py wraps this with the DB and S3).

Proves records were not changed after being written. It does NOT prove a photo is true.
"""
from __future__ import annotations

import hashlib
import json

GENESIS = "0" * 64


def canon(record: dict) -> bytes:
    return json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def entry_hash(prev_hash: str, record: dict, photo_sha256: str | None = None) -> str:
    return hashlib.sha256(prev_hash.encode() + canon(record) + (photo_sha256 or "").encode()).hexdigest()


def verify_chain(entries: list[dict]) -> tuple[bool, int | None]:
    """entries ordered by id, each with prev_hash, hash, record (dict), photo_sha256.
    Returns (ok, first_bad_index)."""
    prev = GENESIS
    for i, e in enumerate(entries):
        if e["prev_hash"] != prev:
            return False, i
        if entry_hash(e["prev_hash"], e["record"], e.get("photo_sha256")) != e["hash"]:
            return False, i
        prev = e["hash"]
    return True, None

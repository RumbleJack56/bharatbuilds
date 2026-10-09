"""Capture tokens. The app asks for one before it opens the camera and prints its short ref in the photo stamp.
A token says: this user opened the in-app camera at this server time. It does not prove the pixels (see SCOPE honesty rules)."""
import hashlib
import hmac
import secrets
import time

from . import config

_fallback = secrets.token_hex(16)       # per-process secret when CAPTURE_SECRET is not set (tokens die on restart)


def _sig(user_id: str, ts: int, nonce: str) -> str:
    key = (config.CAPTURE_SECRET or _fallback).encode()
    return hmac.new(key, f"{user_id}|{ts}|{nonce}".encode(), hashlib.sha256).hexdigest()


def issue(user_id: str, now: float | None = None) -> dict:
    ts, nonce = int(now if now is not None else time.time()), secrets.token_hex(4)
    sig = _sig(user_id, ts, nonce)
    return {"token": f"{ts}.{nonce}.{sig[:32]}", "ref": sig[:4].upper(), "issued_at": ts, "valid_for_s": config.CAPTURE_MAX_AGE_S}


def verify(token: str | None, user_id: str, now: float | None = None) -> str | None:
    """-> the ref to expect in the stamp, or None when the token is missing, forged, someone else's or too old."""
    try:
        ts_s, nonce, given = (token or "").split(".")
        ts = int(ts_s)
    except ValueError:
        return None
    sig = _sig(user_id, ts, nonce)
    age = (now if now is not None else time.time()) - ts
    if not hmac.compare_digest(sig[:32], given) or age < -60 or age > config.CAPTURE_MAX_AGE_S:
        return None
    return sig[:4].upper()

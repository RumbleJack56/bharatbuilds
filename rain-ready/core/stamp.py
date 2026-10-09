"""Read the on-photo stamp (address, Lat, Long, date and time, Ref) and compare it with what the report claims.
Input is text that Bedrock transcribed from the photo. Soft flags only, same shape as core/photocheck."""
import re
from datetime import datetime, timedelta, timezone

from core import geo

STAMP_GPS_M = 50
STAMP_TIME_S = 15 * 60
_LAT = re.compile(r"\bLat\w*\.?\s*:?\s*(-?\d{1,3}\.\d+)", re.I)
_LON = re.compile(r"\bLon\w*\.?\s*:?\s*(-?\d{1,3}\.\d+)", re.I)
_TIME = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?\s*(?:GMT|UTC)?\s*([+-]\d{1,2})?(?::?(\d{2}))?", re.I)
_REF = re.compile(r"\bRef\.?\s*:?\s*([A-Z0-9]{4})\b")


def parse(text: str) -> dict | None:
    """-> {lat, lon, at (aware datetime)|None, ref|None}; None when there is no coordinate pair."""
    la, lo = _LAT.search(text or ""), _LON.search(text or "")
    if not (la and lo):
        return None
    at = None
    m = _TIME.search(text)
    if m:
        d, mo, y, h, mi, ap, tz_h, tz_m = m.groups()
        y = int(y) + 2000 if len(y) == 2 else int(y)
        h = int(h) % 12 + (12 if (ap or "").upper() == "PM" else 0) if ap else int(h)
        off = timedelta(hours=int(tz_h or 0), minutes=(int(tz_m or 0) * (-1 if (tz_h or "").startswith("-") else 1)))
        try:
            at = datetime(y, int(mo), int(d), h, int(mi), tzinfo=timezone(off))
        except ValueError:
            at = None
    ref = _REF.search(text)
    return {"lat": float(la.group(1)), "lon": float(lo.group(1)), "at": at, "ref": ref.group(1) if ref else None}


def _flag(code, level, detail):
    return {"code": code, "level": level, "detail": detail}


def assess(text: str | None, lat: float, lon: float, now: datetime, expect_ref: str | None, missing_level: str = "info") -> list[dict]:
    if text is None:
        return [_flag("stamp_unverified", "info", "the on-photo stamp could not be read automatically")]
    s = parse(text)
    if s is None:
        return [_flag("stamp_missing", missing_level, "the photo has no location and time stamp")]
    flags = []
    d = geo.haversine_m(lat, lon, s["lat"], s["lon"])
    if d > STAMP_GPS_M:
        flags.append(_flag("stamp_gps_mismatch", "warn", f"the stamp location is {round(d)} m from the reported spot"))
    if s["at"] is None:
        flags.append(_flag("stamp_time_unread", "info", "the stamp time could not be read"))
    elif abs((now - s["at"]).total_seconds()) > STAMP_TIME_S:
        flags.append(_flag("stamp_time_off", "warn", f"the stamp time {s['at']:%Y-%m-%d %H:%M %z} is not within 15 minutes of the report"))
    if expect_ref and s["ref"] and s["ref"] != expect_ref:
        flags.append(_flag("stamp_ref_mismatch", "warn", "the reference code on the photo does not match this capture"))
    elif expect_ref and not s["ref"]:
        flags.append(_flag("stamp_ref_missing", "warn", "the photo does not show the capture reference code"))
    return flags

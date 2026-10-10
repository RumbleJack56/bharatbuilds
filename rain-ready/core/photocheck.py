"""Photo checks against false reports: perceptual hash, EXIF geotag and time. Soft flags only.
Flags never change rank, owner or status by themselves. The caller decides what to do with a 'warn'."""
import io
from datetime import datetime, timedelta

from PIL import Image, ImageOps

from core import geo

GPS_IFD, EXIF_IFD = 0x8825, 0x8769
GPS_MISMATCH_M = 200        # photo geotag this far from the reported point -> warn
HASH_NEAR = 6               # hamming distance (of 64) at or below this -> same picture
STALE_AFTER = timedelta(hours=48)
LOW_ACCURACY_M = 100        # phone GPS accuracy worse than this -> info


def _deg(vals, ref) -> float:
    d, m, s = (float(v) for v in vals)
    out = d + m / 60 + s / 3600
    return -out if ref in ("S", "W") else out


def analyze(data: bytes) -> dict:
    """-> {hash, gps: (lat, lon)|None, taken: datetime|None}. hash is None when the bytes are not an image."""
    try:
        img = Image.open(io.BytesIO(data))
        exif = img.getexif()
        img = ImageOps.exif_transpose(img).convert("L").resize((9, 8), Image.LANCZOS)
    except Exception:  # noqa: BLE001
        return {"hash": None, "gps": None, "taken": None}
    px = img.tobytes()
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | (px[row * 9 + col] > px[row * 9 + col + 1])
    gps, taken = None, None
    try:
        g = exif.get_ifd(GPS_IFD)
        if g.get(2) and g.get(4):
            gps = (_deg(g[2], g.get(1)), _deg(g[4], g.get(3)))
            if gps == (0.0, 0.0):
                gps = None
    except Exception:  # noqa: BLE001
        pass
    try:
        raw = exif.get_ifd(EXIF_IFD).get(36867) or exif.get(306)
        taken = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S") if raw else None
    except Exception:  # noqa: BLE001
        pass
    return {"hash": f"{bits:016x}", "gps": gps, "taken": taken}


def informative(h: str | None) -> bool:
    """A flat, very dark or smooth-gradient picture hashes to almost all 0 or all 1; two different ones then 'match'."""
    return h is not None and 8 <= bin(int(h, 16)).count("1") <= 56


def hamming(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def _flag(code: str, level: str, detail: str) -> dict:
    return {"code": code, "level": level, "detail": detail}


def assess(info: dict, lat: float, lon: float, now: datetime, prior: list[tuple[str, str | None]],
           user_id: str | None = None, accuracy_m: float | None = None) -> list[dict]:
    """prior: (hash, user_id) of earlier photos. Returns flags: [{code, level: warn|info, detail}]."""
    flags = []
    if accuracy_m is not None and accuracy_m > LOW_ACCURACY_M:
        flags.append(_flag("gps_accuracy_low", "info", f"phone location is only accurate to about {round(accuracy_m)} m"))
    if info["hash"] is None:
        return flags + [_flag("photo_unreadable", "info", "the file could not be read as an image")]
    if info["gps"]:
        d = geo.haversine_m(lat, lon, *info["gps"])
        if d > GPS_MISMATCH_M:
            flags.append(_flag("photo_gps_mismatch", "warn", f"photo geotag is {round(d)} m from the reported spot"))
    else:
        flags.append(_flag("photo_no_geotag", "info", "photo has no location tag"))
    if info["taken"] and now.replace(tzinfo=None) - info["taken"] > STALE_AFTER:
        flags.append(_flag("photo_stale", "warn", f"photo was taken {info['taken']:%Y-%m-%d}, not in the last 2 days"))
    for h, uid in prior if informative(info["hash"]) else []:
        if informative(h) and hamming(h, info["hash"]) <= HASH_NEAR:
            same = uid is not None and uid == user_id
            flags.append(_flag("photo_reused_self" if same else "photo_reused_other", "warn",
                               "this picture was already submitted" + ("" if same else " by someone else")))
            break
    return flags


def suspect(flags: list[dict]) -> bool:
    return any(f["level"] == "warn" for f in flags)

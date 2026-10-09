"""Perceptual hash, geotag and reuse checks. Images are generated, nothing is downloaded."""
import io
import random
import sqlite3
from datetime import datetime, timezone

from PIL import Image

from app import db
from core import photocheck
from .conftest import as_

NOW = datetime(2026, 10, 10, 12, 0, tzinfo=timezone.utc)


def picture(seed=1, size=(120, 90), lat=None, lon=None, taken=None, fmt="JPEG", quality=90) -> bytes:
    rnd = random.Random(seed)
    img = Image.new("RGB", (12, 9))
    img.putdata([(rnd.randrange(256),) * 3 for _ in range(108)])
    img = img.resize(size, Image.BICUBIC)
    ex = Image.Exif()
    if lat is not None:
        ex[0x8825] = {1: "N" if lat >= 0 else "S", 2: (abs(int(lat)), int(abs(lat) % 1 * 60), abs(lat) % 1 * 60 % 1 * 60),
                      3: "E" if lon >= 0 else "W", 4: (abs(int(lon)), int(abs(lon) % 1 * 60), abs(lon) % 1 * 60 % 1 * 60)}
    if taken:
        ex[0x8769] = {36867: taken}
    buf = io.BytesIO()
    img.save(buf, fmt, exif=ex, quality=quality)
    return buf.getvalue()


def codes(flags):
    return {f["code"] for f in flags}


def test_hash_survives_resize_and_recompress_but_not_a_different_picture():
    a = photocheck.analyze(picture(1))["hash"]
    b = photocheck.analyze(picture(1, size=(60, 45), quality=40))["hash"]
    c = photocheck.analyze(picture(2))["hash"]
    assert photocheck.hamming(a, b) <= photocheck.HASH_NEAR
    assert photocheck.hamming(a, c) > photocheck.HASH_NEAR


def test_geotag_is_read():
    info = photocheck.analyze(picture(1, lat=28.6433, lon=77.1846))
    assert abs(info["gps"][0] - 28.6433) < 0.001 and abs(info["gps"][1] - 77.1846) < 0.001


def test_geotag_far_from_reported_spot_is_a_warning():
    info = photocheck.analyze(picture(1, lat=28.70, lon=77.30))
    fl = photocheck.assess(info, 28.6433, 77.1846, NOW, [])
    assert "photo_gps_mismatch" in codes(fl) and photocheck.suspect(fl)


def test_geotag_close_is_clean_and_missing_geotag_is_only_info():
    near = photocheck.assess(photocheck.analyze(picture(1, lat=28.6434, lon=77.1847)), 28.6433, 77.1846, NOW, [])
    assert near == []
    none = photocheck.assess(photocheck.analyze(picture(1)), 28.6433, 77.1846, NOW, [])
    assert codes(none) == {"photo_no_geotag"} and not photocheck.suspect(none)


def test_old_photo_is_stale():
    info = photocheck.analyze(picture(1, taken="2026:09:01 10:00:00"))
    assert "photo_stale" in codes(photocheck.assess(info, 28.6, 77.2, NOW, []))
    fresh = photocheck.analyze(picture(1, taken="2026:10:10 09:00:00"))
    assert "photo_stale" not in codes(photocheck.assess(fresh, 28.6, 77.2, NOW, []))


def test_reuse_self_vs_other():
    h = photocheck.analyze(picture(1))["hash"]
    info = photocheck.analyze(picture(1, size=(80, 60)))
    assert "photo_reused_self" in codes(photocheck.assess(info, 28.6, 77.2, NOW, [(h, "res-1")], "res-1"))
    assert "photo_reused_other" in codes(photocheck.assess(info, 28.6, 77.2, NOW, [(h, "res-2")], "res-1"))
    assert "photo_reused_self" not in codes(photocheck.assess(info, 28.6, 77.2, NOW, [], "res-1"))


def test_unreadable_file_and_low_accuracy_are_info_only():
    fl = photocheck.assess(photocheck.analyze(b"not an image"), 28.6, 77.2, NOW, [], accuracy_m=250)
    assert codes(fl) == {"photo_unreadable", "gps_accuracy_low"} and not photocheck.suspect(fl)


def post(c, user, img, lat=28.6433, lon=77.1846, **extra):
    return c.post("/api/incidents", data={"lat": lat, "lon": lon, "kind": "blocked_drain", **extra},
                  files={"photo": ("p.jpg", img, "image/jpeg")}, headers=as_(user)).json()


def test_reused_photo_is_saved_but_does_not_bump_the_task(client):
    first = post(client, "res-1", picture(5))
    assert not first["held_for_review"] and first["task_id"]
    again = post(client, "res-2", picture(5, size=(90, 70)))
    assert again["held_for_review"] and again["task_id"] is None
    assert "photo_reused_other" in codes(again["flags"]) and "not counted" in again["message"]
    assert client.get(f"/api/tasks/{first['task_id']}").json()["report_count"] == 1
    assert client.get("/api/incidents?mine=true", headers=as_("res-2")).json()["incidents"][0]["flags"]


def test_wrong_geotag_is_held(client):
    r = post(client, "res-1", picture(6, lat=28.70, lon=77.30))
    assert r["held_for_review"] and r["task_id"] is None and r["linked_asset"]


def test_honest_report_with_matching_geotag_counts(client):
    r = post(client, "res-1", picture(7, lat=28.6433, lon=77.1846, taken=datetime.now().strftime("%Y:%m:%d %H:%M:%S")))
    assert not r["held_for_review"] and r["task_created"] and r["flags"] == []


def test_after_photo_that_reuses_the_report_photo_is_flagged(client):
    r = post(client, "res-1", picture(8))
    tid = r["task_id"]
    client.post(f"/api/tasks/{tid}/accept", headers=as_("off-mcd"))
    done = client.post(f"/api/tasks/{tid}/complete", data={"note": "cleared"},
                       files={"photo": ("a.jpg", picture(8), "image/jpeg")}, headers=as_("off-mcd")).json()
    ev = next(e for e in done["events"] if e["event"] == "completed")
    assert "photo_reused_other" in codes(ev["flags"]) and ev["photo_hash"] is None


def test_old_database_gets_the_new_columns(tmp_path):
    p = tmp_path / "old.db"
    c = sqlite3.connect(p); c.row_factory = sqlite3.Row
    c.executescript("CREATE TABLE incidents(id INTEGER PRIMARY KEY, photo_key TEXT);"
                    "CREATE TABLE task_events(id INTEGER PRIMARY KEY, photo_key TEXT);")
    db._add_missing_columns(c)
    assert {"photo_hash", "flags", "accuracy_m"} <= {r["name"] for r in c.execute("PRAGMA table_info(incidents)")}
    assert {"photo_hash", "flags"} <= {r["name"] for r in c.execute("PRAGMA table_info(task_events)")}
    db._add_missing_columns(c)   # idempotent

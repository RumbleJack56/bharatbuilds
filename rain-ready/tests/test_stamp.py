"""On-photo stamp (like GPS Map Camera) and capture tokens."""
from datetime import datetime, timedelta, timezone

import pytest

from ai import stampread
from app import capture, config
from core import stamp
from .conftest import as_
from .test_photocheck import codes, picture

TEXT = """New Delhi, Delhi, India
B4, Block A, Qutab Institutional Area, New Delhi, Delhi 110016, India
Lat 28.54159°
Long 77.182223°
18/09/24 01:05 PM GMT +05:30"""
AT = datetime(2024, 9, 18, 7, 35, tzinfo=timezone.utc)      # 13:05 IST


def test_parse_real_stamp_layout():
    s = stamp.parse(TEXT)
    assert (s["lat"], s["lon"]) == (28.54159, 77.182223)
    assert s["at"] == AT and s["ref"] is None


def test_parse_variants():
    assert stamp.parse("Lat: 28.5 Long: 77.1 18/09/2024 13:05 GMT +05:30 Ref 7QK2")["ref"] == "7QK2"
    assert stamp.parse("Latitude 28.5\nLongitude -77.1")["lon"] == -77.1
    assert stamp.parse("just a street") is None and stamp.parse("") is None
    assert stamp.parse("Lat 28.5 Long 77.1 12/10/24 12:05 AM GMT +05:30")["at"].hour == 0


def test_matching_stamp_is_clean():
    assert stamp.assess(TEXT, 28.54160, 77.18223, AT + timedelta(minutes=3), None) == []


def test_stamp_far_from_claimed_spot_or_time_is_warned():
    fl = stamp.assess(TEXT, 28.60, 77.20, AT + timedelta(hours=3), None)
    assert codes(fl) == {"stamp_gps_mismatch", "stamp_time_off"}


def test_ref_must_match_this_capture():
    t = TEXT + "\nRef 7QK2"
    assert stamp.assess(t, 28.54159, 77.182223, AT, "7QK2") == []
    assert "stamp_ref_mismatch" in codes(stamp.assess(t, 28.54159, 77.182223, AT, "ZZZZ"))
    assert "stamp_ref_missing" in codes(stamp.assess(TEXT, 28.54159, 77.182223, AT, "7QK2"))


def test_unread_and_missing_stamp_levels():
    assert stamp.assess(None, 28.5, 77.1, AT, None)[0]["level"] == "info"
    assert stamp.assess("", 28.5, 77.1, AT, None)[0] == {"code": "stamp_missing", "level": "info", "detail": "the photo has no location and time stamp"}
    assert stamp.assess("", 28.5, 77.1, AT, None, "warn")[0]["level"] == "warn"


def test_token_roundtrip_and_rejections():
    t = capture.issue("res-1", now=1000)
    assert capture.verify(t["token"], "res-1", now=1100) == t["ref"] and len(t["ref"]) == 4
    assert capture.verify(t["token"], "res-2", now=1100) is None                       # someone else's
    assert capture.verify(t["token"], "res-1", now=1000 + config.CAPTURE_MAX_AGE_S + 1) is None   # too old
    ts, n, sig = t["token"].split(".")
    assert capture.verify(f"{ts}.{n}.{'0' * 32}", "res-1", now=1100) is None           # forged
    assert capture.verify(None, "res-1") is None and capture.verify("junk", "res-1") is None


def test_token_endpoint_needs_a_resident(client):
    assert client.get("/api/capture-token").status_code == 401
    assert client.get("/api/capture-token", headers=as_("off-mcd")).status_code == 403
    j = client.get("/api/capture-token", headers=as_("res-1")).json()
    assert capture.verify(j["token"], "res-1") == j["ref"]


def submit(c, token="", user="res-1"):
    return c.post("/api/incidents", data={"lat": 28.6433, "lon": 77.1846, "kind": "blocked_drain", "capture_token": token},
                  files={"photo": ("p.jpg", picture(11), "image/jpeg")}, headers=as_(user)).json()


def test_no_token_is_info_by_default_and_held_when_required(client, monkeypatch):
    r = submit(client)
    assert "photo_not_live" in codes(r["flags"]) and not r["held_for_review"]
    monkeypatch.setattr(config, "REQUIRE_LIVE_CAPTURE", True)
    r = submit(client)
    assert r["held_for_review"] and r["task_id"] is None


def test_valid_token_passes_required_mode_when_stamp_is_unreadable(client, monkeypatch):
    monkeypatch.setattr(config, "REQUIRE_LIVE_CAPTURE", True)
    tok = client.get("/api/capture-token", headers=as_("res-1")).json()["token"]
    r = submit(client, tok)
    assert "photo_not_live" not in codes(r["flags"])
    # Bedrock off -> stamp cannot be read; that is info, not a hold
    assert "stamp_unverified" in codes(r["flags"]) and not r["held_for_review"]


def test_stamp_read_wiring(monkeypatch):
    monkeypatch.setattr(config, "TRIAGE_MODE", "manual")
    assert stampread.read_stamp(b"x", "image/jpeg") is None
    monkeypatch.setattr(config, "TRIAGE_MODE", "bedrock")
    monkeypatch.setattr(config, "BEDROCK_MODEL_ID", "m")
    import boto3

    class Br:
        def __init__(self, text): self.text = text
        def converse(self, **kw): return {"output": {"message": {"content": [{"text": self.text}]}}}

    monkeypatch.setattr(boto3, "client", lambda *a, **k: Br("NONE"))
    assert stampread.read_stamp(b"x", "image/jpeg") == ""
    monkeypatch.setattr(boto3, "client", lambda *a, **k: Br(TEXT))
    assert "28.54159" in stampread.read_stamp(b"x", "image/jpeg")
    monkeypatch.setattr(boto3, "client", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("denied")))
    assert stampread.read_stamp(b"x", "image/jpeg") is None


def test_wrong_stamp_through_the_api_is_held(client, monkeypatch):
    monkeypatch.setattr(stampread, "read_stamp", lambda *a: TEXT)      # stamp says Qutab, report says 28.6433,77.1846
    r = submit(client)
    assert "stamp_gps_mismatch" in codes(r["flags"]) and r["held_for_review"]

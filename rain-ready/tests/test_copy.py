"""Safety copy and banned words. Owner: dev#4."""
from core import safety_copy


# ---- safety copy ----
def test_no_banned_words_in_any_user_facing_string():
    for s in safety_copy.all_strings():
        assert not safety_copy.BANNED.search(s), s


def test_every_message_carries_footer_and_both_languages():
    for lvl in ("HIGH_ATTENTION", "ELEVATED", "NO_SPECIFIC_FLAG"):
        for lang in ("en", "hi"):
            for storm in (True, False):
                m = safety_copy.building_message(lvl, lang, storm)
                assert m["footer"] == safety_copy.FOOTER[lang] and m["items"]




def test_api_user_facing_json_has_no_banned_words(tmp_path, monkeypatch):
    """Walk real API output (strings only) so text outside safety_copy cannot slip in banned words."""
    from fastapi.testclient import TestClient
    from app import config, db
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "t.db"))
    monkeypatch.setattr(db, "_con", None)
    from app.main import app

    def strings(o):
        if isinstance(o, str):
            yield o
        elif isinstance(o, dict):
            for k, v in o.items():
                if k not in ("note",):          # seed notes are data and are not exposed in the UI today
                    yield from strings(v)
        elif isinstance(o, list):
            for v in o:
                yield from strings(v)

    with TestClient(app) as c:
        bodies = [c.get(p).json() for p in ("/api/map", "/api/lowpoints", "/api/replay", "/api/capture/presets", "/api/state", "/api/board")]
        bodies.append(c.post("/api/lowpoints/simulate", json={"rain_mm_h": 60}).json())
        bodies.append(c.post("/api/capture/plan", json={"roof_m2": 600, "water_table_m": 12, "soil": "sandy_loam", "has_vehicular_or_wash_runoff": True}).json())
    for b in bodies:
        for t in strings(b):
            assert not safety_copy.BANNED.search(t), t
    monkeypatch.setattr(db, "_con", None)

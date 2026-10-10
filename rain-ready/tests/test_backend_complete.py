"""Persona keys (privileged roles) and the illustrative silt series."""
from datetime import date, timedelta

from app import config
from core import planning, projection

from .conftest import as_

KEYS = {"admin-1": "adm-secret", "off-mcd": "mcd-secret"}


def with_key(user, key=None):
    return {**as_(user), **({"X-Persona-Key": key} if key else {})}


# --- persona keys ----------------------------------------------------------------------------------------------
def test_parse_persona_keys():
    assert config.parse_persona_keys("admin-1:a, off-mcd:b ,,bad,x:") == {"admin-1": "a", "off-mcd": "b"}
    assert config.parse_persona_keys("") == {}


def test_without_keys_configured_nothing_changes(client, monkeypatch):
    monkeypatch.setattr(config, "PERSONA_KEYS", {})
    assert client.get("/api/incidents?held=true", headers=as_("admin-1")).status_code == 200


def test_privileged_personas_need_their_key(client, monkeypatch):
    monkeypatch.setattr(config, "PERSONA_KEYS", KEYS)
    url = "/api/incidents?held=true"
    assert client.get(url, headers=as_("admin-1")).status_code == 401
    assert client.get(url, headers=with_key("admin-1", "nope")).status_code == 401
    assert client.get(url, headers=with_key("admin-1", "mcd-secret")).status_code == 401      # another persona's key
    assert client.get(url, headers=with_key("admin-1", "adm-secret")).status_code == 200
    assert client.get(url, headers=with_key("off-mcd", "mcd-secret")).status_code == 200


def test_residents_and_public_reads_stay_open(client, monkeypatch):
    monkeypatch.setattr(config, "PERSONA_KEYS", KEYS)
    assert client.get("/api/incidents?mine=true", headers=as_("res-1")).status_code == 200
    assert client.get("/api/tasks").status_code == 200
    assert client.get("/api/health").status_code == 200


def test_privileged_persona_without_a_configured_key_is_refused(client, monkeypatch):
    monkeypatch.setattr(config, "PERSONA_KEYS", {"admin-1": "adm-secret"})       # off-pwd has no key: closed, not open
    assert client.get("/api/incidents?held=true", headers=with_key("off-pwd", "anything")).status_code == 401


def test_deep_health_needs_the_admin_key(client, monkeypatch):
    monkeypatch.setattr(config, "PERSONA_KEYS", KEYS)
    assert client.get("/api/health?deep=1", headers=as_("admin-1")).status_code in (401, 403)


# --- illustrative silt -----------------------------------------------------------------------------------------
def test_series_is_repeatable_and_labelled():
    a, b = projection.silt_series_illustrative("DR-1"), projection.silt_series_illustrative("DR-1")
    assert a == b and a["illustrative"] is True and "not a measurement" in a["note"]
    assert a != projection.silt_series_illustrative("DR-2")                      # another drain jitters differently


def test_series_rises_overall_stays_near_the_model_and_below_the_ceiling():
    s = projection.silt_series_illustrative("DR-1")["points"]
    assert s[0] == {"days": 0, "silt_fraction": 0.0}
    assert s[-1]["silt_fraction"] > 0.4 and all(0 <= p["silt_fraction"] <= planning.D_EQ for p in s)
    t = date(2000, 1, 1)
    for p in s[1:]:
        base = planning.silt_fraction(t, t + timedelta(days=p["days"]))
        assert abs(p["silt_fraction"] - base) <= 0.12 * base + 0.001
    assert any(b["silt_fraction"] < a["silt_fraction"] for a, b in zip(s, s[1:]))      # it jitters, with small dips


def test_series_does_not_touch_ranking(client):
    before = client.get("/api/actions").json()["actions"]
    j = client.get("/api/projection").json()
    assert j["silt_curve_illustrative"]["illustrative"] is True and j["silt_curve"][0]["days"] == 0
    assert client.get("/api/actions").json()["actions"] == before


def test_drain_detail_carries_its_own_series(client):
    aid = client.get("/api/map").json()["assets"][0]["id"]
    d = client.get(f"/api/assets/{aid}").json()
    assert d["silt_series_illustrative"]["points"] == projection.silt_series_illustrative(aid)["points"]
    assert d["silt_now"] == client.get(f"/api/assets/{aid}").json()["silt_now"]      # the real estimate is unchanged

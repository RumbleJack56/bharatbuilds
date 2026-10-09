from datetime import datetime, timedelta, timezone

from core import cluster
from .conftest import as_

NOW = datetime(2026, 10, 10, 12, 0, tzinfo=timezone.utc)
LAT, LON = 28.6433, 77.1846
M = 1 / 111_195          # degrees of latitude per metre


def test_boundary_distance_and_time():
    prior = lambda dm, age: [(LAT + dm * M, LON, NOW - age)]
    assert cluster.is_duplicate(LAT, LON, NOW, prior(30, timedelta(hours=1)))
    assert not cluster.is_duplicate(LAT, LON, NOW, prior(80, timedelta(hours=1)))
    assert cluster.is_duplicate(LAT, LON, NOW, prior(0, timedelta(hours=24)))
    assert not cluster.is_duplicate(LAT, LON, NOW, prior(0, timedelta(hours=24, seconds=1)))
    assert not cluster.is_duplicate(LAT, LON, NOW, [])


def _post(c, user, lat=LAT, lon=LON, **extra):
    return c.post("/api/incidents", data={"lat": lat, "lon": lon, "kind": "blocked_drain", **extra}, headers=as_(user)).json()


def test_repeat_report_by_same_user_is_held_and_not_counted(client):
    first = _post(client, "res-1")
    assert not first["held_for_review"] and first["task_id"]
    again = _post(client, "res-1")
    assert again["held_for_review"] and again["task_id"] is None
    assert [f["code"] for f in again["flags"]] == ["duplicate_nearby"]
    assert client.get(f"/api/tasks/{first['task_id']}").json()["report_count"] == 1


def test_other_user_counts_normally(client):
    first = _post(client, "res-1")
    other = _post(client, "res-2")
    assert not other["held_for_review"]
    assert client.get(f"/api/tasks/{first['task_id']}").json()["report_count"] == 2

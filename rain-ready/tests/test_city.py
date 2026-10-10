from .conftest import as_  # noqa: F401


def test_reference_tables_are_loaded_and_served(client):
    s = client.get("/api/city/summary").json()
    assert s["location_dates"] > 1000 and s["roads_in_inventory"] == 1297 and s["places"] > 500
    assert 0.8 < sum(s["by_month"][str(m)] for m in (6, 7, 8, 9)) / s["location_dates"] < 0.95
    assert set(s["location_dates_by_owner"]) <= {"pwd", "mcd", "unresolved"}


def test_insights_carry_evidence_and_one_action_each(client):
    ins = client.get("/api/city/insights").json()["insights"]
    assert {"chronic", "owner-gap", "season"} <= {i["id"] for i in ins}
    assert all(i["evidence"] and i["action"]["type"] and i["action"]["text"] for i in ins)


def test_places_filter_and_road_lookup(client):
    p = client.get("/api/city/places", params={"chronic": True, "limit": 5}).json()["places"]
    assert 0 < len(p) <= 5 and all(x["chronic"] and x["n_years"] >= 3 for x in p)
    code = next(x["pwd_code"] for x in client.get("/api/city/places", params={"owner": "pwd", "limit": 1}).json()["places"])
    r = client.get(f"/api/city/roads/{code}").json()
    assert r["asset_code"] == code and r["pwd_by_rule"] is True
    assert client.get("/api/city/roads/RD-000000").status_code == 404

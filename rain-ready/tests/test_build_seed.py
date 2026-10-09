import json
import shutil
from pathlib import Path

from core import geo, seedcheck
from scripts import build_seed

FIX = Path(__file__).parent / "fixtures"
BASE = json.loads((Path(__file__).resolve().parent.parent / "data" / "seed.json").read_text())


def test_midpoint_is_halfway_along_the_longest_line():
    lat, lon = build_seed.midpoint([[77.18, 28.64], [77.18, 28.644]])
    assert abs(lat - 28.642) < 1e-6 and lon == 77.18


def test_readers_and_merge():
    seed = build_seed.build(FIX, BASE)
    ids = [a["id"] for a in seed["assets"]]
    assert ids == ["way-1", "drains-0001"]                      # point feature skipped, id sanitised, name-less id generated
    a = seed["assets"][0]
    assert a["agency_id"] == "mcd" and a["owner_source"] == "fixture owner rule" and a["confidence"] == "medium"
    b = seed["assets"][1]
    assert b["agency_id"] is None and b["owner_source"] == "none"
    assert geo.haversine_m(b["lat"], b["lon"], 28.605, 77.30) < 5                # longest leg (the 1.1 km one) wins
    assert seed["pockets"][0]["linked_asset_ids"] == ["way-1", "drains-0001"] and seed["pockets"][0]["spills_to"] is None
    assert seedcheck.validate(seed) == []


def test_main_writes_valid_seed_and_refuses_invalid(tmp_path):
    src = tmp_path / "src"
    shutil.copytree(FIX, src)
    (src / "base.json").write_text(json.dumps(BASE))
    out = tmp_path / "seed.json"
    assert build_seed.main(["--src", str(src), "--out", str(out)]) == 0
    assert seedcheck.validate(json.loads(out.read_text())) == []
    (src / "owners.csv").write_text("asset_id,agency_id,owner_source\nway-1,ghost,x\n")
    out.unlink()
    assert build_seed.main(["--src", str(src), "--out", str(out)]) == 1 and not out.exists()

import copy
import json
from pathlib import Path

from core import seedcheck

REAL = json.loads((Path(__file__).resolve().parent.parent / "data" / "seed.json").read_text())


def bad(mutate) -> list[str]:
    s = copy.deepcopy(REAL)
    mutate(s)
    return seedcheck.validate(s)


def test_real_seed_passes():
    assert seedcheck.validate(REAL) == []


def test_each_rule_fails_on_its_own():
    assert any("duplicate id" in e for e in bad(lambda s: s["assets"].append(dict(s["assets"][0]))))
    assert any("data_source must be" in e for e in bad(lambda s: s["assets"][0].update(data_source="rumour")))
    assert any("confidence" in e for e in bad(lambda s: s["pockets"][0].pop("confidence")))
    assert any("needs a citation" in e for e in bad(lambda s: s["assets"][0].update(data_source="osm")))
    assert not bad(lambda s: s["assets"][0].update(data_source="osm", citation="OpenStreetMap, 2026-10"))
    assert any("owner_source" in e for e in bad(lambda s: s["assets"][0].update(owner_source="")))
    assert any("outside the Delhi-NCR" in e for e in bad(lambda s: s["pockets"][0].update(lat=19.0)))
    assert any("unknown asset" in e for e in bad(lambda s: s["pockets"][0].update(linked_asset_ids=["NOPE"])))
    assert any("unknown agency_id" in e for e in bad(lambda s: s["assets"][0].update(agency_id="ghost")))
    assert any("spills_to" in e for e in bad(lambda s: s["pockets"][0].update(spills_to="NOPE")))
    assert any("missing" in e for e in bad(lambda s: s.pop("sites")))

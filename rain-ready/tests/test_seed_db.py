"""scripts/seed_db.py builds a complete database; scripts/verify_db.py says so, and names what is wrong when it is not."""
import sqlite3

import pytest

from app import config, db
from scripts import seed_db, verify_db


@pytest.fixture()
def built(tmp_path, monkeypatch):
    for k, v in (("DB_PATH", str(tmp_path / "x.db")), ("PHOTO_DIR", str(tmp_path / "p")), ("SEED_PATH", config.SEED_PATH)):
        monkeypatch.setattr(config, k, v)                    # restored at teardown, since seed_db assigns these directly
    path = tmp_path / "seeded.db"
    assert seed_db.main(["--db", str(path)]) == 0
    db.reset_connection()
    return path


def test_seed_builds_a_clean_database_that_verifies(built):
    res = verify_db.checks(built, verify_db.ROOT / "data" / "seed.json")
    assert all(ok for _, ok, _ in res), [r for r in res if not r[1]]
    assert any("clean: no rehearsal history" in d for _, _, d in res)
    con = sqlite3.connect(built)
    assert con.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 0
    assert con.execute("SELECT COUNT(*) FROM assets").fetchone()[0] == 9
    assert con.execute("SELECT value FROM app_meta WHERE key='data_mode'").fetchone() is None


def test_seed_refuses_to_overwrite_without_force(built, capsys):
    assert seed_db.main(["--db", str(built)]) == 1
    assert "--force" in capsys.readouterr().err


def test_verify_names_the_check_that_fails(built):
    con = sqlite3.connect(built)
    con.execute("DELETE FROM ref_places WHERE key IN (SELECT key FROM ref_places LIMIT 5)")
    con.execute("UPDATE assets SET owner_source='' WHERE id='DR-OSM-A'")
    con.commit()
    con.close()
    failed = {n for n, ok, _ in verify_db.checks(built, verify_db.ROOT / "data" / "seed.json") if not ok}
    assert failed == {"ref_places matches eda.json", "every drain has an owner source"}

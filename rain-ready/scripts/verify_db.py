"""Check that a database was seeded completely and that the backend reads it. Read only: the API check runs on a temporary copy.
  python -m scripts.verify_db [--db var/rainready.db] [--seed data/seed.json]
Exit 0 when every check passes, 1 otherwise. Output is one line per check."""
import argparse
import csv
import json
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def checks(path: Path, seed_path: Path) -> list[tuple[str, bool, str]]:
    out: list[tuple[str, bool, str]] = []

    def add(name: str, ok: bool, detail: str = "") -> None:
        out.append((name, bool(ok), detail))

    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    q = lambda sql, *a: con.execute(sql, a).fetchone()[0]                    # noqa: E731
    tables = {r["name"] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    need = {"agencies", "users", "assets", "pockets", "sites", "incidents", "tasks", "task_events", "app_meta",
            "ref_roads", "ref_waterlog_events", "ref_places", "eda_insights"}
    add("schema: all tables present", need <= tables, "missing " + ", ".join(sorted(need - tables)) if need - tables else f"{len(need)} tables")
    if need - tables:
        return out
    add("sqlite integrity_check", q("PRAGMA integrity_check") == "ok")
    add("foreign keys consistent", not con.execute("PRAGMA foreign_key_check").fetchall())

    seed = json.loads(seed_path.read_text())
    for t in ("agencies", "users", "assets", "pockets", "sites"):
        have = {r["id"] for r in con.execute(f"SELECT id FROM {t}")}
        want = {r["id"] for r in seed[t]}
        add(f"seed rows in {t}", want <= have, f"{len(have & want)} of {len(want)} seed rows" + (f"; missing {sorted(want - have)[:3]}" if want - have else ""))
    ids = {r["id"] for r in con.execute("SELECT id FROM assets")}
    bad = [(r["id"], a) for r in con.execute("SELECT id, linked_asset_ids FROM pockets") for a in json.loads(r["linked_asset_ids"]) if a not in ids]
    add("pockets link only to known drains", not bad, str(bad[:3]) if bad else "")
    add("no task points at an unknown drain", q("SELECT COUNT(*) FROM tasks WHERE asset_id NOT IN (SELECT id FROM assets)") == 0)
    add("every drain has an owner source", q("SELECT COUNT(*) FROM assets WHERE owner_source IS NULL OR owner_source=''") == 0)
    add("every real-source row has a citation",
        q("SELECT COUNT(*) FROM assets WHERE data_source NOT IN ('placeholder','hypothetical') AND (citation IS NULL OR citation='')") == 0
        and q("SELECT COUNT(*) FROM pockets WHERE data_source NOT IN ('placeholder','hypothetical') AND (citation IS NULL OR citation='')") == 0)

    pwd = json.loads((ROOT / "data" / "raw" / "pwd_roads.json").read_text())["roads"]
    add("ref_roads matches the PWD snapshot", q("SELECT COUNT(*) FROM ref_roads") == len(pwd), f"{q('SELECT COUNT(*) FROM ref_roads')} of {len(pwd)}")
    n_dates = sum(len([d for d in r["dates"].split(";") if d]) for r in csv.DictReader((ROOT / "data" / "raw" / "fco_rows.csv").open(newline="")))
    add("ref_waterlog_events matches the parsed lists", q("SELECT COUNT(*) FROM ref_waterlog_events") == n_dates,
        f"{q('SELECT COUNT(*) FROM ref_waterlog_events')} of {n_dates}")
    eda = json.loads((ROOT / "data" / "consolidated" / "eda.json").read_text())
    add("ref_places matches eda.json", q("SELECT COUNT(*) FROM ref_places") == len(eda["places"]), f"{q('SELECT COUNT(*) FROM ref_places')} of {len(eda['places'])}")
    add("eda_insights matches eda.json", q("SELECT COUNT(*) FROM eda_insights") == len(eda["insights"]))
    add("chronic places flagged", q("SELECT COUNT(*) FROM ref_places WHERE chronic=1") == len(eda["chronic"]))

    mode = con.execute("SELECT value FROM app_meta WHERE key='data_mode'").fetchone()
    add("data mode recorded", True, "rehearsal history (demo_history)" if mode else "clean: no rehearsal history")
    if not mode:
        add("clean database has no tasks or reports", q("SELECT COUNT(*) FROM tasks") + q("SELECT COUNT(*) FROM incidents") == 0,
            f"{q('SELECT COUNT(*) FROM tasks')} tasks, {q('SELECT COUNT(*) FROM incidents')} reports")
    n_assets, n_pockets = q("SELECT COUNT(*) FROM assets"), q("SELECT COUNT(*) FROM pockets")
    con.close()

    tmp = Path(tempfile.mkdtemp())
    shutil.copy(path, tmp / "copy.db")                                       # the API check never writes to the real file
    from fastapi.testclient import TestClient

    from app import config, db
    config.DB_PATH, config.PHOTO_DIR = str(tmp / "copy.db"), str(tmp / "p")
    db.reset_connection()
    from app.main import app
    with TestClient(app) as c:
        h = c.get("/api/health").json()
        add("API: health ok, no router errors", h["ok"] and not h["router_errors"], f"routers {len(h['routers'])}")
        m = c.get("/api/map").json()
        add("API: /api/map serves every drain and pocket", len(m["assets"]) == n_assets and len(m["pockets"]) == n_pockets,
            f"{len(m['assets'])} drains, {len(m['pockets'])} pockets")
        s = c.get("/api/city/summary").json()
        add("API: /api/city/summary reads the evidence base", s["roads_in_inventory"] == len(pwd) and s["location_dates"] == n_dates, f"{s['location_dates']} location-dates")
        a = c.get("/api/actions", params={"top": 50}).json()
        add("API: /api/actions covers every drain", a["total"] == n_assets, f"{a['total']} actions")
        add("API: /api/leaderboard answers", "agencies" in c.get("/api/leaderboard").json())
        add("API: /api/projection answers", bool(c.get("/api/projection").json()["scenarios"]))
        add("API: /board is served", c.get("/board").status_code == 200)
    db.reset_connection()
    shutil.rmtree(tmp, ignore_errors=True)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(ROOT / "var" / "rainready.db"))
    ap.add_argument("--seed", default=str(ROOT / "data" / "seed.json"))
    a = ap.parse_args(argv)
    if not Path(a.db).exists():
        print(f"{a.db} does not exist. Build it with: python -m scripts.seed_db --db {a.db}", file=sys.stderr)
        return 1
    res = checks(Path(a.db), Path(a.seed))
    for name, ok, detail in res:
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail else ""))
    failed = sum(1 for _, ok, _ in res if not ok)
    print(f"\n{len(res) - failed} of {len(res)} checks passed" + ("" if not failed else f"; {failed} failed"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

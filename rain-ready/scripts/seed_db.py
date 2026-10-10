"""Build the database the app runs on: schema, real seed, Delhi evidence base, and (with --demo) 84 days of rehearsal history.
  python -m scripts.seed_db [--db var/rainready.db] [--demo] [--force]
Refuses to overwrite an existing database without --force. The server then starts on it:  DB_PATH=var/rainready.db make run"""
import argparse
import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from app import config, db

ROOT = Path(__file__).resolve().parent.parent


def counts(con) -> dict:
    q = lambda t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]          # noqa: E731
    return {t: q(t) for t in ("agencies", "users", "assets", "pockets", "sites", "incidents", "tasks", "task_events",
                              "ref_roads", "ref_waterlog_events", "ref_places", "eda_insights")}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(ROOT / "var" / "rainready.db"))
    ap.add_argument("--demo", action="store_true", help="add the 84-day rehearsal history through the API")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)
    path = Path(a.db)
    if path.exists() and not a.force:
        print(f"{path} exists. Use --force to rebuild it.", file=sys.stderr)
        return 1
    for suffix in ("", "-wal", "-shm"):
        Path(str(path) + suffix).unlink(missing_ok=True)
    config.DB_PATH = str(path)
    config.PHOTO_DIR = str(path.parent / "photos")
    db.reset_connection()
    from app.main import app
    with TestClient(app) as c:                                  # startup runs init_db: schema, seed, reference tables
        out = {"seed": config.SEED_PATH}
        if a.demo:
            from scripts import demo_history
            out["history"] = demo_history.build(c)
            con = db.get_db()
            con.execute("INSERT OR REPLACE INTO app_meta VALUES('data_mode','demo_history')")
            con.commit()
        out["counts"] = counts(db.get_db())
    db.reset_connection()
    print(json.dumps(out, indent=1, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""SQLite access + schema/seed bootstrap. Owner: dev#1.
Routers get a connection with `db: sqlite3.Connection = Depends(get_db)`; rows behave like dicts."""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from core import building as core_building

from . import config

ROOT = Path(__file__).resolve().parent.parent


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    Path(config.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(config.DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    return con


_con: sqlite3.Connection | None = None


def get_db():
    global _con
    if _con is None:
        _con = connect()
    return _con


def init_db() -> None:
    con = get_db()
    con.executescript((ROOT / "schema.sql").read_text())
    if con.execute("SELECT COUNT(*) FROM assets").fetchone()[0] == 0:
        seed(con)
    con.commit()


def seed(con: sqlite3.Connection) -> None:
    data = json.loads((ROOT / "data" / "seed.json").read_text())
    for k, v in data.get("settings", {}).items():
        con.execute("INSERT OR REPLACE INTO settings(key,value_json) VALUES(?,?)", (k, json.dumps(v)))
    for a in data["assets"]:
        cols = ",".join(a.keys())
        con.execute(f"INSERT OR REPLACE INTO assets({cols}) VALUES({','.join('?' * len(a))})", list(a.values()))
    for h in data["hotspots"]:
        cols = ",".join(h.keys())
        con.execute(f"INSERT OR REPLACE INTO hotspots({cols}) VALUES({','.join('?' * len(h))})", list(h.values()))
    for j in data.get("jobs", []):
        cols = ",".join(j.keys())
        con.execute(f"INSERT OR REPLACE INTO jobs({cols}) VALUES({','.join('?' * len(j))})", list(j.values()))
    for lp in data.get("lowpoints", []):
        cols = ",".join(lp.keys())
        con.execute(f"INSERT OR REPLACE INTO lowpoints({cols}) VALUES({','.join('?' * len(lp))})", list(lp.values()))
    for b in data.get("buildings", []):
        level, reasons = core_building.building_level(
            bool(b["basement"]), bool(b["entrance_below_road"]), bool(b["people_inside"]),
            bool(b["ramp_over_drain"]), bool(b["near_listed_hotspot_200m"]))
        row = dict(b, level=level, reasons_json=json.dumps(reasons), created_at=now_iso())
        cols = ",".join(row.keys())
        con.execute(f"INSERT OR REPLACE INTO buildings({cols}) VALUES({','.join('?' * len(row))})", list(row.values()))

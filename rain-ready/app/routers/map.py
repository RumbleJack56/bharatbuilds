"""Map data. Owner: P4. THIS FILE IS THE REFERENCE PATTERN: a router that reads the DB, calls pure core/ functions,
and returns the shape promised in openapi.yaml."""
from datetime import date

from fastapi import APIRouter, Depends

from core import scoring

from ..db import get_db
from .ops import read_storm

router = APIRouter(prefix="/api")


def _d(s):
    return date.fromisoformat(s) if s else None


@router.get("/map")
def map_data(db=Depends(get_db)):
    storm = read_storm(db)
    today = date.today()
    assets = []
    for a in db.execute("SELECT * FROM assets"):
        clusters = db.execute(
            "SELECT COUNT(DISTINCT cluster_id) FROM reports WHERE asset_id=? AND status='corroborated' AND cluster_id IS NOT NULL",
            (a["id"],)).fetchone()[0]
        st = scoring.AssetState(
            hotspot_listed=bool(a["hotspot_listed"]), standing_water_last_monsoon=bool(a["standing_water_last_monsoon"]),
            source_near_m=a["source_near_m"], consequence=a["consequence"],
            last_confirmed_clean=_d(a["last_confirmed_clean"]), silt_measured=a["silt_measured"],
            silt_measured_on=_d(a["silt_measured_on"]))
        v, basis, comp = scoring.vulnerability(st, today, clusters)
        job = db.execute("SELECT id, level, status FROM jobs WHERE asset_id=? ORDER BY id DESC LIMIT 1", (a["id"],)).fetchone()
        assets.append({
            "id": a["id"], "type": a["type"], "name": a["name"], "lat": a["lat"], "lon": a["lon"], "owner": a["owner"],
            "covered": bool(a["covered"]), "v": v, "basis": basis, "components": comp,
            "tier": scoring.tier(v, storm["active"]), "last_confirmed_clean": a["last_confirmed_clean"],
            "data_source": a["data_source"], "confidence": a["confidence"],
            "job": dict(job) if job else None})
    hotspots = [dict(h) for h in db.execute("SELECT id,name,kind,lat,lon,data_source,year,note FROM hotspots")]
    reports = [dict(r) for r in db.execute(
        "SELECT id,ticket,category,lat,lon,status,created_at FROM reports ORDER BY id DESC LIMIT 200")]
    return {"storm": storm, "assets": assets, "hotspots": hotspots, "reports": reports,
            "disclaimer": "Information only. Not a safety guarantee. Official warnings: IMD / NDMA Sachet."}

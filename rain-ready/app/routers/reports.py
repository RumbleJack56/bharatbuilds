"""Generated ward report: counts and rankings from the database, fixed wording. Public, read-only."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse

from core import copy, insights, planning, report

from .. import clock, facts, service
from ..db import get_db

router = APIRouter(prefix="/api")


def ranked_drains(db, f: dict, n: int) -> list[dict]:
    pockets, silt = service.pocket_rows(db), {a["id"]: a["silt"] for a in f["assets"]}
    names = {g["id"]: g["name"] for g in f["agencies"]}
    scored = sorted(((planning.gain_if_cleaned(pockets, silt, a["id"])["gain_h"], a) for a in f["assets"]),
                    key=lambda x: (-x[0], x[1]["id"]))
    out = []
    for gain, a in scored[:n]:
        if gain <= 0:
            break
        lo, hi = planning.gain_range(pockets, silt, a["id"])
        out.append({"id": a["id"], "name": a["name"], "gain_h": gain, "gain_h_low": lo, "gain_h_high": hi,
                    "agency_name": names.get(a["agency_id"], copy.NO_OWNER), "data_source": a["data_source"]})
    return out


@router.get("/reports/ward")
def ward_report(format: str = Query("json", pattern="^(json|md)$"), db=Depends(get_db)):
    now = clock.now()
    f = facts.ward_facts(db, now)
    r = report.build(f, ranked_drains(db, f, report.TOP_N), insights.build(f, now), now)
    if format == "md":
        return PlainTextResponse(report.to_markdown(r), media_type="text/markdown; charset=utf-8")
    return r

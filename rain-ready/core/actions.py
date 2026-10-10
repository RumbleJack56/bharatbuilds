"""Action plan from the ward's facts: what to do, who it goes to, why, and the evidence. Pure.
Fixed sentences with numbers filled in; no model writes them. Facts and routing only: nothing here asks anyone to enter a drain."""
from datetime import date

from . import copy, planning

SILT_MIN = 0.25            # same threshold as the insights: a silt estimate at or above this counts as silted
COORDINATOR = "Ward coordinator"


def _span(lo: float, hi: float) -> str:
    return f"{lo:g} to {hi:g}"


def _owner_reason(asset: dict) -> str:
    src = (asset.get("owner_source") or "none").split(". ")[0].strip()
    return src if src and src != "none" else "No source assigns this drain to an agency."


def one(asset: dict, gain: dict, pocket: dict | None, task: dict | None, agency_name: str, today: date, due_days: int) -> dict:
    """A single action for one drain. asset: row + silt + report_count. gain: {gain_h, lo, hi, pocket_id}."""
    silt, g = asset["silt"], gain["gain_h"]
    last = asset["last_confirmed_clean"]
    since = (today - date.fromisoformat(last)).days if last else None
    where = pocket["name"] if pocket else "its pocket"
    owned = asset["agency_id"] is not None
    if not owned:
        kind = "clarify_owner"
        text = (f"Find who owns {asset['name']} and record the source. {asset['report_count']} report(s) are waiting and no agency can accept the task.")
    elif g > 0 and silt >= SILT_MIN:
        kind = "clean"
        text = (f"Clean {asset['name']}. About {_span(gain['lo'], gain['hi'])} h more fill time at {where}. Owner: {agency_name}.")
    elif g > 0:
        kind = "inspect"
        text = (f"Inspect {asset['name']} and the outlet it drains to. Its silt estimate is low "
                f"({round(100 * silt)}%) but {where} still gains about {_span(gain['lo'], gain['hi'])} h if it is cleared. Owner: {agency_name}.")
    else:
        kind = "monitor"
        text = f"No action now for {asset['name']}: cleaning it would not change the fill time at the reference rain."
    evidence = [f"{asset['report_count']} resident report(s)",
                "last confirmed clean: " + (f"{last} ({since} days ago)" if last else "none on record"),
                f"silt estimate {round(100 * silt)}% (a prior from days since the last confirmed clean)",
                f"owner source: {_owner_reason(asset)}"]
    if pocket:
        evidence.append(f"{pocket['name']}: {pocket['level']} at {planning.REF_RAIN_MM_H:g} mm/h"
                        + (f", fills in about {pocket['time_to_fill_h']} h" if pocket.get("time_to_fill_h") is not None else ""))
    return {"asset_id": asset["id"], "asset_name": asset["name"], "type": kind, "text": text,
            "route": {"agency_id": asset["agency_id"], "agency_name": agency_name if owned else COORDINATOR,
                      "why": _owner_reason(asset), "needs_coordinator": not owned},
            "pocket_id": gain.get("pocket_id"), "gain_h": g, "gain_h_low": gain["lo"], "gain_h_high": gain["hi"],
            "rank_score": planning.rank_score(g, asset["report_count"]), "due_in_days": due_days, "evidence_reports": asset["report_count"],
            "status": "dispatched" if task else "proposed", "task_id": task["id"] if task else None,
            "task_status": task["status"] if task else None, "evidence": evidence,
            "data_source": asset["data_source"], "confidence": asset["confidence"]}


def plan(assets: list[dict], gains: dict[str, dict], pockets: dict[str, dict], live_tasks: dict[str, dict],
         agency_names: dict[str, str], today: date, due_days: int) -> list[dict]:
    acts = [one(a, gains[a["id"]], pockets.get(gains[a["id"]].get("pocket_id")), live_tasks.get(a["id"]),
                agency_names.get(a["agency_id"], copy.NO_OWNER), today, due_days) for a in assets]
    def bucket(x: dict) -> int:                      # unowned with reports waiting, then cleaning by gain, then the rest
        if x["type"] == "clarify_owner":
            return 0 if x["evidence_reports"] > 0 else 2
        return 1 if x["gain_h"] > 0 else 3
    return sorted(acts, key=lambda x: (bucket(x), -x["rank_score"], x["asset_id"]))

"""data/consolidated/eda.json -> docs/eda-report.html (self-contained). Run after scripts/run_eda.py.
  python -m scripts.make_eda_report [--fragment PATH]     fragment: no doctype or head, for the Artifact publish"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def payload() -> dict:
    e = json.loads((ROOT / "data" / "consolidated" / "eda.json").read_text())
    dist = Counter(p["n_dates"] for p in e["places"])
    days = sorted(e["days"]["counts"].items(), key=lambda kv: -kv[1])
    return {"insights": e["insights"], "profile": e["profile"], "validate": e["validate"], "days": {"top": days[:5], "sizes": [n for _, n in days],
            "median": e["days"]["median_places"], "n_days": e["days"]["n_days"], "top5_share": e["days"]["top5_share"]},
            "roads": e["roads"], "ownership": e["ownership"], "pilot": e["pilot"], "dist": sorted(dist.items()),
            "chronic": [{"road": c["road"], "place": c["place"], "n_dates": c["n_dates"], "years": c["years"], "agency_id": c["agency_id"],
                         "pwd_code": c["pwd_code"], "row": c["right_of_way_m"]} for c in e["chronic"]],
            "n_places": len(e["places"])}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fragment")
    a = ap.parse_args(argv)
    body = (Path(__file__).parent / "eda_report_template.html").read_text().replace("/*DATA*/null", json.dumps(payload(), separators=(",", ":"), default=list))
    head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
    (ROOT / "docs" / "eda-report.html").write_text(head + body + "\n</body></html>\n")
    if a.fragment:
        Path(a.fragment).write_text(body)
    print(f"wrote docs/eda-report.html ({len(body) // 1024} KB)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

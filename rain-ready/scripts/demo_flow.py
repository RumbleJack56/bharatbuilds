"""The demo lifecycle, live, against a running server: complaint, linking, drain data, history, projection, action plan, routing,
resolution, effect, and the public record. Every number printed is a real response.
  make demo-db && DB_PATH=var/rainready.db make run          # terminal 1
  python -m scripts.demo_flow --base http://localhost:8010    # terminal 2   (add --markdown docs/DEMO_RUN.md to keep a transcript)
Rehearsal data and demo personas only. Not real complaints."""
import argparse
import sys
from pathlib import Path

import httpx

from scripts.demo_kit import Api

SPOT = (28.63925, 77.18386)            # Old Rajinder Nagar, on the Bazaar Marg drain: the pocket that started this
ASSET, POCKET = "DR-DN-BAZ", "LP-ORN"
OUT: list[str] = []


def say(text="", md=None):
    print(text)
    OUT.append(md if md is not None else text)


def act(n, title, line):
    say(f"\n=== Act {n}: {title} ===\n{line}", f"\n## Act {n}: {title}\n\n*{line}*\n")


def show(label, value, indent=2):
    say(" " * indent + f"{label}: {value}", f"- **{label.strip()}**: {value}")


def pocket(c, rain, horizon=0):
    s = c.get("/api/projection", params={"rain": rain, "horizon": horizon}).json()["scenarios"][0]["pockets"]
    return next(p for p in s if p["id"] == POCKET)


def run(base: str) -> int:
    c = httpx.Client(base_url=base, timeout=30)
    api = Api(c)
    if not c.get("/api/health").json()["ok"]:
        print("server not healthy", file=sys.stderr)
        return 1
    banner = c.get("/api/leaderboard").json()
    if banner["demo"]:
        say(f"NOTE: {banner['demo_note']}", f"> {banner['demo_note']}")

    act(0, "Delhi evidence base", "Before any complaint: what the city's own records say, and what they ask for.")
    s = c.get("/api/city/summary").json()
    show("recorded waterlogging", f"{s['location_dates']:,} location-dates on {s['days']} days, {s['places']} places, {s['chronic_places']} listed in 3+ years")
    for i in c.get("/api/city/insights").json()["insights"][:3]:
        show(i["id"], i["text"])
        show("  action", i["action"]["text"])

    act(1, "A resident reports a problem", "A resident near Bazaar Marg photographs a blocked drain and sends the report with the photo's location and time.")
    r = api.report("res-1", *SPOT, "drain mouth under the ramp is packed with silt and plastic", off=(0.00002, 0.00003))
    show("linked to drain", f"{r['linked_asset']} at {r['distance_m']} m")
    show("task", f"#{r['task_id']} ({'created' if r['task_created'] else 'added to an open task'})")
    show("photo checks", [f"{f['code']} ({f['level']})" for f in r["flags"]] or "none")
    show("field rule", r["field_rule"])
    tid = r["task_id"]

    act(2, "The drainage data behind the link", "What the system knows about that drain: who owns it, on what evidence, and when it was last cleaned.")
    a = c.get(f"/api/assets/{r['linked_asset']}").json()
    show("drain", f"{a['asset']['name']} ({a['asset']['data_source']}, confidence {a['asset']['confidence']})")
    show("owner", f"{a['asset']['agency_name']}. Source: {a['asset']['owner_source'][:170]}")
    show("cleaning history", [(h["completed_at"][:10], h["status"]) for h in a["cleaning_history"]] or "none on record")
    show("last confirmed clean", f"{a['asset']['last_confirmed_clean']} ({a['days_since_clean']} days ago)")
    show("silt estimate now / in 30 / 60 / 90 days if not cleaned",
         f"{a['silt_now']:.0%} / " + " / ".join(f"{a['silt_if_not_cleaned'][k]:.0%}" for k in ("30", "60", "90")))
    show("pocket it serves", [f"{p['name']}: {p['level']}, fills in about {p['time_to_fill_h']} h" for p in a["pockets"]])

    act(3, "Runoff, drain use and silt: scenario projections", "What the pocket does at three rain rates, now and if nothing is cleaned for 60 days.")
    rows = []
    for rain in (20, 35, 50):
        for h in (0, 60):
            p = pocket(c, rain, h)
            rows.append(p)
            show(f"{rain} mm/h, +{h} days", f"runoff {p['runoff_m3_h']} m3/h, drain used {p['utilisation_pct']}%, silt {p['silt_fraction']:.0%}, "
                 f"fills in {p['time_to_fill_h_low']} to {p['time_to_fill_h_high']} h ({p['level']})")
    before = pocket(c, 35)

    act(4, "The action plan and who it goes to", "Each drain gets one action, routed to the agency its owner record names, with the reason.")
    plan = c.get("/api/actions", params={"top": 4}).json()
    for x in plan["actions"]:
        show(f"{x['type']} · {x['asset_id']}", f"{x['text']}  → {x['route']['agency_name']} ({x['status']})")
        show("  why routed", x["route"]["why"][:150])
    t = c.get(f"/api/tasks/{tid}").json()
    show("this task is routed to", f"{t['agency_name']} (due {t['due_at'][:10]})")

    act(5, "The agency acts, a different resident checks", "Accept, clean and photograph, then someone who is not the cleaner confirms from the photos.")
    boss = {"mcd": "off-mcd", "pwd": "off-pwd"}.get(t["agency_id"])
    if not boss:
        say("  task has no agency yet: the coordinator assigns it")
        api.assign("admin-1", tid, "mcd")
        boss = "off-mcd"
    api.accept(boss, tid)
    done = api.complete(boss, tid, "ramp lifted, drain mouth cleared, outlet flushed", *SPOT)
    show("after-photo checks", [f"{f['code']} ({f['level']})" for e in done.json()["events"] for f in e["flags"]] or "none")
    me = api.confirm(boss, tid, True)
    show("the cleaner confirming their own job", f"refused ({me.status_code})")
    ok = api.confirm("res-2", tid, True, "water drained within minutes of the next shower")
    show("a different resident confirms", ok.json()["status"])

    act(6, "Did it help?", "The same projection after the confirmed clean. A scenario at 35 mm/h with illustrative parameters, not a forecast.")
    after = pocket(c, 35)
    show("silt", f"{before['silt_fraction']:.0%} → {after['silt_fraction']:.0%}")
    show("drain used", f"{before['utilisation_pct']}% → {after['utilisation_pct']}%")
    show("fills in", f"{before['time_to_fill_h']} h → {after['time_to_fill_h']} h ({before['time_to_fill_h_low']}-{before['time_to_fill_h_high']} → "
         f"{after['time_to_fill_h_low']}-{after['time_to_fill_h_high']})")
    imp = c.get("/api/impact").json()
    show("fill time gained by confirmed jobs (scenario)", f"{imp['fill_time_gained_h']} h across {imp['tasks']['confirmed']} jobs")

    act(7, "The public record", "No login. Agencies are scored from this log by a printed formula. Roles are shown, never names.")
    lb = c.get("/api/leaderboard").json()
    for g in lb["agencies"]:
        show(f"#{g['rank'] or '-'} {g['agency_name']}", f"score {g['score']}; accepted in 48 h {g['components']['response']}, on time {g['components']['delivery']}, "
             f"confirmed {g['components']['verified']}, median {g['median_hours_to_accept']} h to accept")
    log = next(x for x in c.get("/api/transparency", params={"limit": 50}).json()["actions"] if x["task_id"] == tid)
    for e in log["timeline"]:
        show(f"  {e['at'][:16]}", f"{e['label']} · {e['by']}")
    show("page for the public", f"{base}/board")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8010")
    ap.add_argument("--markdown")
    a = ap.parse_args(argv)
    rc = run(a.base)
    if a.markdown:
        Path(a.markdown).write_text("# Demo run\n\nGenerated by `python -m scripts.demo_flow`. Rehearsal data and demo personas.\n" + "\n".join(OUT) + "\n")
    return rc


if __name__ == "__main__":
    sys.exit(main())

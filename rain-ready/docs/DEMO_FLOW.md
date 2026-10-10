# Demo flow: complaint to effect, in about 6 minutes

Everything below runs on real endpoints. The database holds **rehearsal data** (84 days of reports and jobs made by the team). Say so
once, early: "These are rehearsal records, not real complaints, and they say nothing about how any agency performs." The pages say it too.

## Setup (once, two terminals)
```
make demo-db                              # schema, real seed, Delhi evidence base, 84 days of rehearsal history
DB_PATH=var/rainready.db make run         # terminal 1: http://localhost:8010
make demo BASE=http://localhost:8010      # terminal 2: the whole flow, narrated (add --markdown docs/DEMO_RUN.md to keep a transcript)
```
Open `http://localhost:8010/board` in a browser tab before you start. `make demo-db` again resets everything.

## The acts (what to say, what to show)

| Act | Say | Show | Endpoint |
|---|---|---|---|
| 0 Delhi evidence | "1,100 recorded waterlogging events across Delhi, and only half sit on a road we can name an owner for." | `docs/eda-report.html`: findings and their actions | `/api/city/summary`, `/api/city/insights` |
| 1 The complaint | "A resident photographs the drain at Bazaar Marg. The photo carries its location and time." | the report card: linked drain, distance, field rule, photo checks | `POST /api/incidents` |
| 2 Drainage data and history | "The system links it to the nearest drain and shows who owns it and on what evidence, and when it was last cleaned." | owner and source, cleaning history, silt now and in 30/60/90 days | `GET /api/assets/{id}` |
| 3 Runoff, use and silt | "At 25 mm/h this pocket sends 1,200 m3/h to a drain that is already past what it can carry: 281% used. The silt figure is an estimate; with no cleaning date on record it stays at the 50% prior, so we say so." | the 6-row table: runoff, drain used %, silt %, fill time as a range | `GET /api/projection` |
| 4 Action plan and routing | "One action per drain, each routed to the agency its owner record names. A drain with no owner goes to the coordinator, who assigns it." | top four actions with route and reason | `GET /api/actions` |
| 5 Resolution | "The agency accepts, cleans, photographs. The cleaner cannot confirm their own job. A different resident does." | accept, complete, refused self-confirm (403), independent confirm | `/api/tasks/{id}/...` |
| 6 Did it help | "Same scenario after the confirmed clean: silt 31% to 0%, drain used 253% to 159%, fill time 0.9 h to 1.4 h. A scenario, not a forecast." | the before and after lines | `GET /api/projection`, `/api/impact` |
| 7 The public record | "Anyone can see who acted, how fast, and whether residents agreed. The formula is printed on the page." | `/board`: leaderboard, method, the new job's timeline | `/api/leaderboard`, `/api/transparency` |

## Beats worth keeping
- **A bounce is a finding.** Open task 5 (East Patel Nagar) in the action log: PWD handed it back with a reason, MCD took it. The 1976 plan lists that barrel under MCD; the 2012 rule points to PWD.
- **A dispute is not the end.** Task 3 (Jhandewalan) was disputed, redone, confirmed. Task 8 (Filmistan) is still disputed and waiting.
- **No owner is a result.** The culvert near Dayal Chowk has no source assigning it. The coordinator assigned it to MCD and it is overdue: the board shows it.
- **A photo checks itself.** The held report in the history has a geotag 3 to 4 km from the spot. A coordinator rejected it with a reason.

## Say it straight (honesty lines)
1. Drain points are real OSM lines, drains on a route the 1976 plan describes (inferred), or roadside drains marked *assumed*. None is a field survey.
2. Silt is an estimate from days since the last confirmed clean. No public cleaning record exists.
3. Fill times are a scenario with illustrative parameters, shown as ranges. Not a forecast; official warnings come from IMD and NDMA Sachet.
4. Owners are documentary readings (the 60 ft rule, a 1976 plan, court statements), not field-verified.
5. The leaderboard scores the log it is shown. On rehearsal data it says nothing about any real agency.

## If something fails on stage
- Server not up: `curl localhost:8010/api/health`. Router errors are listed there.
- A report is held ("photo reused"): the demo script makes a new picture each run. In the UI, use a different photo.
- Start over: `make demo-db`, restart the server.

# API quick map

Live, always-correct reference: run the server and open `/docs`. This page is the orientation.

**Auth (demo):** send header `X-User-Id: <persona id>`. Personas from `GET /api/users`: `res-1`, `res-2` (resident), `off-mcd`, `off-pwd` (official), `admin-1` (admin). Reads without a header are allowed where marked public.

| Endpoint | Who | What |
|---|---|---|
| `GET /api/health` | public | `ok` (false when a router failed to load), version, loaded routers and `router_errors`, storage and triage mode, `config_warnings`. `?deep=1` also probes S3 and Bedrock: admin persona only (403 otherwise), cached for 30 s |
| `GET /api/users` | public | personas for the login picker |
| `GET /api/me` | any persona | the current persona |
| `GET /api/agencies` | public | agency list (for reassign selects) |
| `GET /api/map` | public | pockets (level at the reference rain, 25 mm/h; `reference_rain_mm_h`), drains with owner and last cleaned, open tasks (each with `asset_name` and `last_confirmed_clean`), capture sites, banner |
| `POST /api/simulate` | public | `{rain_mm_h, drain_state: clean\|silted\|current, at_h}` -> pockets in fill order. Each pocket also has `time_to_fill_h_low` and `time_to_fill_h_high` (null: does not fill in that case); show "about X to Y h" with the banner and `range_note` |
| `POST /api/incidents` | resident, admin | multipart: `lat, lon, kind, note, photo`, optional `accuracy_m` (phone GPS accuracy). Links to the nearest drain within 150 m; creates or bumps a task. Photo checks add `flags` (`code`, `level` warn or info, `detail`). A warn flag (photo geotag far from the spot, photo older than 2 days, picture already submitted) sets `held_for_review: true` (a repeat report of the same spot by the same person within 50 m and 24 h gets the warn flag `duplicate_nearby`; more than `REPORTS_PER_DAY` reports in 24 h returns 429): the report is saved and linked to the drain but does not create or bump a task. A photo that cannot be read as an image returns 422 and nothing is stored; nothing is stored for any refused report |
| `GET /api/capture-token` | resident, official, admin | `{token, ref, issued_at, valid_for_s, server_time}`. Call just before opening the camera; send `token` as `capture_token` with the report. A token covers one saved report: fetch a new one for each photo. A report refused with 422 does not use it up. Officials use it for the after photo (`complete`) |
| `GET /api/incidents?mine=true` | any persona | reports. A resident sees other residents' reports without `user_id` (null) and `note` (empty); officials and admins see both. Each has `flags`, `held_for_review` and the review fields `reviewed_by`, `reviewed_at`, `review_decision`, `review_note` |
| `GET /api/incidents?held=true` | official, admin | reports held for review and not yet decided. An official sees only reports linked to a drain of their agency |
| `POST /api/incidents/{id}/review` | admin | JSON `{decision: "release"\|"reject", note}`. Release creates or bumps the task for the linked drain. Reject keeps the report visible and uncounted. 404 unknown id; 409 not held, already reviewed, or no linked drain on release |
| `GET /api/tasks?agency_id=&status=` | public | ranked tasks. Each has `dispute_note` (the latest resident note while `status` is `disputed`, else null). `agency_id=none` lists tasks with no owner |
| `GET /api/tasks/{id}` | public | task with `events` (timeline), `incidents` and `banner` |
| `POST /api/tasks/{id}/accept` | official of the agency, admin | open -> accepted; also disputed -> accepted (rework: clears `done_by`, event note "to be redone ...") |
| `POST /api/tasks/{id}/reject` | official of the agency, admin | `{reason, reassign_to?}`; with a target it bounces to that agency and stays open |
| `POST /api/tasks/{id}/assign` | admin | `{agency_id}` for tasks with no owner |
| `POST /api/tasks/{id}/complete` | official of the agency, admin | multipart: `photo` (required), `note`, optional `lat`, `lon`, `accuracy_m`, `capture_token` -> done. The after-photo is checked like a report photo, against the sent position (or the drain when none is sent), plus the on-photo stamp and capture token; a position more than 150 m from the drain adds `not_at_drain`. Flags never block the work; they appear on the `completed` event. 422 when the file is not a readable image |
| `POST /api/tasks/{id}/confirm` | resident (not the one who did the work, and not the one who raised the task) | `{ok, note}` -> confirmed or disputed; confirmed resets the drain's silt estimate. 403 for the person who did the work or who made the first report on the task. A resident who added a later report may confirm |
| `POST /api/plan/generate?top=5` | admin | create tasks for the top-ranked drains with no live task |
| `GET /api/accountability` | public | per agency: assets owned, tasks by status, overdue, bounced away, median hours to accept and complete; includes the "No owner found" row (`agency_id: null`) |
| `GET /api/insights` | public | rule-based facts: `[{id, text, why, evidence}]` with `banner`. Rules: reports near a drain with no owner; an agency that bounced 3 or more tasks; a silted, unassigned drain in a fast-filling pocket; a task more than 3 days overdue; a drain of the fastest pocket not confirmed clean for 60 days. Placeholder rows say "placeholder data" |
| `GET /api/reports/ward?format=json\|md` | public | generated ward report from database facts: open and overdue tasks by agency, held report count, top 5 drains by fill time gained (with low and high), pockets by level, cleans confirmed in 7 days, insights. `md` returns Markdown with the banner. Fixed wording, no model text |
| `GET /api/actions?top=` | public | One action per drain: `clean`, `inspect`, `clarify_owner` or `monitor`, each with its route (agency, or the ward coordinator when no owner), the reason, evidence, fill-time gain as a range, and whether a task is already dispatched |
| `GET /api/projection?rain=20,25,35,50&horizon=0,30,60,90` | public | Scenario projection per pocket, rain and horizon: runoff m3/h, share of the drain used (`utilisation_pct`), silt fraction if not cleaned, fill time as a low-high range. Plus the silt curve. Scenario, not a forecast. Also `silt_curve_illustrative`: the model curve with a seeded wobble for the demo chart (`illustrative: true`, never used in ranking) |
| `GET /api/assets/{id}` | public | One drain: owner and its source, data source and confidence, citation, cleaning history from tasks, silt now and at 30, 60, 90 days, reports, pockets it serves. `silt_series_illustrative`: the same wobble series seeded by the drain id, labelled illustrative |
| `GET /api/leaderboard` | public | Agencies scored 0 to 100 from the task log (response, delivery, verified, timeliness), the inputs behind each score, unassigned tasks apart, and the printed method. `demo: true` when the database holds rehearsal history |
| `GET /api/transparency?agency_id=&status=&limit=` | public | Every task with route, reason, evidence and timeline. Roles are shown, never names |
| `GET /board` | public | A page that renders the two endpoints above: leaderboard, method, filterable action log |
| `GET /api/city/summary` `GET /api/city/insights` `GET /api/city/places` `GET /api/city/roads/{code}` | public | Delhi evidence base: recorded waterlogging (1,100 location-dates), places merged across lists with the owner by the 60 ft rule, PWD road inventory, and the EDA insights with their actions |
| `GET /api/impact` | public | headline numbers (SCOPE section 6) |
| `GET /api/opportunities` | public | rain-capture candidates with decision, rule id, m3/year |
| `GET /media/{key}` | public | photo (S3 pre-signed redirect when `STORAGE=s3`) |

**Task lifecycle:** `open -> accepted -> done -> confirmed | disputed`; a disputed task is redone: the owning agency accepts it again (`disputed -> accepted`, `done_by` cleared) and a different resident confirms again. A bounce stays `open` under the new agency. A reject with no target is `rejected`. Every step writes a `task_events` row.

**Errors:** JSON `{"detail": "..."}`. 401 no persona, 403 wrong role or agency, 409 wrong status, 422 bad input, 404 unknown id.

**Photos:** jpeg, png or webp, up to 8 MB. Response `photo_url` values are relative (`/media/...`); the UI prefixes `API_BASE`.

**Files that matter to a screen developer:** `data/seed.json` (what you see locally), `app/routers/*.py` (exact shapes), `tests/test_flow.py` (a worked example of every call).

## Persona keys

When the server sets `PERSONA_KEYS`, a request as an `official` or `admin` persona must also send `X-Persona-Key: <key>` (401 otherwise; also for `/api/health?deep=1`). Residents and public reads need no key. Unset: header-only demo auth.

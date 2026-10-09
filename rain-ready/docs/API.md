# API quick map

Live, always-correct reference: run the server and open `/docs`. This page is the orientation.

**Auth (demo):** send header `X-User-Id: <persona id>`. Personas from `GET /api/users`: `res-1`, `res-2` (resident), `off-mcd`, `off-pwd` (official), `admin-1` (admin). Reads without a header are allowed where marked public.

| Endpoint | Who | What |
|---|---|---|
| `GET /api/health` | public | version, loaded routers, storage and triage mode |
| `GET /api/users` | public | personas for the login picker |
| `GET /api/me` | any persona | the current persona |
| `GET /api/agencies` | public | agency list (for reassign selects) |
| `GET /api/map` | public | pockets (level at 35 mm/h), drains with owner and last cleaned, open tasks, capture sites, banner |
| `POST /api/simulate` | public | `{rain_mm_h, drain_state: clean\|silted\|current, at_h}` -> pockets in fill order |
| `POST /api/incidents` | resident, admin | multipart: `lat, lon, kind, note, photo`, optional `accuracy_m` (phone GPS accuracy). Links to the nearest drain within 150 m; creates or bumps a task. Photo checks add `flags` (`code`, `level` warn or info, `detail`). A warn flag (photo geotag far from the spot, photo older than 2 days, picture already submitted) sets `held_for_review: true`: the report is saved and linked to the drain but does not create or bump a task |
| `GET /api/capture-token` | resident, admin | `{token, ref, issued_at, valid_for_s, server_time}`. Call just before opening the camera; send `token` as `capture_token` with the report |
| `GET /api/incidents?mine=true` | any persona | reports |
| `GET /api/tasks?agency_id=&status=` | public | ranked tasks. `agency_id=none` lists tasks with no owner |
| `GET /api/tasks/{id}` | public | task with `events` (timeline) and `incidents` |
| `POST /api/tasks/{id}/accept` | official of the agency, admin | open -> accepted |
| `POST /api/tasks/{id}/reject` | official of the agency, admin | `{reason, reassign_to?}`; with a target it bounces to that agency and stays open |
| `POST /api/tasks/{id}/assign` | admin | `{agency_id}` for tasks with no owner |
| `POST /api/tasks/{id}/complete` | official of the agency, admin | multipart: `photo` (required), `note` -> done. The after-photo is checked like a report photo; `flags` appear on the `completed` event |
| `POST /api/tasks/{id}/confirm` | resident (not the one who did the work) | `{ok, note}` -> confirmed or disputed; confirmed resets the drain's silt estimate |
| `POST /api/plan/generate?top=5` | admin | create tasks for the top-ranked drains with no live task |
| `GET /api/accountability` | public | per agency: assets owned, tasks by status, overdue, bounced away, median hours to accept and complete; includes the "No owner found" row (`agency_id: null`) |
| `GET /api/impact` | public | headline numbers (SCOPE section 6) |
| `GET /api/opportunities` | public | rain-capture candidates with decision, rule id, m3/year |
| `GET /media/{key}` | public | photo (S3 pre-signed redirect when `STORAGE=s3`) |

**Task lifecycle:** `open -> accepted -> done -> confirmed | disputed`. A bounce stays `open` under the new agency. A reject with no target is `rejected`. Every step writes a `task_events` row.

**Errors:** JSON `{"detail": "..."}`. 401 no persona, 403 wrong role or agency, 409 wrong status, 422 bad input, 404 unknown id.

**Photos:** jpeg, png or webp, up to 8 MB. Response `photo_url` values are relative (`/media/...`); the UI prefixes `API_BASE`.

**Files that matter to a screen developer:** `data/seed.json` (what you see locally), `app/routers/*.py` (exact shapes), `tests/test_flow.py` (a worked example of every call).

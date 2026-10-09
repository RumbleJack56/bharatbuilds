# TASKS.md: task board (what to build, who, in what order)

| Id | Person | Owns (details in `CLAUDE.md` ownership table) |
|---|---|---|
| **dev#1** | **Ujjwal** | Platform + backend: AWS deploy, ledger, reports, jobs and evidence, storage, triage, Telegram alerts, end-to-end test |
| **dev#2** | **Aarush** | Frontend core: shared web layer + `lowpoints`, `map`, `report`, `task`, `ops` pages |
| **dev#3** | to be named | Low-point simulator and data, buildings, secondary pages: `building`, `b`, `verify` |
| **dev#4** | to be named | Rain-capture rules, replay, safety copy, content, video, writeup: `capture`, `replay` pages |

If only two of you are building right now, do dev#1 and dev#2 first; section 5 says what dev#3 and dev#4 work can wait or be cut. Task ids are `D<dev>-<nn>`. Tick the box in your own section when done.

**What already exists (do not rebuild):** `core/` logic with 49 tests; routers `ops`, `map`, `lowpoints`, `capture`, `replay`; ledger; seed data; `make status` (12 pass, 5 todo). The TODOs are exactly the endpoints in dev#1's and dev#3's lists below.

## 0. Sync points (the only moments you must talk)

| # | When | What | Who tells whom |
|---|---|---|---|
| **SP0** | Start | Everyone pulls and runs `make setup && make run && make status && make test`. Confirm ownership | all |
| **SP1** | About 45 min | dev#1 pushes **stub** routers (`reports`, `jobs`, `media`, `alerts`). dev#3 pushes the `buildings` router. `make status` has no FAIL. dev#2 switches `api.js` from mocks to the live server | dev#1, dev#3 -> dev#2 |
| **SP2** | About H3 | dev#1 posts the **public HTTPS URL** and the Telegram bot link. Everyone presses /start; dev#1 collects chat ids. dev#2 tests camera + GPS on a real phone | dev#1 -> all |
| **SP3** | About H9 | Simulator page works on the live URL; a real phone photo shows as a report on the map | dev#2, dev#1 |
| **SP4** | About H12 to H16 (plan for H12) | **The loop works**: confirm a drain (L2) -> the linked pocket slows in the simulator. `scripts/flow.py` green on the live host. Golden path (`PROJECT.md` section 6) works by hand | all |
| **SP5** | Freeze = deadline minus 6 h | Only recording bugs get fixed | all |

**Never wait for another person.** Frontend builds on the live endpoints that already exist and on mocks for the rest. Backend tests with curl and `TestClient` until the UI exists.

---

## 1. dev#1 (Ujjwal): Platform + backend

Kickoff prompt: `WORK_PACKAGES.md` section 2. Do D1-02 first because it unblocks others.

| Id | Task | Files | Needs | Est. | Done when |
|---|---|---|---|---|---|
| [ ] D1-01 | Add MIT `LICENSE`. Confirm all devs can push. Keep repo private until submission | repo | none | 10 min | Everyone can `git push` |
| [ ] D1-02 | **Stub routers** returning contract-valid example JSON: `GET/POST /api/reports`, `GET/POST /api/jobs`, `GET /api/jobs/{id}`, `POST /api/jobs/{id}/evidence`, `GET /media/{key}`, `POST /api/alerts/telegram` (401 without ops key) | `app/routers/reports.py jobs.py media.py alerts.py` | none | 30 min | `make status` has no FAIL; pushed (SP1) |
| [ ] D1-03 | **AWS**: account, `ap-south-1`, private S3 bucket, IAM role (S3 + Bedrock), EC2 `t3.small` + Elastic IP + security group, Docker, Caddy with `<ip-with-dashes>.sslip.io`, first deploy. Runbook: `docs/implementation-rough-idea.md` section 14 | `deploy/`, `.env` (not committed) | none | 60-90 min | HTTPS URL opens on a phone (SP2) |
| [ ] D1-04 | **Bedrock go/no-go**: enable a Claude model, list inference profiles, test one image call from the instance. Model id goes in `.env` | `.env` | D1-03 | 20 min | Result stated; `TRIAGE_MODE` set |
| [ ] D1-05 | Telegram config: dev#4 (D4-00) creates the bot and collects chat ids; you put `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS` into the server `.env` (the variables already exist in `app/config.py` and `.env.example`) | `.env` | D4-00 | 5 min | `curl` to the Bot API delivers a test message to every teammate |
| [ ] D1-06 | `app/storage.py`: `save_photo(data, ext) -> key`, `photo_url(key)`; local by default, S3 when `STORAGE=s3`. `GET /media/{key}` streams local or 302s to a pre-signed URL | `app/storage.py routers/media.py` | none | 50 min | Round-trip works locally and against the bucket |
| [ ] D1-07 | `POST /api/reports`: validate (NCR box, size <= 8 MB, image), phash + sha256, nearest asset within 50 m, ticket `RR-%06d`, triage call, `hazard_text` for wire/manhole, `forward_text`, footer, `ledger.append` | `app/routers/reports.py` | D1-06 | 90 min | Report rows of `make status` PASS with real data |
| [ ] D1-08 | Clustering (same category, 50 m, 24 h; `corroborated` at >= 2 users or staff), per-user daily cap 10, coarse public `GET /api/reports` | `app/routers/reports.py` | D1-07 | 45 min | Two users' reports become one `corroborated` cluster |
| [ ] D1-09 | `ai/triage.py`: manual fallback by default; Bedrock Converse path, strict JSON, temp 0, 5 s timeout, never asks for advice | `ai/triage.py` | D1-04 | 60 min | Works with `manual` and (if go) `bedrock` |
| [ ] D1-10 | Jobs: `POST/GET /api/jobs`, `GET /api/jobs/{id}` | `app/routers/jobs.py` | D1-02 | 45 min | Job list/detail match the contract |
| [ ] D1-11 | **Evidence**: phase/role rules, flags via `core.levels`, `compute_level`, update job, **set `assets.last_confirmed_clean` at level >= 2**, ledger entries | `app/routers/jobs.py` | D1-10, D1-06 | 90 min | Duplicate photo or far pin -> `FLAGGED`; same person cannot confirm; L2 slows the linked pocket in the simulator |
| [ ] D1-12 | `POST /api/alerts/telegram` (ops key): kind `lowpoint_high` or `storm_checklist`; text **only** from `core/safety_copy` (needs D4-01 strings; use a placeholder constant until then); send to `TELEGRAM_CHAT_IDS`; fail soft with `skipped_reason` if unset; write `alerts` row + ledger | `app/routers/alerts.py` | D1-05, D4-01 | 60 min | A teammate's phone gets the Hindi alert |
| [ ] D1-13 | `POST /api/ops/storm` accepts `notify: true` and calls the same send path with the storm checklist | `app/routers/ops.py` | D1-12 | 20 min | Switch + notify works |
| [ ] D1-14 | Tests with `TestClient` + temp DB: report happy path, wire hazard text, duplicate flagged, self-confirm blocked, L2 sets date, ledger chain verifies, alerts 401 without key | `tests/test_reports.py test_jobs.py` | D1-07, D1-11 | 60 min | `make test` green |
| [ ] D1-15 | `scripts/flow.py`: end-to-end smoke (report -> job -> 3 crew photos -> resident confirm -> assert L2 + date -> **simulator time for the linked pocket increases** -> ledger verify -> storm on/off) | `scripts/flow.py` | D1-11 | 45 min | Green locally and on the live host |
| [ ] D1-16 | Abuse limits: 8 MB cap, per-IP and per-`X-User-Id` rate limit on POSTs | `app/main.py` | none | 30 min | A 20 MB upload is rejected |
| [ ] D1-17 | Backups: hourly DB copy to S3; AMI snapshot before recording (do after SP4; cut if late) | `deploy/` | D1-03 | 30 min | Snapshot exists |
| [ ] D1-18 | Stretch: Telegram inbound webhook (photo + location -> report via the same code path as D1-07) | `app/routers/alerts.py` | D1-07 | 60 min | A photo sent to the bot appears on the map |
| [ ] D1-19 | Stretch: nightly ledger head to an Object-Lock S3 bucket | `scripts/anchor.py` | D1-03 | 45 min | A file appears in S3 |
| [ ] D1-20 | Submission logistics with the team (section 5, S-01 to S-04, S-06) | n/a | n/a | n/a | Form submitted before the deadline |

**Load note:** dev#1's core rows (D1-01 to D1-16) add up to about 12 hours and AWS is the riskiest. If dev#3 or dev#4 has spare time, hand them D1-14 (tests), D1-16 (limits) or D1-17 (backups); say so in the group. **The seeded job `1` (asset `DR-RN-001`) already exists, so `task.html?id=1` and the loop demo do not wait for the create-job UI.**

**Done =** public URL; all dev#1 rows of `make status` PASS on the live host; `scripts/flow.py` green on the live host; backup and AMI exist.

---

## 2. dev#2 (Aarush): Frontend core

Kickoff prompt: `WORK_PACKAGES.md` section 3. Start with D2-01, then D2-02 (the flagship). **Endpoints for `lowpoints`, `map`, `capture`, `replay` already work on the live server, so the simulator page needs no mocks.**

| Id | Task | Files | Needs | Est. | Done when |
|---|---|---|---|---|---|
| [ ] D2-01 | Shared layer: `web/js/api.js` (get/post/postForm, adds `X-User-Id` UUID from localStorage, on 404 returns the fixture from `web/mock/*.json` built from the examples in `openapi.yaml`); `web/css/app.css` (mobile first, 360 px, light theme); `web/js/nav.js` (header with links to all pages, footer from `/api/state`); keep `web/index.html` linking every page | `web/js/api.js nav.js css/ mock/ index.html` | none | 50 min | Every page, including dev#3's and dev#4's, can import these (tell them) |
| [ ] D2-02 | **`lowpoints.html`** (F1, flagship): MapLibre (pinned `maplibre-gl@4.7.1`, OSM raster); pockets as circles coloured yellow (watch) / orange (elevated) / red (high) / grey (none) **with text labels**; slider 10 to 120 mm/h, default 35; toggle clean / silted / current; time scrubber for `at_h` with fill % animation; fill-order numbers and spill arrows (`spills_to`); approximate time to fill ("about 4 h", "about 45 min"); parameters popup (catchment, storage, drain capacity, `data_source`, `confidence`); **banner "Scenario, not a forecast" always visible**; alert card when `alert.active`; button "Send Hindi alert to team phones" (ops key, calls `/api/alerts/telegram`); debounce calls to `POST /api/lowpoints/simulate` | `web/lowpoints.html web/js/lowpoints.js` | D2-01 | 150 min | Moving the slider re-colours pockets on a phone; demo values in `PROJECT.md` section 6 reproduce |
| [ ] D2-03 | **`map.html`**: assets by tier with text labels (colour-blind-safe; grey for None; never green), hotspots, reports, storm banner, board numbers; popup shows name, owner, basis, last-confirmed, score components, `data_source/confidence` | `web/map.html web/js/map.js` | D2-01 | 75 min | Live `/api/map` renders on a phone |
| [ ] D2-04 | **`report.html`**: category buttons; `capture="environment"`; geolocation with accuracy shown; manual pin fallback (`location_verified=false`); offline queue + retry; success shows ticket, `hazard_text` first and large when present, `forward_text` with copy | `web/report.html web/js/report.js` | D2-01 (mock), D1-07 (live) | 105 min | Real phone photo creates a report (after SP1/SP2) |
| [ ] D2-05 | **`task.html?id=`**: stepper for crew (before / after / bank), Confirm for a different resident, flags in plain words, ledger link per evidence | `web/task.html web/js/task.js` | D2-01 (mock), D1-11 (live) | 90 min | L1 -> L2 across two devices |
| [ ] D2-06 | **`ops.html`**: ops key prompt (sessionStorage); drill switch with source text and a "notify team phones" checkbox; create job from an asset; P1/P2 list; alert buttons; board numbers | `web/ops.html web/js/ops.js` | D2-01 | 60 min | Switch flips the banner and tiers on `map.html` |
| [ ] D2-07 | Polish: loading and error states, large tap targets, 360 px width, no horizontal scroll. **Stranger test**: someone outside the team completes the simulator and report flows unaided in under 2 minutes | `web/**` (own files) | all pages | 60 min | Stranger test passed |

**Done =** every dev#2 page works on a real phone over the live HTTPS URL; the simulator is smooth; stranger test passed.

---

## 3. dev#3: Simulator, data, buildings, secondary pages

Kickoff prompt: `WORK_PACKAGES.md` section 4. Order: D3-01 first (it clears two TODOs in `make status`).

| Id | Task | Files | Needs | Est. | Done when |
|---|---|---|---|---|---|
| [ ] D3-01 | `app/routers/buildings.py`: `POST /api/buildings` (random 8-char code; `near_listed_hotspot_200m` from hotspots + `core.geo`; level from `core.building`; message from `core.safety_copy.building_message(level, lang, storm_active)`), `GET /api/buildings/{code}?lang=`, `POST .../ack` (insert `acks`, set `last_ack_at`, `ledger.append("building_ack", ...)`), `GET /api/public/b/{code}` (placard; never lat/lon, never a rating; nearest asset status "CONFIRMED" or "NOT CONFIRMED YET" + distance) | `app/routers/buildings.py` | none | 75 min | The 2 building rows of `make status` PASS (SP1) |
| [ ] D3-02 | `tests/test_buildings.py`: basement with people never `NO_SPECIFIC_FLAG`; placard has no lat/lon and no rating; storm on/off changes `message.items`; ack writes a ledger entry | `tests/test_buildings.py` | D3-01 | 30 min | `make test` green |
| [ ] D3-03 | **Pocket data**: replace placeholder positions and parameters in `data/seed.json` `lowpoints` with the best available estimates (satellite measurement of catchment, rough storage = area x depth, drain capacity from a standard value), labelled `data_source: satellite` or `field`, honest `confidence`. Keep the spill graph (no cycles) and `tests/test_lowpoints_api.py` green; if the demo values legitimately change, update the pinned values in that test and ask dev#4 to update `PROJECT.md` section 6 | `data/seed.json` | none | 90 min | `make test` green incl. `test_lowpoints_api.py`; every changed row labelled |
| [ ] D3-04 | **Asset data**: replace placeholder drains/inlets with 20 to 40 real positions near the pilot ward (QGIS / geojson.io / satellite); `data_source: field`; check hotspot coordinates against a map. Follow `FIELD_RULES` if visiting | `data/seed.json` | none | 90 min | No `placeholder` left on assets used in the demo |
| [ ] D3-05 | **`building.html`**: 4 questions + consent + en/hi toggle; render `message` exactly as returned; save code on device; Acknowledge when a warning is active; link to the placard | `web/building.html web/js/building.js` | D2-01, D3-01 | 75 min | Hindi checklist shows; Acknowledge works |
| [ ] D3-06 | **`b.html?code=`** public placard: `info_only` prominent; no colour rating; no coordinates | `web/b.html web/js/b.js` | D2-01, D3-01 | 30 min | `/b.html?code=demo0001` renders |
| [ ] D3-07 | **`verify.html?id=`**: chain result with `proves / does_not_prove` text; show the head hash | `web/verify.html web/js/verify.js` | D2-01 | 30 min | Shows PASS; fails after a DB row is edited |
| [ ] D3-08 | Stretch: DEM candidates. Fetch one Copernicus GLO-30 tile, run depression filling on the pilot box, list candidate pockets, compare with the hand-placed ones. Report the overlap **and misses** honestly. Do not feed it into the UI unless it clearly adds value | `scripts/dem_candidates.py` | none | 120 min | A short table in `evidence/` |

**Done =** dev#3 rows of `make status` PASS; seed data labelled and plausible; `make test` green.

---

## 4. dev#4: Rules, copy, content, demo

Kickoff prompt: `WORK_PACKAGES.md` section 5. Do D4-00 and D4-01 first; dev#1's alert task needs them.

| Id | Task | Files | Needs | Est. | Done when |
|---|---|---|---|---|---|
| [ ] D4-00 | **Telegram bot**: create it with @BotFather; every teammate opens it and presses /start; read the chat ids from `https://api.telegram.org/bot<TOKEN>/getUpdates`; send the token and comma-separated chat ids to dev#1 privately (never commit them) | none | none | 15 min | A test message reaches all four phones |
| [ ] D4-01 | **Alert copy** in `core/safety_copy.py`: `LOWPOINT_ALERT` (en/hi, takes a pocket name and the scenario banner words), `STORM_ALERT` (en/hi); keep the banned-words test green and add `tests/test_copy.py` | `core/safety_copy.py tests/test_copy.py` | none | 45 min | `alerts.py` can import the strings |
| [ ] D4-02 | Human review: Hindi by a native speaker, English by someone with disaster-management judgement; record reviewer names in the commit message | `core/safety_copy.py` | D4-01 | 30 min | Reviewed |
| [ ] D4-03 | **`capture.html`**: load presets; a form for roof area, water table, soil, floodplain, runoff type; result card with decision, **rule id**, reason, source, structure and sizing, warnings, maintenance, first-flush note; **banner always visible**; show `water_table_verified: false` clearly | `web/capture.html web/js/capture.js` | D2-01 | 90 min | Presets give R2 (shallow) and R4 (deep) |
| [ ] D4-04 | **`replay.html`**: the timeline from `GET /api/replay` as a clean stepper; model vs reported numbers side by side with the caveats; the hindsight score labelled "reconstruction" | `web/replay.html web/js/replay.js` | D2-01 | 60 min | Reads clearly in 20 seconds |
| [ ] D4-05 | **Water-table bands**: find the CGWB depth band for the two areas the presets stand for; if found, update `data/capture_presets.json` with value + source and set `water_table_verified: true`, otherwise leave hypothetical. Ask an expert (faculty / hydrogeologist) to read rules R2, R3, R6, R9 | `data/capture_presets.json` | none | 45 min | Each preset states its source or "hypothetical" |
| [ ] D4-06 | **Fact-check** every number spoken in the video: 58 mm, 228.1 mm, 3 deaths, CAG figure, the 30 cm -> about a third calculation; check DISCOM numbers; update the register in `docs/implementation-rough-idea.md` section 8 | `docs/**` | none | 60 min | A list of OK-to-say / remove |
| [ ] D4-07 | Field work (safely, `FIELD_RULES`): photos of a real choked drain from the kerb in dry weather; 4 to 6 short interviews with consent, no names | `evidence/**` | someone in Delhi | flexible | Files in `evidence/` |
| [ ] D4-08 | **Video**: script from `PROJECT.md` section 6, shot list, screen recordings of the deployed URL and the AWS console, voiceover, captions; YouTube upload (public or unlisted); open signed-out | n/a | live URL, SP4 | 180 min | Link, <= 3:00, shows AWS |
| [ ] D4-09 | Writeup (problem, build, where AWS fits, AI tools used, limits) and `README.md` credits and licences | `README.md` | after SP4 | 60 min | Ready to paste in the form |
| [ ] D4-10 | Optional: blog on AWS Builder Center linked in the submission (top-5 blog prize) | n/a | D4-09 | 90 min | Published |

**Done =** dev#4 rows of `make status` stay PASS; copy reviewed; video on YouTube; writeup ready.

---

## 5. Shared no-code tasks (anyone free)

| Id | Task | Output |
|---|---|---|
| S-01 | All four check in on the hackathon page; WeMakeDevs account + AWS Builder Center profile + student verification (SheerID) | 4 of 4 done |
| S-02 | **Do first.** Pin the real **deadline time** from the schedule page or Discord; tell the group; compute the freeze (deadline minus 6 h) | One line in the group chat |
| S-03 | Stranger test (once D2-02 and D2-04 are live) | Notes, fixes assigned |
| S-04 | Legal quick read: Disaster Management Act s.54 text; decide what the team may send to anyone outside the team | A short note in `evidence/` |
| S-05 | Credits and licences list for anything we did not write | README section |
| S-06 | Make the repo public with enough time to open it signed-out before the deadline | Confirmed |

## 6. Cross-dev dependencies (the only ones)
- D1-05 needs the token and chat ids from D4-00.
- D1-12 (alerts send) needs the strings from D4-01. Until then dev#1 uses a placeholder constant; when D4-01 lands, swap in one line.
- D2-02 (simulator UI) calls `/api/alerts/telegram` from D1-02's stub; the button works as soon as the stub exists.
- D2-05 (task page) and D2-04 (report page) go live when D1-11 and D1-07 land; before that they run on mocks.
- D3-05/06/07, D4-03/04 use the shared layer from D2-01 (`api.js`, `nav.js`, `app.css`). Until D2-01 is pushed, copy the pattern from `web/index.html`.
- The loop (SP4) needs D1-11 (evidence sets `last_confirmed_clean`) and D2-02 (simulator UI) and D2-05 (task page).

## 7. If you fall behind (cut in this order)
D1-19 ledger anchor -> D3-08 DEM stretch -> D1-18 Telegram inbound -> D4-10 blog -> F11 `verify.html` tamper demo -> D2-06 "create job" UI (use curl) -> D1-09 Bedrock triage (manual category) -> D1-08 clustering -> F9 building pages (keep the API) -> F5 rain-capture page (keep the API; show one preset in a slide). **Never cut:** the simulator (F1), the replay (F2), report -> map (F3), L1 -> L2 confirmation (F4), safety wording and footer, deployment on AWS, the video.

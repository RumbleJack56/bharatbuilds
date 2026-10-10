# Tasks and working agreement (2 developers)

Ujjwal and Aarush work in parallel on **main** with short-lived branches. The split below is by file, so merges rarely touch the same lines.

## 0. Status on 10 Oct 2026 (read first)

**Done (PR #1, branch `ujjwal/b1-license-deploy-aids`):** LICENSE; CI at the repo root (green); S3 and Bedrock code paths with tests; deploy scripts in `scripts/`; `/api/health?deep=1`; photo checks (perceptual hash, EXIF geotag and time); capture token and on-photo stamp check; held-for-review reports; `docs/CAPTURE.md`. 76 tests pass.

**Done (branch `ujjwal/backend-hardening`):** B8 rate limit, repeat-report hold, fill-time range; B11 admin release or reject of held reports; B12 `/api/insights` and `/api/reports/ward`; seed validator (`make seedcheck`) and `scripts/build_seed.py`; `docs/DATA.md`. 100 tests pass. Aarush: new endpoints need screens (held queue, review buttons, range display, insights and report views).

**Done since (all on `main`):** PR #2 backend hardening; PR #3 Aarush's web rewrite (V1 to V5, layered, 115 web tests); the live host https://15-207-177-122.sslip.io on Aarush's AWS account (B2; S3 storage, hourly backup cron, first AMI). Bedrock is not on yet.

**Backend review, 10 Oct:** a read of `app/` and `ai/` plus local probes found one demo blocker (photos on S3), three bugs in the task loop and several exposure gaps. They are B13 to B27 in section 5. **Do B13 to B17 before anything else.**

**Left, Ujjwal:** B13 to B17 first, then B18 to B22, B5 (the list in `PLAN.md` section 7), B6 APK, B7 real data swap. B23 to B27 if time allows.

**Left, Aarush:** the AWS playbook `docs/AWS_TODO.md` (A1 to A8 in section 6), then V9 camera, V10 to V12, V6 and V8. First submission is not before 12:00 noon on the last day. The exact hour is unknown, so keep the freeze rule.

## 1. Who owns what

| | Ujjwal: backend, AWS, data, APK | Aarush: all views and screens |
|---|---|---|
| Files | `app/**` `ai/**` `core/**` `schema.sql` `data/seed.json` `tests/**` `mobile/**` `Makefile Dockerfile docker-compose.yml Caddyfile .env.example` `docs/DEPLOY.md` `.github/**` | everything in `web/` (`index.html` `config.js` `css/**` `js/**`) |
| Concerns (SCOPE 4.x) | API and logic for 4.3 to 4.7, plus 4.8, 4.9, 4.10 | Every screen in 4.1 to 4.6 (resident, official, admin, dashboard, simulator, capture) |
| Shared (either) | `SCOPE.md` `TASKS.md` `README.md` `CLAUDE.md`: small edits, own rows only | |

If you need a change in the other person's files, ask in chat or open a small PR for just that change.

## 2. The API is the contract

- The running server's `/docs` page is the contract. Aarush builds against a local server with the seed data, so there is no waiting and no mocks.
- Backend changes are **additive**: new fields and new endpoints are fine. Renaming or removing a field needs a heads-up first, and the commit message starts with `API:`.
- Ujjwal keeps `tests/test_flow.py` green. It walks the whole loop through HTTP.
- `web/js/api.js` is the only place that calls `fetch`. Screens never build URLs by hand.

## 3. Branching: main-line development

1. `main` always works: `make test` passes and the app starts. Never push a broken main.
2. Start from fresh main: `git switch main && git pull --rebase`.
3. Branch per small change: `ujjwal/<topic>` or `aarush/<topic>`. Keep it under half a day. Merge the same day.
4. Before merging: `git fetch && git rebase origin/main`, run `make test`, then open a PR and **squash-merge** it: one commit on `main` per PR, titled `[name] area: what`. Delete the branch after the merge and start the next one from fresh `main`; do not merge `main` back into an old branch.
5. The other person (or the CI run) checks the PR. A PR that only touches your own files may be self-merged when tests are green.
6. No force-push to `main`. No history rewrites. History must match the event dates (Oct 8-11).
7. Commit messages: `[ujjwal] area: what` or `[aarush] area: what`. Add `API:` first if the contract changed.
8. Unfinished work that is not ready for users goes behind a hidden route or a TODO tab; it must not break existing screens.
9. Never commit `.env`, `var/`, `.venv`, `mobile/android`, `mobile/www`, `mobile/node_modules`, `*.apk`.

CI (`.github/workflows/test.yml`) runs `make test` on every push and pull request.

## 4. Start here: the next five tasks each

Do these in order. Each has a "done when" so you can merge without asking.

### Ujjwal (backend, AWS)

1. **B1 Land the reset.** Add `LICENSE` (MIT). Check `make setup && make test` passes on your machine. Confirm both of you can push to `main`. *Done when:* a fresh clone runs `make run` and `/api/health` says `ok`.
2. **B2 Get a public HTTPS URL.** Follow `docs/DEPLOY.md`: AWS account, region ap-south-1, private S3 bucket, EC2 role (S3 + Bedrock), t3.small, Elastic IP, Docker, Caddy on `<ip-with-dashes>.sslip.io`. Send Aarush the URL. *Done when:* `https://<host>/api/health` works from a phone and the UI loads. Target: hour 3.
3. **B3 Photos on S3.** Set `STORAGE=s3` and `S3_BUCKET` on the server. Post a report with a photo and check it loads through `/media/...`. Fix the IAM role if it 403s. *Done when:* a photo reported from a phone shows in the task timeline and the object is in the bucket.
4. **B4 Bedrock go/no-go.** Enable a Claude model in the console, find the id with `aws bedrock list-inference-profiles --region ap-south-1`, set `BEDROCK_MODEL_ID` and `TRIAGE_MODE=bedrock`, then report one photo with no category chosen. If it fails, leave `TRIAGE_MODE=manual` and tell Aarush. *Done when:* the incident's `ai` field is filled, or manual mode is confirmed and noted in `docs/DEPLOY.md`.
5. **B5 Backend gaps from Aarush.** Take their list (they will write it in chat or as issues). Likely items: use `GET /api/agencies` in the selects (it exists), map task markers with asset name and last cleaned, a friendlier 403 text. Keep changes additive and `tests/test_flow.py` green. *Done when:* each gap has a test and is on `main`.

### Aarush (all screens)

1. **V1 Run it and list the bugs.** `make setup && make run` (on Windows without `make`: `py -m venv .venv`, `.venv\Scripts\pip install -r requirements.txt`, `.venv\Scripts\uvicorn app.main:app --port 8010`), open `http://localhost:8010` in a phone-sized window. Walk the whole loop with the five personas (report, accept, complete, confirm). Use `docs/API.md` as the map. Write every bug in a shared list. *Done when:* the list exists and you know which screens work.
2. **V2 Report screen.** Camera input, GPS with fallback, tap-to-move pin, kind and note, result card showing the linked drain and the field rule. *Done when:* a report from your phone appears in My reports and in the official's inbox.
3. **V3 Official flow.** Inbox ranked and filtered to the agency; task detail with timeline; Accept; "Not ours" with reason and agency select; Complete with a required photo. *Done when:* a task goes open to done as `off-mcd`, and a bounce to PWD shows in the PWD inbox.
4. **V4 Confirm screen.** List done tasks, show before and after photos, "Looks fixed" and "Still a problem"; friendly message when the same person did the work. *Done when:* confirming as `res-2` makes the task confirmed and the pocket fill time on the dashboard goes up.
5. **V5 Dashboard check.** Map, accountability, impact, simulator, capture in a browser. Fix layout and anything that lies (colour-only status, missing banners, banned words). *Done when:* the dashboard tells the demo story with seed data: a "No owner found" row, a bounce, and a pocket that slows after a confirmation.

### Aarush: what the backend now needs from the screens (V9)

Nothing here is a bug. These are new API fields from Ujjwal's work. Read `docs/CAPTURE.md` first and `docs/API.md` for the fields.

1. **In-app camera, no gallery.** Call `GET /api/capture-token` (resident), then open the live camera with `getUserMedia`. Do not use `<input type=file>` for report photos. (`report.js` uses `capture="environment"` now; it still lets the phone pick a gallery photo.)
2. **Stamp the photo on a canvas** at the moment of capture: address line if known, `Lat`, `Long`, date and time with the GMT offset, and `Ref <ref>` from the token. White text on a dark box, at least 3% of the image height, so Bedrock can read it. Use the same lat and lon in the form fields.
3. **Send** `photo` (the stamped image), `lat`, `lon`, `accuracy_m` (`coords.accuracy`) and `capture_token` in the existing multipart report. Do this only through `web/js/api.js`.
4. **Location rules:** if location is denied or `accuracy_m` is above 100, tell the resident and let them retry. Never stamp a guessed position.
5. **Show the result.** The response has `held_for_review` and `flags` (`code`, `level` warn or info, `detail`). When held, show: "Saved for review. It is not counted yet." plus the `detail` of each warn flag, in plain words. Show info flags small. Do not call a photo "verified" or "proof".
6. **Show flags on the official side.** Task detail: `incidents[].flags` and the `completed` event `flags`. An official sees a held report with its reason. The confirming resident sees the after-photo flags before choosing "Looks fixed".
7. **Official after-photo:** the official's complete flow uses the same camera and stamp (the server checks the after-photo for reuse of the report photo).
8. **Test with the dev server:** with `TRIAGE_MODE=manual` the stamp text is not read, so flags are info only. To see a held report, reuse the same photo twice as two different personas, or send a photo whose geotag is far from the reported point. `tests/test_photocheck.py` shows the cases.

*Done when:* a report taken in the app shows a stamp, reaches `/api/incidents`, and a repeated photo shows "Saved for review".

Everything below is the full backlog after these.

## 5. Full backlog: Ujjwal

- [x] B1 LICENSE (MIT) done; reset is in PR #1, merge to `main` and confirm both can push
- [x] B2 AWS: account, ap-south-1, private S3 bucket, EC2 role, EC2 t3.small, Elastic IP, Caddy HTTPS (`docs/DEPLOY.md`). Scripts in `scripts/` are ready. Aarush's account has the credits. **Public URL by hour 3**. Live: https://15-207-177-122.sslip.io (details in `PLAN.md` section 7)
- [ ] B3 Server is on `STORAGE=s3` (done by Aarush); photos do not open yet. Fix is B13, phone check is A4
- [ ] B4 Bedrock test with one photo; else `TRIAGE_MODE=manual`. Aarush runs it (A3); B18 and B19 are done, so it can go ahead
- [ ] B5 Backend gaps found by Aarush (`PLAN.md` section 7). Done in branch `ujjwal/backend-fixes`: items 1 (task banner), 2 (map task fields), 3 (reporter confirm, B15), 5 (`make test-web`, web tests in CI), 6 (JDK 17 and Android SDK in `DEPLOY.md`), 8 (S3 URLs, B13), 9 (buildx pinned in the bootstrap script), 10 (`deploy-ssm.sh` archives from the repo root). Left: 4 (seed tuning, with B7 data), 7 (Protocol refactor, not before the freeze)
- [ ] B6 `make apk API=https://<host>`; install on a phone; camera and GPS work
- [ ] B7 (tooling done: `make seedcheck`, `scripts/build_seed.py`, see `docs/DATA.md`) Real drain and pocket data for the ward in `seed.json`; owner source per drain. Decide sourcing first (OpenStreetMap drains, published hotspot lists, cited ownership rules)
- [x] B8 Rate limit (`REPORTS_PER_DAY`, 429), repeat-report hold (`duplicate_nearby`), fill-time low and high range (branch `ujjwal/backend-hardening`)
- [x] B9 Hourly DB copy to S3 by cron and a first AMI (done by Aarush). Restore test is A5; fresh AMI before recording is A7
- [x] B10 Photo checks: hash reuse, EXIF geotag and time, capture token, stamp check, held reports (done, PR #1)
- [x] B11 Admin release or reject of a held report (`POST /api/incidents/{id}/review`, `GET /api/incidents?held=true`). Aarush: needs a held queue and review buttons
- [x] B12 `GET /api/insights` and `GET /api/reports/ward` (rule-based, tested). Value rises when B7 real data is in

From the backend review of 10 Oct. Each fix needs a test. Keep changes additive.

Do first (demo blocker and loop bugs):

- [x] B13 **Photos 403 on the live site (blocks the video).** `app/storage.py` signs for the global S3 host. Use one regional client (`endpoint_url=https://s3.<region>.amazonaws.com`, `signature_version="s3v4"`, virtual addressing; exact line in `PLAN.md` section 7 item 8) in `presigned()`, `save_photo()` and `app/checks.py`
- [x] B14 **A disputed task is a dead end.** Every action returns 409 and new reports attach to the dead task. Done: `POST /api/tasks/{id}/reopen` by the owning official or admin, `disputed` to `accepted`, event `reopened`. Aarush: V11
- [x] B15 **The reporter can confirm their own report.** The check in `confirm` compares with `done_by`, which is never a resident. Block the resident who made the first report on the task; 403 with a plain message. A later reporter may confirm (the demo loop needs a second resident). Done in branch `ujjwal/backend-fixes`
- [x] B16 **A file that is not an image passes as a report photo.** Done as 422 "the photo could not be read as an image" on both report and after-photo; nothing is stored
- [x] B17 **The photo is stored before the report is checked.** Validate `kind` and read the image first; save to storage last. Stops orphan objects and the upload path that skips the rate limit

Do next:

- [x] B18 **Bedrock calls block the whole server.** Move `create_incident` and `complete` off the event loop (plain `def`, or `run_in_threadpool` for the AWS calls). Give the Bedrock client short timeouts (`connect_timeout=3, read_timeout=15, retries 1`)
- [x] B19 **Large photos fail triage without a message.** Bedrock's image limit is below our 8 MB limit (check the current figure). Downscale a copy server-side before the two model calls; Aarush shrinks on the phone too (V10)
- [x] B20 **`/api/health?deep=1` is public and does paid AWS work.** Done: admin persona only (`X-User-Id: admin-1`) and cached for 30 s; the AWS playbook curls send the header
- [x] B21 **No upload size cap before memory.** Add `request_body { max_size 10MB }` to the `Caddyfile` and stop reading at the limit in the API
- [x] B22 **Missing `CAPTURE_SECRET` is silent.** Add a `config_warnings` line when it is empty; tokens then die on every deploy. Done: it shows in `config_warnings` until Aarush sets it on the server (A8)

If time allows:

- [x] B23 Capture tokens can be replayed for 15 minutes. Done: a saved report uses up its token (in memory, one process); a refused report does not
- [x] B24 Flat or dark photos share one hash (`0000000000000000`) and get held as reused. Done: `photocheck.informative()` skips the reuse check for hashes with fewer than 8 or more than 56 set bits
- [x] B25 A bounced task carries the first agency's delay. Done: `due_at` resets on reassign and assign; accountability hours count from that agency's latest created, reassigned or assigned event
- [x] B26 `/api/health` says `ok: true` when a router failed to load. Done: `ok` is false when a router failed; `requirements.txt` is pinned to the tested versions
- [ ] B27 Reads are wide: task detail needs no login, and any resident can list every resident's reports. Decide what the public dashboard may show; hide `user_id` and notes from other residents

Known and accepted for the demo: persona header auth (anyone with the URL can act as admin; cover is the hourly backup and a fresh AMI), one shared SQLite connection with no rollback.

## 6. Full backlog: Aarush

- [x] V1 Run `make setup && make run`. Click through every screen on a phone-sized window. List bugs
- [x] V2 Fix the report screen: camera, GPS, pin, result card
- [x] V3 Fix the official flow: inbox, task detail, accept, "Not ours", complete with photo
- [x] V4 Fix the confirm screen and the "did the work" error message
- [x] V5 Admin screen: assign and generate plan (V1 to V5 done in PR #3)
- [ ] V5b Dashboard screens: check in a browser, fix, polish (map, accountability, impact, simulator, capture)
- [ ] V6 Stranger test with someone outside the team; fix what confuses them
- [ ] V7 Good-to-haves from SCOPE 4.1 to 4.4 (screens)
- [ ] V8 Screenshots and clean empty states for the video
- [ ] V9 Photo capture camera, stamp, token, flags display (section 4, "what the backend now needs")
- [ ] V10 Shrink the photo on the phone before upload (longest side about 1600 px, JPEG, under 2 MB), after the stamp is drawn. Bedrock cannot read large images (B19). `PLAN.md` section 6 has the adapter slot
- [ ] V11 Disputed tasks: when B14 lands, show a disputed task in the official inbox with its reason and a "Take it up again" button
- [ ] V12 Confirm screen: show the plain 403 message when the reporter tries to confirm their own report (B15), and the 422 "could not be read as an image; please take it again" message when a photo cannot be read (B16)

AWS work (Aarush owns the account). The full AWS CLI playbook, written so an agent can run it, is `docs/AWS_TODO.md`. Fill in its section 10 and send it to Ujjwal.

- [ ] A1 Inventory check: instance, role, hop limit 2, private bucket, health (`AWS_TODO` section 2)
- [ ] A2 **Automatic deploy on merge to `main`**: SSM policy on the EC2 role, GitHub OIDC provider, role `rainready-github-deploy`, one deploy by hand; then Ujjwal sets four repo variables (section 3). Do this first: every later fix reaches the live site through it
- [ ] A3 Bedrock: use-case form in the console, pick a model id from the account's list, test, switch the server to `TRIAGE_MODE=bedrock`; if it fails, stay on manual and send the error text (section 4). Wait for B18 and B19
- [ ] A4 After B13 is deployed: report a photo from a phone and check it opens (section 5)
- [ ] A5 Backups: cron line present, newest copy under 70 minutes old, restore test (section 6)
- [ ] A6 Port 22 open to your IP only; check the cost so far (section 7)
- [ ] A7 Before recording, when Ujjwal says go: fresh seed data on the live DB and a new AMI (section 8)
- [ ] A8 Set `CAPTURE_SECRET` in the server `.env` if it is empty: `openssl rand -hex 24`, then `docker compose up -d --force-recreate app`

## 7. Shared tasks

- [x] S1 Both check in on the event page and finish student verification (done)
- [ ] S2 Pin the real deadline hour; freeze code 6 hours before it. Known: the first submission is not before 12:00 noon on the last day, and there is time to iterate
- [ ] S3 Fact-check every number spoken in the video
- [ ] S4 Video: script from SCOPE section 9, record, upload, test signed out (split: Ujjwal records the AWS part, Aarush the phone part)
- [ ] S5 Write-up and credits in `README.md`: problem, build, where AWS fits, AI tools used
- [ ] S6 Make the repo public and test the clone signed out

## 8. Timeline

| Hours | Ujjwal | Aarush | Merge point |
|---|---|---|---|
| 0-1 | B1 | V1 | Both on main, tests green |
| 1-3 | B2, B3 | V2, V3 | Live HTTPS URL |
| 3-6 | B4, B5 | V4, V5, V5b | Whole loop works on the live URL |
| 6-8 | B6 | V6 | APK on a phone |
| 8-12 | B7, B8 | V7 | Real data in; polish |
| 12-14 | B9, fixes | V8, V9 fixes | **Code freeze** |
| 14-16 | S4, S5, S6 | S4, S5 | Submit |

Cut order if late: capture screen, simulator screen, Bedrock, APK polish, dispute flow. Never cut: the loop, the accountability chart, the AWS deploy, the video.

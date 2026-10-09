# Tasks and working agreement (2 developers)

Ujjwal and Aarush work in parallel on **main** with short-lived branches. The split below is by file, so merges rarely touch the same lines.

## 0. Status on 10 Oct 2026 (read first)

**Done (PR #1, branch `ujjwal/b1-license-deploy-aids`):** LICENSE; CI at the repo root (green); S3 and Bedrock code paths with tests; deploy scripts in `scripts/`; `/api/health?deep=1`; photo checks (perceptual hash, EXIF geotag and time); capture token and on-photo stamp check; held-for-review reports; `docs/CAPTURE.md`. 76 tests pass.

**Done (branch `ujjwal/backend-hardening`):** B8 rate limit, repeat-report hold, fill-time range; B11 admin release or reject of held reports; B12 `/api/insights` and `/api/reports/ward`; seed validator (`make seedcheck`) and `scripts/build_seed.py`; `docs/DATA.md`. 100 tests pass. Aarush: new endpoints need screens (held queue, review buttons, range display, insights and report views).

**Blocked on AWS:** nothing has run on real AWS. Aarush owns the account with credits. The deploy playbook was shared with him directly. After it runs he sends Ujjwal the URL.

**Left, Ujjwal:** B2 to B4 once the host exists (Aarush runs the CLI playbook), B5 from Aarush's bug list, B6 APK with the real host, B7 real data (plan sourcing first), B9 backup cron and AMI (B8, B11, B12 done).

**Left, Aarush:** V1 bug list, V2 to V5 as below, and **V9 (new): the photo capture camera**. Details in section 4 below. First submission is not before 12:00 noon on the last day. The exact hour is unknown, so keep the freeze rule.

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
4. Before merging: `git fetch && git rebase origin/main`, run `make test`, then open a PR and merge it (rebase-and-merge or merge commit).
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
- [ ] B3 Switch the server to `STORAGE=s3`; check photos load in the UI
- [ ] B4 Bedrock test with one photo; else `TRIAGE_MODE=manual`
- [ ] B5 Backend gaps found by Aarush: add or fix endpoints, keep `tests/test_flow.py` green. The list is `PLAN.md` section 7; item 8 (S3 photo URLs) blocks the video
- [ ] B6 `make apk API=https://<host>`; install on a phone; camera and GPS work
- [ ] B7 (tooling done: `make seedcheck`, `scripts/build_seed.py`, see `docs/DATA.md`) Real drain and pocket data for the ward in `seed.json`; owner source per drain. Decide sourcing first (OpenStreetMap drains, published hotspot lists, cited ownership rules)
- [x] B8 Rate limit (`REPORTS_PER_DAY`, 429), repeat-report hold (`duplicate_nearby`), fill-time low and high range (branch `ujjwal/backend-hardening`)
- [ ] B9 Hourly DB copy to S3 (`scripts/backup.sh` is written; add cron on the server); AMI before recording
- [x] B10 Photo checks: hash reuse, EXIF geotag and time, capture token, stamp check, held reports (done, PR #1)
- [x] B11 Admin release or reject of a held report (`POST /api/incidents/{id}/review`, `GET /api/incidents?held=true`). Aarush: needs a held queue and review buttons
- [x] B12 `GET /api/insights` and `GET /api/reports/ward` (rule-based, tested). Value rises when B7 real data is in

## 6. Full backlog: Aarush

- [ ] V1 Run `make setup && make run`. Click through every screen on a phone-sized window. List bugs
- [ ] V2 Fix the report screen: camera, GPS, pin, result card
- [ ] V3 Fix the official flow: inbox, task detail, accept, "Not ours", complete with photo
- [ ] V4 Fix the confirm screen and the "did the work" error message
- [ ] V5 Admin screen: assign and generate plan
- [ ] V5b Dashboard screens: check in a browser, fix, polish (map, accountability, impact, simulator, capture)
- [ ] V6 Stranger test with someone outside the team; fix what confuses them
- [ ] V7 Good-to-haves from SCOPE 4.1 to 4.4 (screens)
- [ ] V8 Screenshots and clean empty states for the video
- [ ] V9 Photo capture camera, stamp, token, flags display (section 4, "what the backend now needs")

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

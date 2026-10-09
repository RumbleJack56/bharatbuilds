# Tasks and working agreement (2 developers)

Aarush and Ujjwal work in parallel on **main** with short-lived branches. The split below is by file, so merges rarely touch the same lines.

## 1. Who owns what

| | Aarush: backend, AWS, data, APK | Ujjwal: all views and screens |
|---|---|---|
| Files | `app/**` `ai/**` `core/**` `schema.sql` `data/seed.json` `tests/**` `mobile/**` `Makefile Dockerfile docker-compose.yml Caddyfile .env.example` `docs/DEPLOY.md` `.github/**` | everything in `web/` (`index.html` `config.js` `css/**` `js/**`) |
| Concerns (SCOPE 4.x) | API and logic for 4.3 to 4.7, plus 4.8, 4.9, 4.10 | Every screen in 4.1 to 4.6 (resident, official, admin, dashboard, simulator, capture) |
| Shared (either) | `SCOPE.md` `TASKS.md` `README.md` `CLAUDE.md`: small edits, own rows only | |

If you need a change in the other person's files, ask in chat or open a small PR for just that change.

## 2. The API is the contract

- The running server's `/docs` page is the contract. Ujjwal builds against a local server with the seed data, so there is no waiting and no mocks.
- Backend changes are **additive**: new fields and new endpoints are fine. Renaming or removing a field needs a heads-up first, and the commit message starts with `API:`.
- Aarush keeps `tests/test_flow.py` green. It walks the whole loop through HTTP.
- `web/js/api.js` is the only place that calls `fetch`. Screens never build URLs by hand.

## 3. Branching: main-line development

1. `main` always works: `make test` passes and the app starts. Never push a broken main.
2. Start from fresh main: `git switch main && git pull --rebase`.
3. Branch per small change: `aarush/<topic>` or `ujjwal/<topic>`. Keep it under half a day. Merge the same day.
4. Before merging: `git fetch && git rebase origin/main`, run `make test`, then open a PR and merge it (rebase-and-merge or merge commit).
5. The other person (or the CI run) checks the PR. A PR that only touches your own files may be self-merged when tests are green.
6. No force-push to `main`. No history rewrites. History must match the event dates (Oct 8-11).
7. Commit messages: `[aarush] area: what` or `[ujjwal] area: what`. Add `API:` first if the contract changed.
8. Unfinished work that is not ready for users goes behind a hidden route or a TODO tab; it must not break existing screens.
9. Never commit `.env`, `var/`, `.venv`, `mobile/android`, `mobile/www`, `mobile/node_modules`, `*.apk`.

CI (`.github/workflows/test.yml`) runs `make test` on every push and pull request.

## 4. Start here: the next five tasks each

Do these in order. Each has a "done when" so you can merge without asking.

### Aarush (backend, AWS)

1. **A1 Land the reset.** Add `LICENSE` (MIT). Check `make setup && make test` passes on your machine. Confirm both of you can push to `main`. *Done when:* a fresh clone runs `make run` and `/api/health` says `ok`.
2. **A2 Get a public HTTPS URL.** Follow `docs/DEPLOY.md`: AWS account, region ap-south-1, private S3 bucket, EC2 role (S3 + Bedrock), t3.small, Elastic IP, Docker, Caddy on `<ip-with-dashes>.sslip.io`. Send Ujjwal the URL. *Done when:* `https://<host>/api/health` works from a phone and the UI loads. Target: hour 3.
3. **A3 Photos on S3.** Set `STORAGE=s3` and `S3_BUCKET` on the server. Post a report with a photo and check it loads through `/media/...`. Fix the IAM role if it 403s. *Done when:* a photo reported from a phone shows in the task timeline and the object is in the bucket.
4. **A4 Bedrock go/no-go.** Enable a Claude model in the console, find the id with `aws bedrock list-inference-profiles --region ap-south-1`, set `BEDROCK_MODEL_ID` and `TRIAGE_MODE=bedrock`, then report one photo with no category chosen. If it fails, leave `TRIAGE_MODE=manual` and tell Ujjwal. *Done when:* the incident's `ai` field is filled, or manual mode is confirmed and noted in `docs/DEPLOY.md`.
5. **A5 Backend gaps from Ujjwal.** Take his list (he will write it in chat or as issues). Likely items: use `GET /api/agencies` in the selects (it exists), map task markers with asset name and last cleaned, a friendlier 403 text. Keep changes additive and `tests/test_flow.py` green. *Done when:* each gap has a test and is on `main`.

### Ujjwal (all screens)

1. **U1 Run it and list the bugs.** `make setup && make run`, open `http://localhost:8010` in a phone-sized window. Walk the whole loop with the five personas (report, accept, complete, confirm). Use `docs/API.md` as the map. Write every bug in a shared list. *Done when:* the list exists and you know which screens work.
2. **U2 Report screen.** Camera input, GPS with fallback, tap-to-move pin, kind and note, result card showing the linked drain and the field rule. *Done when:* a report from your phone appears in My reports and in the official's inbox.
3. **U3 Official flow.** Inbox ranked and filtered to the agency; task detail with timeline; Accept; "Not ours" with reason and agency select; Complete with a required photo. *Done when:* a task goes open to done as `off-mcd`, and a bounce to PWD shows in the PWD inbox.
4. **U4 Confirm screen.** List done tasks, show before and after photos, "Looks fixed" and "Still a problem"; friendly message when the same person did the work. *Done when:* confirming as `res-2` makes the task confirmed and the pocket fill time on the dashboard goes up.
5. **U5 Dashboard check.** Map, accountability, impact, simulator, capture in a browser. Fix layout and anything that lies (colour-only status, missing banners, banned words). *Done when:* the dashboard tells the demo story with seed data: a "No owner found" row, a bounce, and a pocket that slows after a confirmation.

Everything below is the full backlog after these.

## 5. Full backlog: Aarush

- [ ] A1 LICENSE (MIT), push the reset to `main`, confirm both can push
- [ ] A2 AWS: account, ap-south-1, private S3 bucket, EC2 role, EC2 t3.small, Elastic IP, Caddy HTTPS (`docs/DEPLOY.md`). **Public URL by hour 3**
- [ ] A3 Bedrock test with one photo; else `TRIAGE_MODE=manual`
- [ ] A4 Switch the server to `STORAGE=s3`; check photos load in the UI
- [ ] A5 Backend gaps found by Ujjwal: add or fix endpoints, keep `tests/test_flow.py` green
- [ ] A6 `make apk API=https://<host>`; install on a phone; camera and GPS work
- [ ] A7 Real drain and pocket data for the ward in `seed.json`; owner source per drain
- [ ] A8 Backend good-to-haves from SCOPE 4.5 to 4.9, in the order listed
- [ ] A9 Hourly DB copy to S3; AMI before recording

## 6. Full backlog: Ujjwal

- [ ] U1 Run `make setup && make run`. Click through every screen on a phone-sized window. List bugs
- [ ] U2 Fix the report screen: camera, GPS, pin, result card
- [ ] U3 Fix the official flow: inbox, task detail, accept, "Not ours", complete with photo
- [ ] U4 Fix the confirm screen and the "did the work" error message
- [ ] U5 Admin screen: assign and generate plan
- [ ] U5b Dashboard screens: check in a browser, fix, polish (map, accountability, impact, simulator, capture)
- [ ] U6 Stranger test with someone outside the team; fix what confuses them
- [ ] U7 Good-to-haves from SCOPE 4.1 to 4.4 (screens)
- [ ] U8 Screenshots and clean empty states for the video

## 7. Shared tasks

- [ ] S1 Both check in on the event page and finish student verification
- [ ] S2 Pin the real deadline hour; freeze code 6 hours before it
- [ ] S3 Fact-check every number spoken in the video
- [ ] S4 Video: script from SCOPE section 9, record, upload, test signed out (split: Aarush records the AWS part, Ujjwal the phone part)
- [ ] S5 Write-up and credits in `README.md`: problem, build, where AWS fits, AI tools used
- [ ] S6 Make the repo public and test the clone signed out

## 8. Timeline

| Hours | Aarush | Ujjwal | Merge point |
|---|---|---|---|
| 0-1 | A1 | U1 | Both on main, tests green |
| 1-3 | A2, A3 | U2, U3 | Live HTTPS URL |
| 3-6 | A4, A5 | U4, U5, U5b | Whole loop works on the live URL |
| 6-8 | A6 | U6 | APK on a phone |
| 8-12 | A7, A8 | U7 | Real data in; polish |
| 12-14 | A9, fixes | U8, fixes | **Code freeze** |
| 14-16 | S4, S5, S6 | S4, S5 | Submit |

Cut order if late: capture screen, simulator screen, Bedrock, APK polish, dispute flow. Never cut: the loop, the accountability chart, the AWS deploy, the video.

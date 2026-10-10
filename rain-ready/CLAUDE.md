# CLAUDE.md: read first, every session

**Rain-Ready**: a shared action list for monsoon waterlogging. What to clean, who owns it, who did it, who checked, did it help.
Read `SCOPE.md` (what, MVP vs good-to-haves) and `TASKS.md` (who owns which files, branching rules, tasks) before coding; for any `web/` work also read `PLAN.md` (module plan and task order). Ask which developer you are working for (Ujjwal: backend, AWS, data, APK; Aarush: all of `web/`) and edit only that person's files.

## Stack
FastAPI + SQLite (`app/`), pure logic in `core/` (tested), plain HTML/JS in `web/` (no build step), Capacitor wrapper in `mobile/` for the APK. AWS: EC2, S3, Bedrock. The API contract is `/docs` on the running server.

## Commands
`make setup` once; `make run` (http://localhost:8010, UI + API); `make test`; `make reset` (then restart the server: seed edits apply only to a fresh DB); `make apk API=https://<host>`. Data: `make eda`, `make seed` (or `make demo-db` for rehearsal history), `make verify-db` (check a seeded database), `make demo` (live lifecycle against a running server), `/board` (public leaderboard). Docs: `docs/EDA.md`, `docs/SEEDING.md`.
Demo personas (header `X-User-Id`): `res-1`, `res-2` (residents), `off-mcd`, `off-pwd` (officials), `admin-1`.

## Rules
1. Follow SCOPE section 7 (honesty rules). Banned UI words are checked in tests.
2. Backend changes are additive. Do not rename or remove a response field without telling the other developer; start such a commit message with `API:`.
3. Only the HTTP adapter calls `fetch`: `web/js/adapters/http-fetch.js` (legacy `web/js/api.js` until `PLAN.md` Task 12 deletes it).
4. Keep `main` working: run `make test` before every push. Small branches, merged the same day. No force-push, no history rewrites.
5. Do not push unless the developer asks.
6. Do not invent data or coordinates. Label placeholders.
7. Keep files small (about 250 lines or fewer) and comments short.

## Architecture: controller, interface, implementation (hard rule)
Every module is decoupled so any piece swaps without breaking its callers:
- **Controllers** orchestrate only. They receive their dependencies (web: the `ctx` built in `web/js/main.js`; backend: FastAPI `Depends`) and never construct a platform client.
- **Interfaces (ports)** name what a dependency must do: `web/js/ports/index.js`, checked at startup by `implement()`; backend: a `typing.Protocol`.
- **Implementations (adapters)** are the only code that touches a platform: `fetch` in `web/js/adapters/http-fetch.js`, Leaflet in `web/js/adapters/map-leaflet.js`, disk or S3 in `app/storage.py`, Bedrock in `ai/triage.py`.
- **Pure logic** (`web/js/views/`, `web/js/ui/`, `core/`) has no I/O and is unit-tested.
- One composition root picks implementations (`web/js/main.js`; `app/config.py`). A swap is a new adapter plus one line there.
- `web/tests/architecture.test.js` enforces the web import rules; run `node --test web/tests`. Full layer table: `PLAN.md` section 2.

## Skills (use them when installed)
- Session start: `superpowers:using-superpowers`.
- New feature or behaviour change: `superpowers:brainstorming`, then `superpowers:writing-plans`; execute with `superpowers:executing-plans` or `superpowers:subagent-driven-development`.
- Any code change: `superpowers:test-driven-development` or `mattpocock-skills:tdd`.
- Bug, failing test or slowness: `superpowers:systematic-debugging` or `mattpocock-skills:diagnosing-bugs`.
- Designing a port, module or seam: `mattpocock-skills:codebase-design`.
- Before saying done: `superpowers:verification-before-completion`. Before merging: `mattpocock-skills:code-review`.
- Context growing, slow or rate-limited: `token-optimization`, `rescue-tokens`.
- Chat replies and status updates: `caveman`. Code, commits and docs stay in plain prose.

## Context budget: handoff at 200k tokens (hard rule)
When the session passes 200k tokens of context (check with `/context`), stop at the next clean point (tests green, no half-made edit) and:
1. Write a handoff file with the `session-transfer` skill: goal, what is done, what is in progress, next steps, decisions and why, open questions, files touched, commands to run. Give its full path.
2. The developer runs `/clear`.
3. The new session starts with "Resume from `<path>`", reads that file and this one, then continues from its next steps.

## Event rules that bind the code
Public repo at submission. Git history must match Oct 8-11. Credit anything not ours. List AI tools in the write-up. The video must show AWS (console and live URL).

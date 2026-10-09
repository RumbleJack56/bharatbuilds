# CLAUDE.md: read first, every session

**Rain-Ready**: a shared action list for monsoon waterlogging. What to clean, who owns it, who did it, who checked, did it help.
Read `SCOPE.md` (what, MVP vs good-to-haves) and `TASKS.md` (who owns which files, branching rules, tasks) before coding. Ask which developer you are working for (Aarush: backend, AWS, data, APK; Ujjwal: all of `web/`) and edit only that person's files.

## Stack
FastAPI + SQLite (`app/`), pure logic in `core/` (tested), plain HTML/JS in `web/` (no build step), Capacitor wrapper in `mobile/` for the APK. AWS: EC2, S3, Bedrock. The API contract is `/docs` on the running server.

## Commands
`make setup` once; `make run` (http://localhost:8010, UI + API); `make test`; `make reset` (then restart the server: seed edits apply only to a fresh DB); `make apk API=https://<host>`.
Demo personas (header `X-User-Id`): `res-1`, `res-2` (residents), `off-mcd`, `off-pwd` (officials), `admin-1`.

## Rules
1. Follow SCOPE section 7 (honesty rules). Banned UI words are checked in tests.
2. Backend changes are additive. Do not rename or remove a response field without telling the other developer; start such a commit message with `API:`.
3. `web/js/api.js` is the only place that calls `fetch`.
4. Keep `main` working: run `make test` before every push. Small branches, merged the same day. No force-push, no history rewrites.
5. Do not push unless the developer asks.
6. Do not invent data or coordinates. Label placeholders.
7. Keep files small (about 250 lines or fewer) and comments short.

## Event rules that bind the code
Public repo at submission. Git history must match Oct 8-11. Credit anything not ours. List AI tools in the write-up. The video must show AWS (console and live URL).

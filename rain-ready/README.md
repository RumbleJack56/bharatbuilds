# Rain-Ready

Pre-monsoon drain-readiness evidence and basement preparedness for Indian cities. Pilot: Old Rajinder Nagar / Karol Bagh, Delhi.
Built for WeMakeDevs x AWS **Environmental Hacks** (Oct 2026), track **Heat and Water**.

> Unofficial. Information only. Not a flood forecast and not an official warning. Official warnings: IMD / NDMA Sachet.

## Start here (new teammate or new Claude session)
1. `CLAUDE.md`: context and hard rules (read first, every session)
2. `PROJECT.md`: what we are building and why, the golden path, the video
3. `TASKS.md`: **task board: dev#1 (Ujjwal) and dev#2 (Aarush)**, sync points, what to do first
4. `WORK_PACKAGES.md`: your package (P1 Platform, P2 Backend, P3 Frontend, P4 Logic/data/content), the seams, checkpoints
5. `openapi.yaml`, `schema.sql`, `core/`: the contract everyone builds to

## Quickstart
```
make setup     # venv + deps (uses uv, Python 3.12)
make run       # http://localhost:8010
make test      # core logic tests
make status    # contract board: PASS / TODO / FAIL per endpoint
```

## Layout
```
app/        FastAPI app (main, db, ledger, auth, routers/)
core/       pure logic: scoring, closure levels, building level, ledger hash, safety copy, geo
ai/         photo triage (Bedrock or manual fallback)       [P2]
data/       seed.json (hand-digitised placeholders, labelled)
web/        static pages + MapLibre                          [P3]
scripts/    status.py (contract board), flow.py (end-to-end smoke test)
docs/       research, adversarial review, implementation notes + AWS runbook
evidence/   saved forecast-vs-observed data, interview notes
```

## Credits and licences
(P4: keep this current. Anything we did not write goes here with its licence.) FastAPI, Uvicorn, Pydantic, Pillow, imagehash, boto3, MapLibre GL JS, OpenStreetMap data and tiles (ODbL; attribution shown on the map), Open-Meteo (CC BY 4.0, non-commercial free tier).

## AI tools used
Claude Code (Anthropic) was used for planning, code and documentation. Amazon Bedrock is used for photo triage only when `TRIAGE_MODE=bedrock`. (P4: confirm exact wording before submitting.)

## Licence
MIT (P1: add `LICENSE`).

# Rain-Ready

Which low points fill first as rain increases, whether the drains feeding them were really cleaned, and what each person should do. Pilot: Old Rajinder Nagar / Karol Bagh, Delhi.
Built for WeMakeDevs x AWS **Environmental Hacks** (Oct 2026), track **Heat and Water**.

> Unofficial. Scenario and preparedness tool, not a flood forecast and not an official warning. Official warnings: IMD / NDMA Sachet.

## Start here (new teammate or new Claude session)
1. `CLAUDE.md`: context, ownership and hard rules (read first, every session)
2. `PROJECT.md`: what we are building and why, the features, the golden path, the video
3. `TASKS.md`: **task board per dev** (dev#1 Ujjwal, dev#2 Aarush, dev#3, dev#4), sync points, what to do first
4. `WORK_PACKAGES.md`: the seams, how four people and four Claude sessions stay in sync, kickoff prompts
5. `openapi.yaml`, `schema.sql`, `core/`: the contract everyone builds to

## Quickstart
```
make setup     # venv + deps (uses uv, Python 3.12)
make run       # http://localhost:8010
make test      # unit and API tests
make status    # contract board: PASS / TODO / FAIL per endpoint
```

## Layout
```
app/        FastAPI app (main, db, ledger, auth, routers/)
core/       pure logic: scoring, closure levels, building level, low-point simulator, rain-capture rules,
            ledger hash, safety copy, geo
ai/         photo triage (Bedrock or manual fallback)
data/       seed.json (pockets, assets, hotspots; hand-placed and labelled), capture_presets.json, replay_2024.json
web/        static pages + MapLibre
scripts/    status.py (contract board), build_replay.py, flow.py (end-to-end smoke test)
docs/       research, adversarial review, implementation notes + AWS runbook
evidence/   saved forecast-vs-observed data, interview notes
```

## Credits and licences
(dev#4 owns this whole file; dev#1 only adds `LICENSE`. Keep this current. Anything we did not write goes here with its licence.) FastAPI, Uvicorn, Pydantic, Pillow, imagehash, boto3, MapLibre GL JS, OpenStreetMap data and tiles (ODbL; attribution shown on the map), Open-Meteo (CC BY 4.0, free non-commercial tier).

## AI tools used
Claude Code (Anthropic) was used for planning, code and documentation. Amazon Bedrock is used for photo triage only when `TRIAGE_MODE=bedrock`. (dev#4: confirm exact wording before submitting.)

## Licence
MIT (dev#1 adds the `LICENSE` file).

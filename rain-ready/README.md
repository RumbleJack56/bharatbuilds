# Rain-Ready

A shared action list for monsoon waterlogging: **what to clean, who owns it, who did it, who checked, did it help.**

Residents report a blocked drain. The system links it to the nearest drain and low-point pocket, picks the owner agency (or says "No owner found") and ranks the task by how much fill time cleaning would buy. Officials accept, bounce ("wrong owner") or complete with a photo. A different resident confirms. A public dashboard shows the map, a responsibility chart per agency, impact numbers, a rain scenario simulator and rain-capture candidates.

Pilot ward: Old Rajinder Nagar and Karol Bagh, Delhi. Seed data is **placeholder** and labelled. Scenario numbers are illustrative, not forecasts.

One web codebase (`web/`) runs in a browser and as an Android APK (`mobile/`).

Docs: [`SCOPE.md`](SCOPE.md) (what we build), [`docs/API.md`](docs/API.md) (endpoint map), [`TASKS.md`](TASKS.md) (who does what, branching), [`docs/DEPLOY.md`](docs/DEPLOY.md) (AWS).

## Run
```
make setup && make run      # http://localhost:8010   API docs at /docs
make test
```

## AWS
EC2 (host), S3 (photos), Bedrock (photo to report category).

## Credits and AI tools
- FastAPI, Uvicorn, Pydantic, boto3 (open source). Leaflet 1.9.4 and OpenStreetMap tiles. Capacitor (MIT).
- Built with Claude Code (Claude Sonnet 5.5) as a coding assistant.
- TODO before submission: LICENSE and the final credits list.

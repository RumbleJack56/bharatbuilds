PY := .venv/bin/python
.PHONY: setup run test seedcheck reset deploy apk
setup:            ## one-time: venv + deps
	uv venv --python 3.12 .venv && uv pip install --python $(PY) -r requirements.txt
run:              ## local server on :8010 with reload (UI + API)
	$(PY) -m uvicorn app.main:app --reload --port 8010
test:
	$(PY) -m pytest -q tests
seedcheck:        ## validate data/seed.json (sources, citations, ids, coordinates)
	$(PY) -m core.seedcheck data/seed.json
reset:            ## wipe local DB + photos; RESTART the server afterwards (seed.json only applies to a fresh DB)
	rm -f var/rainready.db var/rainready.db-wal var/rainready.db-shm && rm -rf var/photos
deploy:           ## needs HOST=ec2-user@<elastic-ip>
	ssh $(HOST) 'cd bharatbuilds/rain-ready && git pull --rebase && docker compose up -d --build'
apk:              ## needs API=https://<your-host>  -> mobile/rain-ready.apk
	cd mobile && ./build.sh $(API)

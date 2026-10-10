PY := .venv/bin/python
.PHONY: setup run test test-web seedcheck reset deploy apk eda seed demo-db demo verify-db
setup:            ## one-time: venv + deps
	uv venv --python 3.12 .venv && uv pip install --python $(PY) -r requirements.txt
run:              ## local server on :8010 with reload (UI + API)
	$(PY) -m uvicorn app.main:app --reload --port 8010
test:
	$(PY) -m pytest -q tests
test-web:         ## web unit tests (node 20+, no install); the glob avoids node treating the folder as a module
	node --test 'web/tests/*.test.js'
seedcheck:        ## validate data/seed.json (sources, citations, ids, coordinates)
	$(PY) -m core.seedcheck data/seed.json
reset:            ## wipe local DB + photos; RESTART the server afterwards (seed.json only applies to a fresh DB)
	rm -f var/rainready.db var/rainready.db-wal var/rainready.db-shm && rm -rf var/photos
deploy:           ## needs HOST=ec2-user@<elastic-ip>
	ssh $(HOST) 'cd bharatbuilds/rain-ready && git pull --rebase && docker compose up -d --build'
apk:              ## needs API=https://<your-host>  -> mobile/rain-ready.apk
	cd mobile && ./build.sh $(API)
eda:              ## EDA pipeline: Delhi records -> data/consolidated/eda.json and docs/EDA_RESULTS.md
	$(PY) -m scripts.run_eda
seed:             ## build var/rainready.db: schema, real seed, Delhi evidence base (FORCE=1 to rebuild)
	$(PY) -m scripts.seed_db $(if $(FORCE),--force)
demo-db:          ## same plus 84 days of rehearsal history through the API
	$(PY) -m scripts.seed_db --demo --force
demo:             ## walk the live lifecycle against a running server: make demo BASE=http://localhost:8010
	$(PY) -m scripts.demo_flow --base $(or $(BASE),http://localhost:8010)
verify-db:        ## check a seeded database completely and through the API (read only): make verify-db DB=var/demo.db
	$(PY) -m scripts.verify_db $(if $(DB),--db $(DB))

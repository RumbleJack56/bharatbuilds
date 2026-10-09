PY := .venv/bin/python
.PHONY: setup run test status deploy reset
setup:            ## one-time: venv + deps
	uv venv --python 3.12 .venv && uv pip install --python $(PY) -r requirements.txt
run:              ## local server on :8010 with reload
	$(PY) -m uvicorn app.main:app --reload --port 8010
test:             ## pure-logic tests (core/) and any router tests
	$(PY) -m pytest -q tests
status:           ## contract status board vs the running server (BASE=http://host to point elsewhere)
	$(PY) scripts/status.py $(or $(BASE),http://localhost:8010)
reset:            ## wipe local DB + photos and re-seed on next start
	rm -f var/rainready.db var/rainready.db-wal var/rainready.db-shm && rm -rf var/photos
deploy:           ## owner dev#1: needs HOST=ec2-user@<elastic-ip>
	ssh $(HOST) 'cd rain-ready && git pull --rebase && docker compose up -d --build'

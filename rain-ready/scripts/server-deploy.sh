#!/usr/bin/env bash
# Runs on the EC2 host after new code is unpacked (called by scripts/deploy-ssm.sh).
# Rebuilds, restarts, and fails if the app does not answer /api/health.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d --build
for _ in $(seq 1 30); do
  if docker compose exec -T app python -c \
    "import json, urllib.request as u; h = json.load(u.urlopen('http://localhost:8000/api/health', timeout=3)); assert not h['router_errors'], h" 2>/dev/null; then
    echo "ok: ${1:-unknown} is live"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done
echo "app did not answer /api/health" >&2
docker compose logs --tail 40 app >&2
exit 1

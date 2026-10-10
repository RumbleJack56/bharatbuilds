#!/usr/bin/env bash
# Copy the SQLite DB to S3: backup/rainready-<hour>.db (24 hourly copies, each overwritten the next day) and
# backup/daily/rainready-<date>.db (one per day, the last run of that day wins). Cron (hourly):
#   0 * * * * S3_BUCKET=<bucket> /home/ec2-user/bharatbuilds/rain-ready/scripts/backup.sh
set -euo pipefail
: "${S3_BUCKET:?set S3_BUCKET}"
cd "$(dirname "$0")/.."
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
# consistent snapshot even while the app writes (WAL)
python3 -c "import sqlite3,sys; s=sqlite3.connect('file:var/rainready.db?mode=ro',uri=True); d=sqlite3.connect(sys.argv[1]); s.backup(d)" "$TMP"
aws s3 cp "$TMP" "s3://$S3_BUCKET/backup/rainready-$(date -u +%H).db" --only-show-errors
aws s3 cp "$TMP" "s3://$S3_BUCKET/backup/daily/rainready-$(date -u +%Y%m%d).db" --only-show-errors

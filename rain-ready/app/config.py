"""Settings from environment. Every value has a demo-safe default."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DB_PATH", str(ROOT / "var" / "rainready.db"))
PHOTO_DIR = os.getenv("PHOTO_DIR", str(ROOT / "var" / "photos"))
STORAGE = os.getenv("STORAGE", "local")                 # local | s3
S3_BUCKET = os.getenv("S3_BUCKET", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
TRIAGE_MODE = os.getenv("TRIAGE_MODE", "manual")        # manual | bedrock
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "")    # read from your account; do not guess
TASK_DUE_DAYS = int(os.getenv("TASK_DUE_DAYS", "7"))
LINK_RADIUS_M = float(os.getenv("LINK_RADIUS_M", "150"))
CORS_ORIGINS = [o for o in os.getenv("CORS_ORIGINS", "*").split(",") if o]   # APK webview needs this
VERSION = "0.3.0"
CAPTURE_SECRET = os.getenv("CAPTURE_SECRET", "")        # signs capture tokens; set a long random value on the server
CAPTURE_MAX_AGE_S = int(os.getenv("CAPTURE_MAX_AGE_S", "900"))
REQUIRE_LIVE_CAPTURE = os.getenv("REQUIRE_LIVE_CAPTURE", "0") == "1"   # 1: a report photo without a valid capture token is held
REPORTS_PER_DAY = int(os.getenv("REPORTS_PER_DAY", "20"))            # per user, rolling 24 h; stops report floods

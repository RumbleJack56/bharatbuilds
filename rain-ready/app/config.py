"""Settings from environment. Owner: P1. Everything has a demo-safe default."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DB_PATH", str(ROOT / "var" / "rainready.db"))
PHOTO_DIR = os.getenv("PHOTO_DIR", str(ROOT / "var" / "photos"))
OPS_KEY = os.getenv("OPS_KEY", "demo")                  # change on the server
STORAGE = os.getenv("STORAGE", "local")                 # local | s3
S3_BUCKET = os.getenv("S3_BUCKET", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
TRIAGE_MODE = os.getenv("TRIAGE_MODE", "manual")        # manual | bedrock
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "")    # read it from your account; do not guess
VERSION = "0.1.0"

"""Photo storage. local disk by default; S3 when STORAGE=s3 (private bucket, pre-signed URLs)."""
import hashlib
import uuid
from pathlib import Path

from . import config

ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_BYTES = 8 * 1024 * 1024


def s3_client():
    """Regional endpoint, SigV4, virtual addressing. The global host answers a new bucket with a redirect
    and the signature then fails (403 on every photo), so never rely on the default endpoint."""
    import boto3
    from botocore.config import Config
    return boto3.client("s3", region_name=config.AWS_REGION,
                        endpoint_url=f"https://s3.{config.AWS_REGION}.amazonaws.com",
                        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}))


def validate_photo(data: bytes, content_type: str) -> str:
    """-> file extension. Raises ValueError for a type or size we do not accept. Stores nothing."""
    ext = ALLOWED.get(content_type)
    if ext is None:
        raise ValueError("photo must be jpeg, png or webp")
    if len(data) > MAX_BYTES:
        raise ValueError("photo too large (max 8 MB)")
    return ext


def save_photo(data: bytes, content_type: str) -> str:
    ext = validate_photo(data, content_type)
    key = f"{uuid.uuid4().hex}.{ext}"
    if config.STORAGE == "s3":
        s3_client().put_object(Bucket=config.S3_BUCKET, Key=key, Body=data, ContentType=content_type)
    else:
        Path(config.PHOTO_DIR).mkdir(parents=True, exist_ok=True)
        (Path(config.PHOTO_DIR) / key).write_bytes(data)
    return key


def photo_url(key: str | None) -> str | None:
    """Same-origin path. The /media route redirects to a pre-signed S3 URL when STORAGE=s3."""
    return f"/media/{key}" if key else None


def presigned(key: str) -> str:
    return s3_client().generate_presigned_url(
        "get_object", Params={"Bucket": config.S3_BUCKET, "Key": key}, ExpiresIn=300)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

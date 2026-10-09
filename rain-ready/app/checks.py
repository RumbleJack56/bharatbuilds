"""Config sanity checks. Shown in /api/health so a wrong .env is visible without reading logs."""
from . import config


def config_warnings() -> list[str]:
    w = []
    if config.STORAGE not in ("local", "s3"):
        w.append(f"STORAGE={config.STORAGE!r} is not local or s3")
    if config.STORAGE == "s3" and not config.S3_BUCKET:
        w.append("STORAGE=s3 but S3_BUCKET is empty")
    if config.TRIAGE_MODE not in ("manual", "bedrock"):
        w.append(f"TRIAGE_MODE={config.TRIAGE_MODE!r} is not manual or bedrock")
    if config.TRIAGE_MODE == "bedrock" and not config.BEDROCK_MODEL_ID:
        w.append("TRIAGE_MODE=bedrock but BEDROCK_MODEL_ID is empty (triage stays off)")
    return w


def aws_probe() -> dict:
    """Live check of the AWS side. Use after setting .env: GET /api/health?deep=1."""
    out = {}
    if config.STORAGE == "s3" and config.S3_BUCKET:
        try:
            import boto3
            s3 = boto3.client("s3", region_name=config.AWS_REGION)
            s3.put_object(Bucket=config.S3_BUCKET, Key="healthcheck.txt", Body=b"ok", ContentType="text/plain")
            out["s3"] = "ok"
        except Exception as e:  # noqa: BLE001
            out["s3"] = f"error: {e!r}"[:300]
    if config.TRIAGE_MODE == "bedrock" and config.BEDROCK_MODEL_ID:
        try:
            import boto3
            r = boto3.client("bedrock-runtime", region_name=config.AWS_REGION).converse(
                modelId=config.BEDROCK_MODEL_ID, messages=[{"role": "user", "content": [{"text": "Reply with: ok"}]}],
                inferenceConfig={"maxTokens": 5, "temperature": 0})
            out["bedrock"] = "ok" if r.get("output") else "empty reply"
        except Exception as e:  # noqa: BLE001
            out["bedrock"] = f"error: {e!r}"[:300]
    return out

"""Photo + note -> {kind, summary}. Bedrock when TRIAGE_MODE=bedrock; otherwise None (resident picks a category).
Output only pre-fills a category. It never changes ranking, owners or status (SCOPE.md rule 6). Fails soft."""
import json
import logging

from app import config

log = logging.getLogger("rainready.triage")
KINDS = ("blocked_drain", "standing_water", "overflow", "other")
PROMPT = ('You look at a street photo reported by a resident. Reply with JSON only: '
          '{"kind": one of ["blocked_drain","standing_water","overflow","other"], "summary": one short factual sentence}. '
          'Describe only what is visible. Do not give safety advice.')


def triage_photo(data: bytes, content_type: str, note: str = "") -> dict | None:
    if config.TRIAGE_MODE != "bedrock" or not config.BEDROCK_MODEL_ID:
        return None
    try:
        import boto3
        fmt = {"image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp"}[content_type]
        client = boto3.client("bedrock-runtime", region_name=config.AWS_REGION)
        resp = client.converse(modelId=config.BEDROCK_MODEL_ID, messages=[{"role": "user", "content": [
            {"image": {"format": fmt, "source": {"bytes": data}}},
            {"text": f"{PROMPT}\nResident note: {note[:300]}"}]}], inferenceConfig={"maxTokens": 200, "temperature": 0})
        text = resp["output"]["message"]["content"][0]["text"]
        out = json.loads(text[text.index("{"): text.rindex("}") + 1])
        if out.get("kind") not in KINDS:
            return None
        return {"kind": out["kind"], "summary": str(out.get("summary", ""))[:200], "model": config.BEDROCK_MODEL_ID}
    except Exception as e:  # noqa: BLE001  (fail soft: demo must not depend on Bedrock)
        log.warning("triage failed: %r", e)
        return None

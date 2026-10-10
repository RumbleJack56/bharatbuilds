"""Transcribe the text overlay of a photo with Bedrock. Reads text only; judges nothing. Fails soft (returns None)."""
import logging

from app import config
from core import imageprep

from . import client

log = logging.getLogger("rainready.stampread")
PROMPT = ("Transcribe, exactly as printed, the text overlay burned into this photo (address, Lat, Long, date and time, Ref code). "
          "Output only that text. If the photo has no such overlay, output exactly: NONE")


def read_stamp(data: bytes, content_type: str) -> str | None:
    """-> overlay text, '' when the photo has no overlay, None when not run or failed."""
    if config.TRIAGE_MODE != "bedrock" or not config.BEDROCK_MODEL_ID:
        return None
    try:
        data, content_type = imageprep.for_model(data, content_type)
        fmt = {"image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp"}[content_type]
        resp = client.runtime().converse(
            modelId=config.BEDROCK_MODEL_ID, messages=[{"role": "user", "content": [
                {"image": {"format": fmt, "source": {"bytes": data}}}, {"text": PROMPT}]}],
            inferenceConfig={"maxTokens": 300, "temperature": 0})
        text = next(b["text"] for b in resp["output"]["message"]["content"] if b.get("text")).strip()
        return "" if text.upper() == "NONE" else text
    except Exception as e:  # noqa: BLE001
        log.warning("stamp read failed: %r", e)
        return None

"""A copy of a photo sized for a vision model. The stored original is never changed.
Bedrock rejects images above about 3.75 MB, and Claude reads best at 1568 px on the long side."""
import io

from PIL import Image, ImageOps

MODEL_MAX_SIDE = 1568
MODEL_MAX_BYTES = 3_500_000       # under the 3.75 MB limit, with room for the request wrapper


def for_model(data: bytes, content_type: str) -> tuple[bytes, str]:
    """-> (bytes, content_type) the model accepts. Small photos pass through untouched. ValueError if unreadable."""
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as e:  # noqa: BLE001
        raise ValueError("photo cannot be read as an image") from e
    if len(data) <= MODEL_MAX_BYTES and max(img.size) <= MODEL_MAX_SIDE:
        return data, content_type
    img = ImageOps.exif_transpose(img).convert("RGB")
    side = MODEL_MAX_SIDE
    while side >= 256:
        work = img.copy()
        work.thumbnail((side, side), Image.LANCZOS)
        for quality in (85, 70, 55):
            buf = io.BytesIO()
            work.save(buf, "JPEG", quality=quality)
            if buf.tell() <= MODEL_MAX_BYTES:
                return buf.getvalue(), "image/jpeg"
        side = int(side * 0.7)
    raise ValueError("photo cannot be reduced enough for the model")

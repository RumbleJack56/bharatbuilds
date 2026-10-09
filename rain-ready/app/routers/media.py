from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, RedirectResponse

from .. import config, storage

router = APIRouter()


@router.get("/media/{key}")
def media(key: str):
    if "/" in key or ".." in key:
        raise HTTPException(400, "bad key")
    if config.STORAGE == "s3":
        return RedirectResponse(storage.presigned(key))
    p = Path(config.PHOTO_DIR) / key
    if not p.is_file():
        raise HTTPException(404, "not found")
    return FileResponse(p)

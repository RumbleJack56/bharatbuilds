"""GET /api/capture-token: the app calls this just before it opens the camera."""
import time

from fastapi import APIRouter, Depends

from .. import capture
from ..auth import need

router = APIRouter(prefix="/api")


@router.get("/capture-token")
def capture_token(user=Depends(need("resident", "admin"))):
    return {**capture.issue(user["id"]), "server_time": int(time.time())}

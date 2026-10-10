"""Demo auth: the client sends X-User-Id (a persona from /api/users). Not real authentication; labelled in the UI.
When PERSONA_KEYS is set, officials and admins must also send their key in X-Persona-Key (residents stay open)."""
import hmac

from fastapi import Depends, Header, HTTPException

from . import config
from .db import get_db

PRIVILEGED = ("official", "admin")


def check_persona_key(row, key: str | None) -> None:
    """Raise 401 when keys are configured and a privileged persona sends a missing or wrong one. No key set for it: closed."""
    if not config.PERSONA_KEYS or row["role"] not in PRIVILEGED:
        return
    want = config.PERSONA_KEYS.get(row["id"])
    if not want or not key or not hmac.compare_digest(want.encode(), key.encode()):
        raise HTTPException(401, "this persona needs its key: send X-Persona-Key")


def current_user(x_user_id: str | None = Header(default=None), x_persona_key: str | None = Header(default=None),
                 db=Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE id=?", (x_user_id or "",)).fetchone() if x_user_id else None
    if not row:
        raise HTTPException(401, "send X-User-Id with a persona id from /api/users")
    check_persona_key(row, x_persona_key)
    return row


def need(*roles: str):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"role {user['role']} cannot do this")
        return user
    return dep

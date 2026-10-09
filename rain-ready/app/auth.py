"""Demo auth: the client sends X-User-Id (a persona from /api/users). Not real authentication; labelled in the UI."""
from fastapi import Depends, Header, HTTPException

from .db import get_db


def current_user(x_user_id: str | None = Header(default=None), db=Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE id=?", (x_user_id or "",)).fetchone() if x_user_id else None
    if not row:
        raise HTTPException(401, "send X-User-Id with a persona id from /api/users")
    return row


def need(*roles: str):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"role {user['role']} cannot do this")
        return user
    return dep

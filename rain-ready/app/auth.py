"""Tiny auth helpers. Owner: P1. No accounts: a device UUID and a shared ops key."""
from fastapi import Header, HTTPException

from . import config


def user_id(x_user_id: str | None = Header(default=None)) -> str:
    return (x_user_id or "anon")[:64]


def require_ops(x_ops_key: str | None = Header(default=None)) -> None:
    if x_ops_key != config.OPS_KEY:
        raise HTTPException(status_code=401, detail="ops key required")

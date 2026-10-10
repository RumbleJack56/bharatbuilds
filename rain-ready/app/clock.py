"""One place for 'now'. Production reads the system clock; the demo and tests can move it (see scripts/demo_history.py)."""
from datetime import date, datetime, timedelta, timezone

_offset = timedelta(0)


def now() -> datetime:
    return datetime.now(timezone.utc) + _offset


def today() -> date:
    return now().date()


def advance(delta: timedelta) -> None:
    global _offset
    _offset += delta


def travel_to(moment: datetime) -> None:
    """Make now() read `moment` from here on (it keeps ticking)."""
    global _offset
    _offset = moment - datetime.now(timezone.utc)


def reset() -> None:
    global _offset
    _offset = timedelta(0)

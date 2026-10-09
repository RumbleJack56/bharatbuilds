"""Same person, same spot, same day: a repeat report adds no new information, so it is held, not counted."""
from datetime import datetime, timedelta

from . import geo

DUPLICATE_M = 50
DUPLICATE_WINDOW = timedelta(hours=24)


def is_duplicate(lat: float, lon: float, now: datetime, recent: list[tuple[float, float, datetime]]) -> bool:
    """`recent` holds (lat, lon, created_at) of this user's earlier reports. Both limits are inclusive."""
    return any(now - t <= DUPLICATE_WINDOW and geo.haversine_m(lat, lon, la, lo) <= DUPLICATE_M for la, lo, t in recent)

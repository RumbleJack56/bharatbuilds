"""Pure geo helpers. No dependencies. Owner: dev#3."""
import math

EARTH_R_M = 6_371_000.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R_M * math.asin(math.sqrt(a))


def nearest(lat: float, lon: float, points: list[dict], max_m: float | None = None):
    """points: dicts with 'lat' and 'lon'. Returns (point, distance_m) or (None, None)."""
    best, best_d = None, None
    for p in points:
        d = haversine_m(lat, lon, p["lat"], p["lon"])
        if best_d is None or d < best_d:
            best, best_d = p, d
    if best is None or (max_m is not None and best_d > max_m):
        return None, None
    return best, best_d


# NCR geofence used to reject obviously out-of-area submissions (rough box, hackathon-grade).
NCR_BOX = (27.7, 76.7, 29.2, 78.0)  # lat_min, lon_min, lat_max, lon_max


def in_ncr(lat: float, lon: float) -> bool:
    return NCR_BOX[0] <= lat <= NCR_BOX[2] and NCR_BOX[1] <= lon <= NCR_BOX[3]

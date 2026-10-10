"""Signal aggregation maths. Pure functions, no I/O. Used by scripts/consolidate.py.

Position:  several independent anchors (each a named OSM feature the source text points at) -> weighted
           geometric median + an uncertainty radius + a grade. Disagreement widens the radius; it is never hidden.
Evidence:  recurrence, persistence, day-independence and exposure -> an index that orders where to look first.
           It is an ordering of evidence. It is not a probability of flooding.
"""
import math
import random

from core import geo
from core.stats import median, percentile_rank  # noqa: F401  (re-exported for callers of this module)

CUSEC_L_S = 28.3168466           # litres per second in one cubic foot per second
ACRE_M2 = 4046.8564
MIN_RADIUS_M = 30.0              # map and tag accuracy floor


def _xy(lat: float, lon: float, lat0: float) -> tuple[float, float]:
    return lon * 111_320 * math.cos(math.radians(lat0)), lat * 110_540


def locate(geom: list[dict], lat: float, lon: float) -> tuple[float, float]:
    """(distance m, arc length m) of the point on a polyline of {lat, lon} nearest (lat, lon)."""
    px, py = _xy(lat, lon, lat)
    best, run = (1e12, 0.0), 0.0
    for a, b in zip(geom, geom[1:]):
        ax, ay = _xy(a["lat"], a["lon"], lat)
        bx, by = _xy(b["lat"], b["lon"], lat)
        seg = math.hypot(bx - ax, by - ay)
        f = 0.0 if seg == 0 else max(0.0, min(1.0, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / seg**2))
        d = math.hypot(px - (ax + f * (bx - ax)), py - (ay + f * (by - ay)))
        if d < best[0]:
            best = (d, run + f * seg)
        run += seg
    return best


def point_at(geom: list[dict], s: float) -> tuple[float, float]:
    """(lat, lon) at arc length s along a polyline of {lat, lon}."""
    run = 0.0
    for a, b in zip(geom, geom[1:]):
        d = geo.haversine_m(a["lat"], a["lon"], b["lat"], b["lon"])
        if d and run + d >= s:
            f = (s - run) / d
            return a["lat"] + f * (b["lat"] - a["lat"]), a["lon"] + f * (b["lon"] - a["lon"])
        run += d
    return geom[-1]["lat"], geom[-1]["lon"]


def section(geom: list[dict], s: float, half: float) -> list[list[float]]:
    """[lon, lat] vertices of the stretch from arc length s-half to s+half, clipped to the way."""
    pts = [[p["lon"], p["lat"]] for p in geom]
    legs = [geo.haversine_m(a[1], a[0], b[1], b[0]) for a, b in zip(pts, pts[1:])]
    lo, hi, run, out = max(0.0, s - half), s + half, 0.0, []

    def at(t: float, i: int) -> list[float]:
        f = 0.0 if legs[i] == 0 else (t - run) / legs[i]
        return [pts[i][0] + f * (pts[i + 1][0] - pts[i][0]), pts[i][1] + f * (pts[i + 1][1] - pts[i][1])]

    for i, d in enumerate(legs):
        if run + d >= lo and run <= hi and d > 0:
            a, b = at(max(lo, run), i), at(min(hi, run + d), i)
            if not out or out[-1] != a:
                out.append(a)
            out.append(b)
        run += d
    return out


def geometric_median(points: list[tuple[float, float]], weights: list[float], iters: int = 60) -> tuple[float, float]:
    """Weighted geometric median of (lat, lon) points (Weiszfeld). One far outlier moves it far less than a mean."""
    lat0 = sum(p[0] for p in points) / len(points)
    xy = [_xy(p[0], p[1], lat0) for p in points]
    cx = sum(w * x for w, (x, _) in zip(weights, xy)) / sum(weights)
    cy = sum(w * y for w, (_, y) in zip(weights, xy)) / sum(weights)
    for _ in range(iters):
        num_x = num_y = den = 0.0
        for w, (x, y) in zip(weights, xy):
            d = max(math.hypot(x - cx, y - cy), 1e-6)
            num_x, num_y, den = num_x + w * x / d, num_y + w * y / d, den + w / d
        cx, cy = num_x / den, num_y / den
    return cy / 110_540, cx / (111_320 * math.cos(math.radians(lat0)))


def estimate_position(anchors: list[dict]) -> dict:
    """anchors: {lat, lon, group, weight}. A group's weight is split among its members (nine tagged ways of one
    junction count as one witness, not nine). Returns lat, lon, radius_m, grade, groups, spread_m."""
    size: dict[str, int] = {}
    for a in anchors:
        size[a["group"]] = size.get(a["group"], 0) + 1
    w = [a["weight"] / size[a["group"]] for a in anchors]
    pts = [(a["lat"], a["lon"]) for a in anchors]
    lat, lon = geometric_median(pts, w)
    d = [geo.haversine_m(lat, lon, p[0], p[1]) for p in pts]
    rms = math.sqrt(sum(wi * di * di for wi, di in zip(w, d)) / sum(w))
    radius = max(MIN_RADIUS_M, rms)
    groups = len(size)
    grade = "A" if groups >= 2 and radius <= 75 else "B" if groups >= 2 and radius <= 200 else "C"
    return {"lat": round(lat, 6), "lon": round(lon, 6), "radius_m": round(radius), "grade": grade, "groups": groups,
            "spread_m": round(max(d))}


def design_mm_h(cusec_per_acre: float) -> float:
    """A design unit discharge in cusecs per acre as mm/h over the catchment (1 L/m2 = 1 mm)."""
    return cusec_per_acre * CUSEC_L_S / ACRE_M2 * 3600.0


def day_counts(rows: list[dict]) -> dict[str, int]:
    """Locations listed per date across every row of every list: how widespread waterlogging was that day."""
    out: dict[str, set] = {}
    for r in rows:
        for d in filter(None, r["dates"].split(";")):
            out.setdefault(d, set()).add((r["list"], r["row_no"]))
    return {d: len(s) for d, s in out.items()}


WEIGHTS = {"recurrence": 0.35, "persistence": 0.25, "ordinary_days": 0.15, "exposure": 0.25}


def index(components: dict[str, float], weights: dict[str, float] = WEIGHTS) -> float:
    return round(100 * sum(weights[k] * components[k] for k in weights) / sum(weights.values()), 1)


def rank_stability(cards: dict[str, dict[str, float]], draws: int = 1000, seed: int = 7) -> dict[str, dict]:
    """Re-rank under random weights (each weight scaled by 0.4 to 1.6). Returns, per id, the base rank, the
    best and worst rank seen, and the share of draws in which it stayed in the top two."""
    ids = list(cards)
    rng = random.Random(seed)

    def ranks(w):
        order = sorted(ids, key=lambda i: (-index(cards[i], w), i))
        return {i: n + 1 for n, i in enumerate(order)}

    base = ranks(WEIGHTS)
    seen = {i: [] for i in ids}
    for _ in range(draws):
        w = {k: v * rng.uniform(0.4, 1.6) for k, v in WEIGHTS.items()}
        for i, r in ranks(w).items():
            seen[i].append(r)
    return {i: {"rank": base[i], "best": min(seen[i]), "worst": max(seen[i]),
                "top2_share": round(sum(1 for r in seen[i] if r <= 2) / draws, 2)} for i in ids}

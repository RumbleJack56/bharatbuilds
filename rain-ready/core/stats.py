"""Small statistics helpers. Pure, no dependencies."""


def median(xs: list[float]) -> float:
    s = sorted(xs)
    n = len(s)
    return 0.0 if n == 0 else s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def percentile_rank(value: float, population: list[float]) -> float:
    """Mid-rank percentile (0 to 1): values below plus half the ties. A value shared by most of the population
    sits near the middle, not at the top."""
    if not population:
        return 0.0
    below = sum(1 for v in population if v < value)
    ties = sum(1 for v in population if v == value)
    return (below + 0.5 * ties) / len(population)


def share_top(values: list[float], k: int) -> float:
    """Share of the total held by the k largest values (0 to 1)."""
    total = sum(values)
    return sum(sorted(values, reverse=True)[:k]) / total if total else 0.0


def gini(values: list[float]) -> float:
    """Gini coefficient (0 equal, 1 one holder). Used to say how concentrated a count is."""
    v = sorted(x for x in values if x >= 0)
    n, s = len(v), sum(v)
    if n == 0 or s == 0:
        return 0.0
    return sum((2 * i - n + 1) * x for i, x in enumerate(v)) / (n * s)

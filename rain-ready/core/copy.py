"""The few fixed UI strings. Pre-written; no LLM writes them. See SCOPE.md section 8."""
import re

SCENARIO_BANNER = ("Scenario, not a forecast. Pocket size, catchment and drain capacity are illustrative "
                   "parameters. Unofficial. Official warnings: IMD / NDMA Sachet.")
DEMO_LOGIN = "Demo login: pick a persona. No real accounts. People in the demo are team members."
RANGE_NOTE = "Fill times are shown as a range: pocket size, catchment and drain capacity are each uncertain by about 25%."
NO_OWNER = "No owner found"
FIELD_RULE = "Do not open manholes, enter drains, or go near drains during or after rain. Photograph from the footpath."

BANNED = re.compile(r"\bsafe\b|guarantee|desilted|removed|cm deep", re.I)


def banned_hits(text: str) -> list[str]:
    return [m.group(0) for m in BANNED.finditer(text)]

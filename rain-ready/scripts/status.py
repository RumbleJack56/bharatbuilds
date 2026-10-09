#!/usr/bin/env python3
"""Contract status board. Owner: P1.  Usage: python scripts/status.py [base_url] [--strict]

Calls every read endpoint in openapi.yaml against a running server and validates the JSON against the
contract's schemas. PASS = matches contract. TODO = not implemented yet (404/405). FAIL = wrong shape or 5xx.
Everybody runs this before merging. Exit code 1 on any FAIL (and on TODO with --strict)."""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

import jsonschema
import yaml

ROOT = Path(__file__).resolve().parent.parent
base = next((a for a in sys.argv[1:] if a.startswith("http")), "http://localhost:8010")
strict = "--strict" in sys.argv

spec = yaml.safe_load((ROOT / "openapi.yaml").read_text())


def fix_nullable(o):
    if isinstance(o, dict):
        if o.get("nullable") and "type" in o:
            o["type"] = [o["type"], "null"]
        for v in o.values():
            fix_nullable(v)
    elif isinstance(o, list):
        for v in o:
            fix_nullable(v)


fix_nullable(spec)

# (owner, method, path, schema ref or 'array:Ref' or status int, headers)
CHECKS = [
    ("P1", "GET", "/api/health", "Health"),
    ("P1", "GET", "/api/state", "State"),
    ("P4", "GET", "/api/map", "MapData"),
    ("P1", "GET", "/api/board", "Board"),
    ("P1", "GET", "/api/ledger/head", "LedgerHead"),
    ("P1", "POST", "/api/ops/storm", 401),          # no ops key -> must be rejected
    ("P2", "GET", "/api/reports", "array:ReportPublic"),
    ("P2", "GET", "/api/jobs", "array:Job"),
    ("P4", "GET", "/api/buildings/demo0001", "BuildingOut"),
    ("P4", "GET", "/api/public/b/demo0001", "Placard"),
    ("P4", "GET", "/api/public/b/doesnotexist", 404),
]


def call(method, path):
    req = urllib.request.Request(base + path, method=method, data=b"{}" if method == "POST" else None,
                                 headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # noqa: BLE001
        return 0, str(e).encode()


def validate(ref, data):
    schema = {"$ref": f"#/components/schemas/{ref}", "components": spec["components"]}
    jsonschema.validate(data, schema)


counts = {"PASS": 0, "TODO": 0, "FAIL": 0}
for owner, method, path, expect, *_ in CHECKS:
    status, body = call(method, path)
    verdict, why = "FAIL", ""
    if isinstance(expect, int):
        verdict = "PASS" if status == expect else ("TODO" if status in (404, 405) and expect != 404 else "FAIL")
        why = f"http {status}, want {expect}"
    elif status in (404, 405):
        verdict, why = "TODO", f"http {status} (not implemented yet)"
    elif status != 200:
        why = f"http {status}: {body[:120]!r}"
    else:
        try:
            data = json.loads(body)
            if expect.startswith("array:"):
                assert isinstance(data, list), "not a list"
                for item in data[:5]:
                    validate(expect[6:], item)
            else:
                validate(expect, data)
            verdict = "PASS"
        except Exception as e:  # noqa: BLE001
            why = str(e).splitlines()[0][:140]
    counts[verdict] += 1
    icon = {"PASS": "\033[32mPASS\033[0m", "TODO": "\033[33mTODO\033[0m", "FAIL": "\033[31mFAIL\033[0m"}[verdict]
    print(f"{icon}  {owner}  {method:4} {path:32} {why}")

print(f"\n{counts['PASS']} pass, {counts['TODO']} todo, {counts['FAIL']} fail  ({base})")
sys.exit(1 if counts["FAIL"] or (strict and counts["TODO"]) else 0)

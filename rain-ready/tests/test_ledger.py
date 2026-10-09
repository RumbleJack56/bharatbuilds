"""Hash chain. Owner: dev#1."""
from core import ledger_hash


# ---- ledger ----
def _chain(n=3):
    out, prev = [], ledger_hash.GENESIS
    for i in range(n):
        rec = {"kind": "x", "i": i}
        h = ledger_hash.entry_hash(prev, rec, None)
        out.append(dict(prev_hash=prev, hash=h, record=rec, photo_sha256=None))
        prev = h
    return out


def test_ledger_verifies_and_detects_tamper():
    c = _chain()
    assert ledger_hash.verify_chain(c) == (True, None)
    c[1]["record"]["i"] = 99
    assert ledger_hash.verify_chain(c) == (False, 1)



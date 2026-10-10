"""Flood Control Order 2025 waterlogging tables (Delhi Traffic Police lists 2022, 2023, 2024) -> data/raw/fco_rows.csv.

Needs `pdftotext` (poppler) and the PDF: ifc.delhi.gov.in/sites/default/files/ifc/universal/fco_2025.pdf
Run from rain-ready/:  python -m scripts.parse_fco path/to/fco_2025.pdf
One output row per numbered table row: list, row_no, text columns, every date in the row, PDF page.
Dates are the reliable part (fixed pattern). Road and place text is flattened from a multi-line table: read it, do not parse it.
"""
import csv
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "fco_rows.csv"
DATE = re.compile(r"\b(\d{2})\.(\d{2})\.(20\d{2})\b")
ROW = re.compile(r"^\s{0,12}(\d{1,3})\.\s+(\S.*)$", re.M)
HEADERS = (("2022", re.compile(r"OBSERVED IN THE YEAR 2022", re.I)),
           ("2023", re.compile(r"OBSERVED IN THE YEAR 2023", re.I)),
           ("2024", re.compile(r"Water Logging Incidents Observed during 2024", re.I)))
LAST_LIST_PAGES = 6        # the 2024 list is document pages 74-79; contact lists with numbered rows follow
END = re.compile(r"Annexure|ANNEXURE|^\s*Sh\.|Telephone|\d{6,}|@[a-z.]*nic\.in", re.I)   # also drops page-footer phone and e-mail lines


def pages_of(pdf: str) -> list[str]:
    txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    return txt.split("\f")


def iso(d: tuple[str, str, str]) -> str | None:
    try:
        return datetime(int(d[2]), int(d[1]), int(d[0])).date().isoformat()
    except ValueError:
        return None


def parse(pages: list[str]) -> list[dict]:
    """Rows from the three lists. A list starts at its header page and runs until the next header."""
    start = {}
    for i, p in enumerate(pages):
        for name, rx in HEADERS:
            if name not in start and rx.search(p) and ROW.search(p):    # skip the index page (no numbered rows)
                start[name] = i
    order = sorted(start.items(), key=lambda kv: kv[1])
    rows = []
    for k, (name, i0) in enumerate(order):
        i1 = order[k + 1][1] if k + 1 < len(order) else min(i0 + LAST_LIST_PAGES, len(pages))
        cur = None
        for pi in range(i0, i1):
            for ln in pages[pi].splitlines():
                m = ROW.match(ln)
                if m and not DATE.match(m.group(2).strip()[:10]):
                    cur = {"list": name, "row_no": int(m.group(1)), "page": pi + 1, "lines": [m.group(2)]}
                    rows.append(cur)
                elif cur is not None and ln.strip() and not END.search(ln) and "Page " not in ln and "Department of Revenue" not in ln:
                    cur["lines"].append(ln.strip())
    out = []
    for r in rows:
        text = " ".join(r["lines"])
        dates = sorted({d for d in (iso(m) for m in DATE.findall(text)) if d})
        cols = [c.strip() for c in re.split(r"\s{2,}", r["lines"][0]) if c.strip()]
        out.append({"list": r["list"], "row_no": r["row_no"], "pdf_page": r["page"], "col1": cols[0] if cols else "",
                    "col2": cols[1] if len(cols) > 1 else "", "dates": ";".join(dates),
                    "text": DATE.sub("", text).strip()[:240]})
    return out


def main(argv=None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print(__doc__, file=sys.stderr)
        return 2
    rows = parse(pages_of(argv[0]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as fh:
        w = csv.DictWriter(fh, ["list", "row_no", "pdf_page", "col1", "col2", "dates", "text"], lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    by = {}
    for r in rows:
        by.setdefault(r["list"], []).append(r)
    for name, rs in sorted(by.items()):
        n = sum(1 for r in rs if r["dates"])
        print(f"{name}: {len(rs)} rows, {n} with dates, {sum(len(r['dates'].split(';')) for r in rs if r['dates'])} location-dates",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

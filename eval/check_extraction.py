"""Evaluate the LLM's rate extraction against a hand-checked golden set.

This is the "does the model see what a human sees?" pass. It matches on (rate, kind)
so a differently-worded service name still counts — we are grading whether the right
number was found from the right kind of source, which is what the costing depends on.

    python eval/check_extraction.py

Exit code is non-zero if anything in the golden set is missing, so it can gate CI.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent


def main() -> int:
    llm_path = REPO / "extraction" / "out" / "rates.llm.json"
    if not llm_path.exists():
        print(f"[eval] no extraction at {llm_path}. Run extraction first.", file=sys.stderr)
        return 2

    extracted = json.loads(llm_path.read_text(encoding="utf-8"))
    golden = json.loads((ROOT / "golden-rates.json").read_text(encoding="utf-8"))["expected"]

    # Index the extraction by (rate, kind) for a name-agnostic lookup.
    found = {(round(float(r["rate"]), 2), r.get("kind")) for r in extracted if "rate" in r}

    hits, misses = [], []
    for item in golden:
        key = (round(float(item["rate"]), 2), item["kind"])
        (hits if key in found else misses).append(item)

    print(f"\nExtraction eval - {len(hits)}/{len(golden)} golden rates found\n")
    for item in hits:
        print(f"  [ok]      {item['label']}  ({item['rate']}, {item['kind']})")
    for item in misses:
        print(f"  [MISSING] {item['label']}  ({item['rate']}, {item['kind']})")

    score = len(hits) / len(golden)
    print(f"\nScore: {score:.0%}  ({len(extracted)} rates extracted in total)\n")
    return 0 if not misses else 1


if __name__ == "__main__":
    raise SystemExit(main())

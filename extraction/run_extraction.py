"""Run the extraction pipeline: ingest the documents, drive Claude to extract the
rate catalogue and the booked services, and write the artefacts.

    python run_extraction.py            # live (warms the cache), then offline
    python run_extraction.py --cached   # fail rather than call the model

Output lands in extraction/out/. These are the LLM's *proposals*; the analyst-curated
extraction that feeds the engine is engine/tests/fixtures/extraction.halloran.json,
and eval/ measures the gap between the two.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from aterra_extraction.claude_llm import ClaudeCLI, ClaudeCLINotAvailable
from aterra_extraction.graph import build_graph

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent


def main() -> int:
    cache_only = "--cached" in sys.argv
    data_dir = REPO / "data"
    cache_dir = data_dir / "llm-cache"
    out_dir = ROOT / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    llm = ClaudeCLI(cache_dir=cache_dir, cache_only=cache_only)
    graph = build_graph(llm)

    try:
        result = graph.invoke({"data_dir": data_dir})
    except ClaudeCLINotAvailable as exc:
        print(f"[extraction] Claude CLI unavailable: {exc}", file=sys.stderr)
        print("[extraction] Re-run online once to warm data/llm-cache/.", file=sys.stderr)
        return 2

    rates = result.get("rates", [])
    services = result.get("services", [])
    (out_dir / "rates.llm.json").write_text(
        json.dumps(rates, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "services.llm.json").write_text(
        json.dumps(services, indent=2) + "\n", encoding="utf-8"
    )

    print(f"[extraction] rates extracted:    {len(rates)}")
    print(f"[extraction] services extracted: {len(services)}")
    print(f"[extraction] wrote {out_dir / 'rates.llm.json'}")
    print(f"[extraction] wrote {out_dir / 'services.llm.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

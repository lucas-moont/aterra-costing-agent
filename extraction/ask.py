"""Ask where a number came from.

Two modes, both grounded in the costed quotation's provenance — never a fresh guess:

    python ask.py explain svc-04         # deterministic: print the provenance chain
    python ask.py "where did the family suite price come from?"   # LLM, grounded

`explain` reads the answer straight out of quotation.json. `ask` hands that same JSON to
the local Claude and asks it to answer ONLY from the data, citing the document and
locator — the model reports provenance, it does not author numbers. This is the seed of
the in-product "why is this number here?" affordance (and the inbox deep-link via `ref`).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from aterra_extraction.claude_llm import ClaudeCLI, ClaudeCLINotAvailable

# The locators carry § and — ; make sure a Windows console prints them, not mojibake.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent


def load_quotation() -> dict:
    for candidate in (REPO / "engine" / "out" / "quotation.json", REPO / "sample" / "quotation.json"):
        if candidate.exists():
            return json.loads(candidate.read_text(encoding="utf-8"))
    raise SystemExit("No quotation.json found. Run the engine first (npm run cost).")


def explain(quotation: dict, service_id: str) -> int:
    line = next((l for l in quotation["lines"] if l["id"] == service_id), None)
    if line is None:
        print(f"No line {service_id}. Ids run svc-01 … svc-{len(quotation['lines']):02d}.")
        return 1

    money = lambda v: "—" if v is None else f"${v:,.2f}"
    print(f"\n{line['id']} — {line['description']}")
    print(f"  unit rate   {money(line['unit_rate'])}  ({line['basis']})")
    print(f"  line total  {money(line['line_total'])}")
    print(f"  confidence  {line['confidence']['tier']} — {line['confidence']['reason']}")
    prov = line.get("provenance")
    if prov:
        print(f"\n  source: {prov['document']}")
        print(f"          {prov['locator']}")
        print(f"          reads: {prov['raw_value']}")
        if prov.get("ref"):
            print(f"          ref: {prov['ref']}  (inbox deep-link target)")
    else:
        print("\n  source: none — this line has no rate to trace.")
    print("")
    return 0


ASK_PROMPT = """You are answering a question about a costed travel quotation. Use ONLY the
JSON below. Every number and every source is in it. Answer in English, in 2-4 sentences,
and when you state a figure, cite its provenance document and locator from the JSON. Never
invent a number or a source; if the answer is not in the JSON, say so.

QUESTION: {question}

QUOTATION JSON:
{quotation}
"""


def ask(quotation: dict, question: str) -> int:
    # Pin the answer to plain English regardless of the local Claude's configured
    # output style — in production this is just the service's system prompt.
    llm = ClaudeCLI(
        cache_dir=REPO / "data" / "llm-cache",
        extra_args=(
            "--append-system-prompt",
            "Respond in clear, plain English. Ignore any configured output style, "
            "persona, or language preference; answer technically and directly.",
        ),
    )
    prompt = ASK_PROMPT.format(question=question, quotation=json.dumps(quotation, indent=2))
    try:
        print("\n" + llm.invoke(prompt).strip() + "\n")
    except ClaudeCLINotAvailable as exc:
        print(f"[ask] Claude CLI unavailable: {exc}", file=sys.stderr)
        return 2
    return 0


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    quotation = load_quotation()
    if args[0] == "explain" and len(args) == 2:
        return explain(quotation, args[1])
    return ask(quotation, " ".join(args))


if __name__ == "__main__":
    raise SystemExit(main())

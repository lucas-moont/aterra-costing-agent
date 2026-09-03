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
import re
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
        sup = prov.get("supersedes")
        if sup:
            print(f"\n  supersedes: {sup['raw_value']} from {sup['document']}")
            print(f"              {sup['locator']}")
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


_MONEY = re.compile(r"\$\s?([\d,]+(?:\.\d+)?)")
_DOC = re.compile(r"[\w.\-]+\.(?:pdf|txt)")
_NUM_IN_TEXT = re.compile(r"\d+(?:\.\d+)?")


def _grounds(quotation: dict) -> tuple[set[float], set[str]]:
    """Collect every money value and document name that legitimately appears in the
    quotation, walking provenance and its superseded source."""
    money: set[float] = set()
    docs: set[str] = set()

    def add_money(v) -> None:
        try:
            money.add(round(float(v), 2))  # accepts numbers and numeric strings ("340.00")
        except (TypeError, ValueError):
            pass

    for key in ("confirmed_subtotal", "assumption_subtotal", "resolved_subtotal", "stale_indicative"):
        add_money(quotation["totals"].get(key))

    def walk_prov(prov: dict | None) -> None:
        if not prov:
            return
        docs.add(prov["document"])
        for m in _NUM_IN_TEXT.findall(prov.get("raw_value", "")):
            add_money(m)
        walk_prov(prov.get("supersedes"))

    for line in quotation["lines"]:
        add_money(line.get("unit_rate"))
        add_money(line.get("line_total"))
        walk_prov(line.get("provenance"))
    return money, docs


def verify_answer(answer: str, quotation: dict) -> tuple[list[str], list[str]]:
    """Return the money figures and document names the answer cites that do NOT appear
    in the quotation. Empty lists mean every claim traces back to the data."""
    money, docs = _grounds(quotation)
    bad_money = [
        m for m in _MONEY.findall(answer) if round(float(m.replace(",", "")), 2) not in money
    ]
    bad_docs = [d for d in _DOC.findall(answer) if d not in docs]
    return bad_money, bad_docs


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
        answer = llm.invoke(prompt).strip()
    except ClaudeCLINotAvailable as exc:
        print(f"[ask] Claude CLI unavailable: {exc}", file=sys.stderr)
        return 2

    print("\n" + answer + "\n")

    # Deterministic grounding check: every $ figure and document the model cited must
    # exist in the quotation. This is the guard that keeps a natural-language answer
    # honest — a fabricated number or source is caught here, not trusted.
    bad_money, bad_docs = verify_answer(answer, quotation)
    if not bad_money and not bad_docs:
        print("  ✓ verified — every figure and source above appears in the quotation.\n")
        return 0
    print("  ⚠ UNVERIFIED — these do not appear in the quotation, treat with care:")
    for m in bad_money:
        print(f"      figure ${m}")
    for d in bad_docs:
        print(f"      source {d}")
    print("")
    return 1


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

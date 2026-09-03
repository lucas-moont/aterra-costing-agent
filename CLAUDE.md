# CLAUDE.md — how to work in this repo

Aterra costing agent: reads an operational quotation + rate pack + supplier email and
produces a costed quotation where every figure carries provenance, a confidence tier, and
a `needs_review` reason. The graded question is **"does the system know what it doesn't
know?"** — so honesty about uncertainty matters more than a tidy number.

## The one rule that shapes everything

**The LLM proposes structure; the deterministic engine owns every number.** The Python
layer reads prose and locates rates; it never multiplies, sums, or picks a rate. All
arithmetic and rule-application live in the TypeScript engine. If you are tempted to have
the model compute or decide a figure, don't — that is the whole thesis (ADR 0001).

## Layout

- `extraction/` — Python. LangGraph pipeline + the local Claude CLI as the model
  (`claude_llm.py`). Emits proposals. `ask.py` = the `explain`/`ask` provenance query.
- `engine/` — TypeScript. Deterministic costing: `priceService.ts`, `costQuotation.ts`.
  The trust anchor. Its tests are the golden set (vs a hand oracle).
- `eval/` — grades the LLM extraction against a golden rate set.
- `data/` — the three inputs + the committed LLM cache (safety net).
- `docs/` — `NOTE.md`, `SUPPLEMENT.md`, `architecture.md`, and ADRs.
- `sample/` — committed example output (`quotation.json`, `report.txt`).

`CONTEXT.md` is the glossary (basis, the four confidence tiers, provenance). Read it before
touching the model, so names match.

## Run

```
./run.ps1                                   # extract (live LLM) -> eval -> cost
cd engine && npm test                       # 20 engine tests
python extraction/ask.py explain svc-04     # trace a figure to its source
```

Extraction calls the model **live** every run (~2-3 min) on purpose (ADR 0005); `--cached`
forces offline. The `/quote` skill drives the whole flow conversationally.

## Conventions

- **Commit granularly** — many small, layered commits, not one atomic dump.
- Comments explain the *why* inline; only reference an ADR/ticket if it's in the repo.
- Confidence is named tiers (`confirmed`/`assumption`/`stale`/`unresolved`), never a score.
- An unpriced line is `null`, never `0`. Totals stay honest (resolved subtotal; stale and
  unresolved kept apart).
- Keep `/oracle` out of git (the private answer key).

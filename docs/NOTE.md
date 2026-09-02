# Note

**What I built.** A two-layer costing agent. A Python layer (LangGraph) ingests the
PDFs and the email and drives the **local Claude CLI** to extract a rate catalogue and
the booked services — the LLM reads prose and *proposes structure*. A TypeScript engine
then does all the costing: multiplication by basis, supersession, season bands, validity,
confidence and totals. The two meet at one `extraction.json`. Run it with `./run.ps1`.

**Where I deliberately keep the LLM out of the loop.** It never authors a number. It
locates rates and proposes matches; every figure is computed by the deterministic engine
from rates the model merely found. This is the whole design: a tidy, confident, wrong
number is the failure that costs a DMC a booking, so all arithmetic and all rule-
application are reproducible and testable, and the boundary is visible in a file.

**Confidence and honest totals.** Each figure carries a named tier — `confirmed`,
`assumption`, `stale`, `unresolved` — with a reason, not a fake 0–100 score. The engine
reports a **resolved subtotal** (\$27,015) and lists stale and unresolved items apart; it
never sums a grand total that hides a guess. An unpriced line is `null`, never `0`. This
quote raises **13 needs_review items**: 3 live airfares, 2 stale helicopter tariffs, a
villa with no rate, a season boundary, two levy mismatches, a sub-6-pax trailer, and a
Cape Town rate used in Johannesburg.

**Knowing it's right.** A hand-worked oracle drives 19 engine tests (the golden set costs
the whole quote and asserts every subtotal). An eval grades the LLM extraction against a
golden rate set — **23/23**, matched on value + source kind.

**Stack.** Python for ingestion/orchestration (mature tooling); TypeScript for the engine,
so the piece most likely to reach production already sits in Aterra's language. In a real
build that split is a team call weighing cost, speed and familiarity; the JSON seam keeps
either side replaceable.

**AI usage & time.** Built with Claude Code driving the implementation, inside the two-hour
budget. The model's extraction was strong — it even caught a carried-forward speedboat
tariff I hadn't listed. My override was structural: all judgement (supersession, season,
flags) stays in deterministic code, never trusted to the model.

**With more time.** Wire the LLM `match` node end-to-end into `extraction.json`, add the
`ask`/`explain` provenance query, turn on LangSmith tracing. See `architecture.md` for the
data model and the pgvector retrieval that replaces flat matching at scale.

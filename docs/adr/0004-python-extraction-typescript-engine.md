# Python for extraction, TypeScript for the costing engine

The document-ingestion and LLM-orchestration layer is Python (LangGraph); the
deterministic costing engine is TypeScript/Node. The two communicate only through
`extraction.json`.

Python carries the mature ingestion and agent tooling this layer leans on. The
costing engine, by contrast, is pure typed arithmetic that belongs next to Aterra's
existing stack, which is TypeScript end to end — so the piece most likely to be
lifted into production is already in the production language. The trade-off is a
two-runtime repo, which is more setup than a single language would need; in a real
build this is a team decision weighing cost, speed, familiarity and actual need, and
the JSON seam keeps either side replaceable. What matters is the boundary, not the
two languages that happen to sit on each side of it.

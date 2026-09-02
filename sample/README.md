# Sample output

Committed so a reviewer can read the result without running anything.

- **`quotation.json`** — the costed quotation from the engine. Every commercial figure
  carries provenance + a confidence tier; totals are honest (resolved subtotal, stale
  apart, unresolved counted). This is the deliverable output file.
- **`rates.llm.json`** — what the LLM extracted from the rate pack + email (35 rates).
- **`services.llm.json`** — what the LLM extracted from the operational quotation (31 lines).

Regenerate everything with `./run.ps1` (or `./run.sh`).

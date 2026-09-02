# Aterra — Costing Agent (Lead AI exercise)

Reads an operational quotation (what was booked, no prices) plus a contracted rate
pack and one supplier email, and produces a **costed quotation** where every
commercial figure carries its **source**, a **confidence** signal, and — where a
number cannot be trusted yet — a **`needs_review`** reason.

The guiding question: **does this system know what it does not know?**

## Two layers

| Layer | Language | Job |
| --- | --- | --- |
| `extraction/` | Python (LangGraph + local LLM) | Read the messy documents, propose service ↔ rate matches. **Never does arithmetic.** |
| `engine/` | TypeScript / Node | Deterministic costing: all maths, supersession, validity, confidence, `needs_review`, totals. |

The seam between them is a single `extraction.json`. The LLM proposes; the engine
disposes. No number is ever authored by the model.

## Run

```
./run.sh          # or ./run.ps1 on Windows
```

Runs extraction (Python) → costing engine (Node) → prints the honest totals and the
`needs_review` count.

## Layout

- `extraction/` — Python agent (document ingestion + matching)
- `engine/` — deterministic costing engine + tests
- `data/` — the three input documents + cached LLM fixtures
- `docs/` — the note, the supplement, architecture, and ADRs
- `tests/` — golden-set validation

See `docs/NOTE.md` for the write-up and `docs/SUPPLEMENT.md` for the actions section.

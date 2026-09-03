# Aterra — Costing Agent (Lead AI exercise)

[![CI](https://github.com/lucas-moont/aterra-costing-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/lucas-moont/aterra-costing-agent/actions/workflows/ci.yml)

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
./run.ps1         # Windows — or ./run.sh on POSIX
```

Extraction (Python/LLM) → extraction eval → costing engine (Node). Prints the honest
totals and the `needs_review` list. Extraction calls the local Claude **live every run**
(~2–3 min) — the AI genuinely works each session. A committed cache is a safety net for
a locked-down machine; `run_extraction.py --cached` forces the offline path. See ADR 0005.

Already-generated output lives in [`sample/`](./sample) — read it without running.

## Setup

```
# engine
cd engine && npm install && npm test         # 19 tests

# extraction
cd extraction && python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
python run_extraction.py                       # live (warms cache); --cached for offline
python ../eval/check_extraction.py             # grades extraction vs golden set → 23/23
```

## Layout

- `extraction/` — Python agent: ingestion + LangGraph + local-Claude LLM
- `engine/` — deterministic costing engine + tests (the trust anchor)
- `eval/` — grades the LLM extraction against a hand-checked golden rate set
- `data/` — the three input documents + the committed LLM cache
- `docs/` — the note, the supplement, architecture, and ADRs
- `sample/` — committed example output (`quotation.json` + LLM extractions)

Start with `docs/NOTE.md`; `CONTEXT.md` is the glossary; `docs/adr/` holds the decisions.

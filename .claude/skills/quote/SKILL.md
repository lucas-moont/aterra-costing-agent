---
name: quote
description: Cost the Halloran quotation end to end and walk the result. Use when the user
  says /quote, or asks to "cost the quote", "run the costing", "price the itinerary", or
  wants the totals and what needs review explained in plain language.
---

# /quote — cost the quotation and explain it

An AI-native way to drive this repo: one call runs the pipeline, then turns the output into
a plain-language walk-through and answers follow-ups from provenance. Numbers still come only
from the deterministic engine — you are reporting them, never authoring them.

## Steps

1. **Run the pipeline.** From the repo root, run `./run.ps1` on Windows or `./run.sh` on
   POSIX. It calls the live LLM extraction (~2-3 min), grades it (`eval`, expect 23/23), and
   runs the deterministic engine. If the local Claude CLI is unavailable, the run falls back
   to the committed cache and says so — that is fine.

2. **Read the result.** Load `engine/out/quotation.json` (or `sample/quotation.json` if the
   run did not produce one). Use its `totals` and `needs_review`.

3. **Summarise in plain language.** Report:
   - the **resolved subtotal** (confirmed + assumption) as "what we can stand behind",
   - the **stale** and **unresolved** amounts kept apart, with why they are not in the subtotal,
   - the **needs_review** items grouped by what to do about them (double-check an assumption /
     reconfirm a stale tariff / a supplier must fill it in), using each line's description,
     not its id.

   Lead with the honest total. Never present one confident grand total.

4. **Offer to trace any figure.** Invite the user to ask where a number came from. When they
   do, answer from provenance:
   - deterministic: `python extraction/ask.py explain <svc-id>` (shows the source and what it
     superseded), or
   - natural language: `python extraction/ask.py "<their question>"` — which prints the
     grounded answer plus a `✓ verified` / `UNVERIFIED` check. Relay that verdict honestly.

## Guardrails

- Do not compute or adjust any figure yourself — read it from the engine's output.
- If the eval is not 23/23 or a test is red, say so plainly before summarising.
- Keep the summary tight; the point is clarity, not a wall of numbers.

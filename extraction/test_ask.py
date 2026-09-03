"""Deterministic tests for ask/explain.

The natural-language `ask` path can't be asserted exactly (it calls the model), but the
two things that make it trustworthy CAN be: `explain` reads provenance straight from the
JSON, and `verify_answer` is the grounding guard. We test both against the committed
sample quotation.

    python -m unittest test_ask -v
"""

from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path

import ask

SAMPLE = json.loads(
    (Path(__file__).resolve().parent.parent / "sample" / "quotation.json").read_text("utf-8")
)


class ExplainTests(unittest.TestCase):
    def test_shows_the_supersession_story(self) -> None:
        out = io.StringIO()
        with redirect_stdout(out):
            ask.explain(SAMPLE, "svc-04")
        text = out.getvalue()
        self.assertIn("375", text)
        self.assertIn("Supplier-email-Camissa-2027-rates.txt", text)
        self.assertIn("supersedes", text)
        self.assertIn("340.00", text)

    def test_unpriced_line_has_nothing_to_trace(self) -> None:
        out = io.StringIO()
        with redirect_stdout(out):
            ask.explain(SAMPLE, "svc-27")  # Beach Villa Grande, no rate
        self.assertIn("no rate to trace", out.getvalue())


class GroundingGuardTests(unittest.TestCase):
    def test_passes_a_grounded_answer(self) -> None:
        answer = (
            "The Family Suite is $375.00 from Supplier-email-Camissa-2027-rates.txt, "
            "which supersedes $340.00 in Supplier-Rate-Pack-SA-2027-v3.pdf; total $1,500.00."
        )
        bad_money, bad_docs = ask.verify_answer(answer, SAMPLE)
        self.assertEqual(bad_money, [])
        self.assertEqual(bad_docs, [])

    def test_catches_a_fabricated_figure_and_source(self) -> None:
        answer = "It is $999.00 per night, per madeup-rates.pdf."
        bad_money, bad_docs = ask.verify_answer(answer, SAMPLE)
        self.assertIn("999.00", bad_money)
        self.assertIn("madeup-rates.pdf", bad_docs)


if __name__ == "__main__":
    unittest.main()

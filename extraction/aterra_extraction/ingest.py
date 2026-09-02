"""Document ingestion — turn the source files into plain text the graph can read.

This is deliberately dumb and deterministic: no model touches a document until its
text is on the table. PDFs go through pdfplumber; the email is already text.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pdfplumber


@dataclass(frozen=True)
class SourceDoc:
    name: str
    kind: str  # "operational_quotation" | "rate_pack" | "correspondence"
    text: str


def _pdf_text(path: Path) -> str:
    pages: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return "\n".join(pages)


def load_sources(data_dir: Path) -> list[SourceDoc]:
    """Load the three inputs from ``data/`` by their known filenames."""
    quotation = data_dir / "MRA-2027-0641-Halloran-operational-quotation.pdf"
    rate_pack = data_dir / "Supplier-Rate-Pack-SA-2027-v3.pdf"
    email = data_dir / "Supplier-email-Camissa-2027-rates.txt"

    return [
        SourceDoc(quotation.name, "operational_quotation", _pdf_text(quotation)),
        SourceDoc(rate_pack.name, "rate_pack", _pdf_text(rate_pack)),
        SourceDoc(email.name, "correspondence", email.read_text(encoding="utf-8")),
    ]

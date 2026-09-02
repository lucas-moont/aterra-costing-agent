"""Aterra extraction layer.

Reads the operational quotation, the rate pack and supplier correspondence and
proposes structured services with located rate candidates, provenance and a match
confidence. It never does arithmetic — the deterministic TypeScript engine owns
every number. The two layers meet at a single ``extraction.json``.
"""

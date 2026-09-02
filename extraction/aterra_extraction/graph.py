"""The LangGraph extraction pipeline.

    ingest → extract_rates → extract_services → emit

The two extract nodes are the only place the LLM runs: it reads prose and proposes
structure. ``emit`` is deterministic. Nothing here multiplies or totals — that is the
engine's job. The boundary is a file: this graph's output is candidate structure, the
engine turns it into money.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .claude_llm import ClaudeCLI
from .ingest import SourceDoc, load_sources
from .jsonio import parse_json
from .prompts import RATES_PROMPT, SERVICES_PROMPT


class State(TypedDict, total=False):
    data_dir: Path
    sources: list[SourceDoc]
    rates: list[dict[str, Any]]
    services: list[dict[str, Any]]


def _by_kind(sources: list[SourceDoc], kind: str) -> SourceDoc:
    return next(s for s in sources if s.kind == kind)


def build_graph(llm: ClaudeCLI):
    def ingest(state: State) -> State:
        return {"sources": load_sources(state["data_dir"])}

    def extract_rates(state: State) -> State:
        pack = _by_kind(state["sources"], "rate_pack")
        email = _by_kind(state["sources"], "correspondence")
        prompt = RATES_PROMPT.format(
            rate_pack_name=pack.name,
            rate_pack_text=pack.text,
            email_name=email.name,
            email_text=email.text,
        )
        return {"rates": parse_json(llm.invoke(prompt))}

    def extract_services(state: State) -> State:
        quote = _by_kind(state["sources"], "operational_quotation")
        prompt = SERVICES_PROMPT.format(
            quotation_name=quote.name, quotation_text=quote.text
        )
        return {"services": parse_json(llm.invoke(prompt))}

    graph = StateGraph(State)
    graph.add_node("ingest", ingest)
    graph.add_node("extract_rates", extract_rates)
    graph.add_node("extract_services", extract_services)
    graph.add_edge(START, "ingest")
    graph.add_edge("ingest", "extract_rates")
    graph.add_edge("extract_rates", "extract_services")
    graph.add_edge("extract_services", END)
    return graph.compile()

"""Tolerant JSON extraction from an LLM reply.

The prompts ask for bare JSON, but models still occasionally wrap it in prose or code
fences. This pulls out the first JSON array/object and parses it, so a stray sentence
does not sink the run.
"""

from __future__ import annotations

import json
import re
from typing import Any

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def parse_json(text: str) -> Any:
    text = text.strip()
    fenced = _FENCE.search(text)
    if fenced:
        text = fenced.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fall back to the first balanced array/object.
    start = min((i for i in (text.find("["), text.find("{")) if i != -1), default=-1)
    if start == -1:
        raise ValueError(f"no JSON found in reply: {text[:200]!r}")
    end = max(text.rfind("]"), text.rfind("}"))
    return json.loads(text[start : end + 1])

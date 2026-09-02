"""A LangChain LLM backed by the local Claude Code CLI.

We drive the ``claude`` binary as a subprocess instead of a hosted API: no key, no
spend, and it is the same model the team already runs locally. Every response is
cached by prompt hash, so a run is reproducible and works offline once the cache is
warm — which is also what makes the pipeline safe to ship as a fixture.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from pathlib import Path
from typing import Any, Optional

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.llms import LLM


class ClaudeCLINotAvailable(RuntimeError):
    pass


class ClaudeCLI(LLM):
    """Calls ``claude -p <prompt>`` and returns stdout, with a file cache."""

    cache_dir: Path
    timeout_s: int = 180
    cache_only: bool = False
    binary: str = "claude"

    @property
    def _llm_type(self) -> str:
        return "claude-cli"

    def _cache_path(self, prompt: str) -> Path:
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]
        return self.cache_dir / f"{digest}.txt"

    def _call(
        self,
        prompt: str,
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        cached = self._cache_path(prompt)
        if cached.exists():
            return cached.read_text(encoding="utf-8")

        if self.cache_only:
            raise ClaudeCLINotAvailable(
                f"cache_only is set but no cached response for this prompt "
                f"(expected {cached.name}). Run once online to warm the cache."
            )

        exe = shutil.which(self.binary) or self.binary
        try:
            result = subprocess.run(
                [exe, "-p", prompt],
                capture_output=True,
                text=True,
                timeout=self.timeout_s,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            raise ClaudeCLINotAvailable(str(exc)) from exc

        if result.returncode != 0:
            raise ClaudeCLINotAvailable(
                f"claude exited {result.returncode}: {result.stderr.strip()[:300]}"
            )

        out = result.stdout.strip()
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        cached.write_text(out, encoding="utf-8")
        return out

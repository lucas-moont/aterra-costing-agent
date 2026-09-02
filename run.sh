#!/usr/bin/env bash
# One command: extract (Python/LLM) -> grade the extraction -> cost (TS engine).
# Numbers only ever come from the engine; the LLM only proposes structure.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$root/extraction/.venv/Scripts/python.exe" ]; then
  py="$root/extraction/.venv/Scripts/python.exe"   # Windows venv layout
else
  py="$root/extraction/.venv/bin/python"           # POSIX venv layout
fi

echo -e "\n=== 1/3  Extraction (LangGraph + local Claude) ==="
"$py" "$root/extraction/run_extraction.py" --cached

echo -e "\n=== 2/3  Extraction eval (vs golden rate set) ==="
"$py" "$root/eval/check_extraction.py"

echo -e "\n=== 3/3  Costing engine (deterministic) ==="
(cd "$root/engine" && npx tsx src/cli.ts)

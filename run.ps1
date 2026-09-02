# One command: extract (Python/LLM) -> grade the extraction -> cost (TS engine).
# Numbers only ever come from the engine; the LLM only proposes structure.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "`n=== 1/3  Extraction (LangGraph + local Claude, live) ===" -ForegroundColor Cyan
& "$root/extraction/.venv/Scripts/python.exe" "$root/extraction/run_extraction.py"

Write-Host "`n=== 2/3  Extraction eval (vs golden rate set) ===" -ForegroundColor Cyan
& "$root/extraction/.venv/Scripts/python.exe" "$root/eval/check_extraction.py"

Write-Host "`n=== 3/3  Costing engine (deterministic) ===" -ForegroundColor Cyan
Push-Location "$root/engine"
& npx tsx src/cli.ts
Pop-Location

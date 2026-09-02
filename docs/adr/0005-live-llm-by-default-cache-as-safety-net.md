# Live LLM calls by default; the cache is a safety net, not the default path

The extraction pipeline calls the local Claude CLI **live on every run**. It still
writes a prompt-hash cache, but that cache is only used when the model is unavailable
(a locked-down machine) or when `--cached` is passed explicitly (CI / offline).

The obvious engineering default is the opposite — read the cache, only call the model
on a miss — and for cost and latency that is the right production choice. We chose live
anyway for this deliverable: the point of the exercise is to show an AI genuinely doing
the extraction, and a reviewer running it should watch the model work, not replay a
recording. The cost is real (a couple of model calls, ~2–3 minutes per run) and the
output can vary run to run; the `eval/` golden set guards against that variance by
grading on (rate, kind) rather than exact wording. In production this flips: cache-first
with invalidation on document change, and live calls reserved for new or changed inputs.

# The LLM proposes, the deterministic engine disposes

The LLM reads the messy documents and *proposes* structure — parsed services and
candidate service↔rate matches, each with its own match confidence. It never
performs arithmetic, never picks a season band, never decides that one source
supersedes another. Every number in the output is computed by the deterministic
TypeScript engine from rates the LLM merely located.

We chose this because the product's whole value is that it knows what it does not
know. An LLM that multiplies rates and sums totals can produce a confident, tidy,
wrong number — the one failure mode that costs a DMC real money when it reaches a
client. Keeping all maths and all rule-application deterministic makes every figure
reproducible and auditable, and confines the LLM to the one job it is actually good
at: reading ambiguous prose. The seam is a single `extraction.json`, so the boundary
is visible in a file, not just asserted.

# Confidence is a named tier with a reason, not a numeric score

Every commercial figure carries `{ tier, reason }` where tier is one of `confirmed`,
`assumption`, `stale`, or `unresolved`. We deliberately rejected a 0–100 numeric
confidence score.

A numeric score implies a calibration we do not have: there is no defensible basis
for "72%" on a rate read from a signed contract versus one inferred across a season
boundary. Named tiers map directly onto the distinctions the brief cares about — a
current signed rate must not be presented like an expired tariff or an assumption —
and each tier forces a human-readable reason, which is what a reviewer actually acts
on. The cost is that tiers do not sort finely; we accept that, because a false sense
of precision is exactly the failure this system exists to avoid.

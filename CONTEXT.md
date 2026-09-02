# Aterra Costing

Turning an operational quotation (what was booked) plus contracted rates (what it
costs) into a costed quotation a DMC can trust. This glossary fixes the vocabulary
shared by the extraction layer, the costing engine, and the docs.

## Documents

**Operational quotation**:
The internal document listing exactly what was booked — services, dates, room types,
quantities, units. Carries no prices.
_Avoid_: itinerary, booking sheet.

**Rate pack**:
The compiled set of contracted supplier prices. The default price source.
_Avoid_: rate sheet, tariff (a tariff is one supplier's entry inside a pack).

**Supplier correspondence**:
A dated message from a supplier (e.g. an email) that can *supersede* a rate pack
entry. Written correspondence takes precedence over the pack.
_Avoid_: update, note.

## The costing

**Service**:
One booked thing on the operational quotation — a night's accommodation, a transfer,
an activity, a levy. The unit that gets costed into a line.
_Avoid_: item, product.

**Basis**:
What a rate is charged against: `per_room_per_night`, `per_person`, `per_group`,
`per_vehicle`, `per_person_per_movement`, `per_person_per_night`. It is a label, not
a number; it tells the engine which quantities to multiply.
_Avoid_: unit (overloaded), rate type.

**Nett rate**:
The price the operator pays the supplier, before commission or markup. Every figure
in the rate pack is nett.
_Avoid_: cost, base price.

**Line total**:
`rate × (the quantities the basis calls for)`. Computed only by the engine.
_Avoid_: subtotal, amount.

**Levy**:
A compulsory per-person charge from a reserve or park (conservation levy, park fee),
charged on top of the accommodation rate and usually not commissionable.
_Avoid_: fee, tax, surcharge.

**Season band**:
A date range within which a supplier charges one rate (green / shoulder / peak).
A night is priced by the band its date falls in.
_Avoid_: season, period.

**Validity**:
The date range a contracted rate is good for. A rate used outside its validity is
`stale` and must be reconfirmed.
_Avoid_: expiry.

## Trust signals

**Provenance**:
The traceable origin of one commercial figure: which document, where in it, the raw
value as written, and any figure it supersedes. Lets a reviewer point at the source.
_Avoid_: source (too vague on its own), citation.

**Confidence**:
A named tier on a figure: `confirmed` (read from a current signed rate), `assumption`
(a rule or assumption was applied), `stale` (from an expired or carried-forward rate),
`unresolved` (no usable rate found). Never a numeric score.
_Avoid_: certainty, score.

**needs_review**:
An item a human must resolve before the quotation can be sent, with the reason. The
honest counterpart to a confident wrong number.
_Avoid_: flag, warning, error.

**Resolved subtotal**:
The sum of only the lines that are `confirmed` or a safe `assumption`. Unresolved and
stale lines are listed apart, never folded into a single grand total.
_Avoid_: total, grand total.

# Honest totals: a resolved subtotal, never a false grand total

The engine reports a **resolved subtotal** (only `confirmed` and safe `assumption`
lines) and lists `stale` and `unresolved` lines separately, with their reasons. It
never emits a single grand total that silently folds in a guessed or missing number.

Some services in this exercise genuinely cannot be priced yet — live airfares, a
carried-forward 2025 helicopter tariff, a villa name with no matching rate. Summing
them into one confident total would manufacture precisely the number that gets sent
to a client and eaten as a loss. Presenting a resolved subtotal plus an explicit
"provisional — N items need review" is the honest shape: it tells the reader exactly
how much of the quotation is real. An unpriced line is `null`, never `0`, so it is
never mistaken for "free".

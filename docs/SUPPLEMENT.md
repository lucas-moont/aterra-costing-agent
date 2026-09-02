# Supplement — from needs_review to actions

Two real items my system produced (`quotation.json` › `needs_review`), and what the
agent should do about them.

## Action 1 — svc-27, Ilha Azul Beach Lodge, "Beach Villa Grande", `unit_rate`

**Tier:** unresolved. The quote books a "Beach Villa Grande"; the pack has Beach /
Infinity / Presidential villas but no "Grande". Pack §9: re-quote when a service has no rate.

- **Contact:** Ilha Azul reservations.
- **Ask:** the confirmed 2027 nett rate for "Beach Villa Grande", per villa per night, FI,
  14–17 Jul; and whether "Grande" is a distinct villa or Infinity/Presidential renamed.
- **Reply into the system:** the agent parses the emailed rate as a `correspondence`
  candidate with provenance (message id, quoted line) — the Camissa path. A human confirms
  the villa mapping before it is trusted.
- **Records updated:** a new rate row (supplier Ilha Azul, villa Beach Villa Grande,
  validity 2027, kind `correspondence`); svc-27 gains the candidate.
- **Recalculates:** svc-27 flips unresolved → confirmed; the resolved subtotal rises by
  3 nights × rate; needs_review drops. Nothing else moves — one line, contained.

## Action 2 — svc-25 & svc-28, Helicopter VNX–Benguerra, `unit_rate`

**Tier:** stale. The only rate is a 2025 tariff carried forward; the pack says reconfirm.

- **Contact:** the Mozambique air-transfer operator for the VNX–Benguerra route.
- **Ask:** the confirmed 2027 per-person-per-way helicopter tariff, and its validity.
- **Reply into the system:** same path — a 2027 rate row supersedes the carried-forward
  one; both svc-25 and svc-28 point at it.
- **Recalculates:** both flip stale → confirmed; their 2 × \$1,975 leaves the "stale,
  indicative" bucket and enters the resolved subtotal. One rate change fans out to two
  lines — the reason rates are shared records, not per-line values.

## What could go wrong (first risks I'd reach for)

- **Silent supplier ambiguity:** "Grande" turns out to *be* the Infinity Villa; the agent
  must surface the mapping for human sign-off, not auto-merge.
- **Rate without validity:** a reply with a number but no date range — hold it as
  `assumption`, not `confirmed`.
- **Stale reply:** the operator quotes 2026 again; the agent must detect the year and keep
  it stale rather than accept it.
- **Wrong basis:** a per-person quote pasted onto a per-villa line silently multiplies by
  pax — validate basis on ingest.
- **Fan-out surprise:** one shared rate updates many quotes; recalculation must be scoped
  and previewed before it touches sent proposals.

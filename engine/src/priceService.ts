import type {
  Basis,
  Confidence,
  CostedLine,
  ExtractedService,
  Quantities,
  RateCandidate,
} from "./types.js";

/** Which quantities a basis multiplies. The single place the "how to cost this"
 *  rule lives — the engine, never the LLM. */
const BASIS_FACTORS: Record<Basis, (keyof Quantities)[]> = {
  per_room_per_night: ["rooms", "nights"],
  per_unit_per_night: ["units", "nights"],
  per_villa_per_night: ["villas", "nights"],
  per_person_sharing_per_night: ["pax", "nights"],
  per_person_per_night: ["pax", "nights"],
  per_person: ["pax"],
  per_person_per_movement: ["pax", "movements"],
  per_vehicle: ["vehicles"],
  per_group: ["groups"],
  complimentary: [],
};

const DAY_MS = 86_400_000;

/** Nights between two ISO dates. Deterministic date maths belongs in the engine,
 *  so a passed-in nights count is always recomputed when both dates are present. */
function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

function seasonContains(
  season: { from: string; to: string },
  date: string,
): boolean {
  const d = Date.parse(date);
  return d >= Date.parse(season.from) && d <= Date.parse(season.to);
}

interface RateSelection {
  rate: RateCandidate | null;
  /** Set when the selection itself required an assumption (e.g. a boundary night). */
  assumption?: string;
}

/** Correspondence supersedes the pack. Seasonal rates are chosen by the stay's
 *  first night; a night that falls in two bands at once is a boundary — we take the
 *  higher rate and surface the assumption rather than silently guessing. */
function selectRate(service: ExtractedService): RateSelection {
  const candidates = service.rate_candidates;
  const correspondence = candidates.find((c) => c.kind === "correspondence");
  if (correspondence) return { rate: correspondence };

  const seasonal = candidates.filter((c) => c.season);
  if (seasonal.length > 0 && service.date_in) {
    const inBand = seasonal.filter((c) => seasonContains(c.season!, service.date_in!));
    if (inBand.length === 1) return { rate: inBand[0]! };
    if (inBand.length > 1) {
      const highest = inBand.reduce((a, b) => (b.value > a.value ? b : a));
      return {
        rate: highest,
        assumption: `Stay starts ${service.date_in} on a season boundary; priced at the higher (peak) band`,
      };
    }
  }

  return { rate: candidates[0] ?? null };
}

/** Multiply the rate by exactly the quantities the basis calls for. A per_vehicle
 *  or per_group line defaults its count to 1 when the quote does not state one. */
function lineTotal(rate: number, basis: Basis, q: Quantities): number {
  let total = rate;
  for (const factor of BASIS_FACTORS[basis]) {
    total *= q[factor] ?? 1;
  }
  return total;
}

export function priceService(service: ExtractedService): CostedLine {
  const base = {
    id: service.id,
    description: service.description,
    basis: service.basis,
  };

  if (service.basis === "complimentary") {
    return {
      ...base,
      quantities: service.quantities,
      unit_rate: 0,
      line_total: 0,
      confidence: { tier: "confirmed", reason: "Complimentary — included at no charge" },
      provenance: null,
    };
  }

  const { rate, assumption } = selectRate(service);

  if (!rate) {
    const flagReason = service.flags?.map((f) => f.reason).join("; ");
    return {
      ...base,
      quantities: service.quantities,
      unit_rate: null,
      line_total: null,
      confidence: {
        tier: "unresolved",
        reason: flagReason ?? "No rate found in any source",
      },
      provenance: null,
    };
  }

  // Recompute nights from the stay dates; a passed count is only a fallback.
  const quantities: Quantities = { ...service.quantities };
  if (service.date_in && service.date_out) {
    quantities.nights = nightsBetween(service.date_in, service.date_out);
  }

  return {
    ...base,
    quantities,
    unit_rate: rate.value,
    line_total: lineTotal(rate.value, service.basis, quantities),
    confidence: classify(rate, assumption, service.flags),
    // Carry the superseded source through, so the line can tell the whole story.
    provenance: rate.supersedes
      ? { ...rate.provenance, supersedes: rate.supersedes }
      : rate.provenance,
  };
}

/** A priced line is stale if its rate is carried forward, an assumption if the
 *  selection or extraction raised any (season boundary, levy counts, trailer
 *  threshold, out-of-region rate), otherwise confirmed. */
function classify(
  rate: RateCandidate,
  selectionAssumption: string | undefined,
  flags: ExtractedService["flags"],
): Confidence {
  if (rate.kind === "carried_forward") {
    return {
      tier: "stale",
      reason: "Carried-forward tariff outside its validity — reconfirm before quoting",
    };
  }

  const reasons = [
    ...(selectionAssumption ? [selectionAssumption] : []),
    ...(flags?.map((f) => f.reason) ?? []),
  ];
  if (reasons.length > 0) {
    return { tier: "assumption", reason: reasons.join("; ") };
  }

  return { tier: "confirmed", reason: "Read from a current contracted rate" };
}

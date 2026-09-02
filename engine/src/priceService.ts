import type {
  Basis,
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

/** Multiply the rate by exactly the quantities the basis calls for. A per_vehicle
 *  or per_group line defaults its count to 1 when the quote does not state one. */
function lineTotal(rate: number, basis: Basis, q: Quantities): number {
  const factors = BASIS_FACTORS[basis];
  let total = rate;
  for (const factor of factors) {
    const value = q[factor];
    total *= value ?? 1;
  }
  return total;
}

/** Correspondence supersedes the pack; otherwise take the first located rate. */
function selectRate(candidates: RateCandidate[]): RateCandidate | null {
  const correspondence = candidates.find((c) => c.kind === "correspondence");
  if (correspondence) return correspondence;
  return candidates[0] ?? null;
}

export function priceService(service: ExtractedService): CostedLine {
  const rate = selectRate(service.rate_candidates);

  if (service.basis === "complimentary") {
    return {
      id: service.id,
      description: service.description,
      basis: service.basis,
      quantities: service.quantities,
      unit_rate: 0,
      line_total: 0,
      confidence: { tier: "confirmed", reason: "Complimentary — included at no charge" },
      provenance: rate?.provenance ?? null,
    };
  }

  if (!rate) {
    return {
      id: service.id,
      description: service.description,
      basis: service.basis,
      quantities: service.quantities,
      unit_rate: null,
      line_total: null,
      confidence: { tier: "unresolved", reason: "No usable rate found" },
      provenance: null,
    };
  }

  const total = lineTotal(rate.value, service.basis, service.quantities);

  // A carried-forward tariff is a real number from an expired source: show it, but
  // never as confirmed. It stays out of the resolved subtotal downstream.
  if (rate.kind === "carried_forward") {
    return {
      id: service.id,
      description: service.description,
      basis: service.basis,
      quantities: service.quantities,
      unit_rate: rate.value,
      line_total: total,
      confidence: {
        tier: "stale",
        reason: "Carried-forward tariff outside its validity — reconfirm before quoting",
      },
      provenance: rate.provenance,
    };
  }

  // A computable line the extraction layer could not fully resolve — the rate is
  // real, but a human assumption stands behind the figure. Elevate to assumption
  // and carry the reasons through.
  if (service.flags && service.flags.length > 0) {
    return {
      id: service.id,
      description: service.description,
      basis: service.basis,
      quantities: service.quantities,
      unit_rate: rate.value,
      line_total: total,
      confidence: {
        tier: "assumption",
        reason: service.flags.map((f) => f.reason).join("; "),
      },
      provenance: rate.provenance,
    };
  }

  return {
    id: service.id,
    description: service.description,
    basis: service.basis,
    quantities: service.quantities,
    unit_rate: rate.value,
    line_total: total,
    confidence: { tier: "confirmed", reason: "Read from a current contracted rate" },
    provenance: rate.provenance,
  };
}

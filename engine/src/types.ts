// The vocabulary of CONTEXT.md, in types. The engine's input is what the extraction
// layer produced (services + located rate candidates); its output is a costed
// quotation where every figure travels with provenance and a confidence tier.

/** What a rate is charged against. A label, not a number — it tells the engine
 *  which quantities to multiply. See CONTEXT.md › Basis. */
export type Basis =
  | "per_room_per_night"
  | "per_unit_per_night"
  | "per_villa_per_night"
  | "per_person_sharing_per_night"
  | "per_person_per_night"
  | "per_person"
  | "per_person_per_movement"
  | "per_vehicle"
  | "per_group"
  | "complimentary";

/** A traceable origin for one commercial figure. See CONTEXT.md › Provenance. */
export interface Provenance {
  document: string;
  locator: string;
  raw_value: string;
  /** A stable, resolvable reference so a future inbox can deep-link to the source. */
  ref?: string;
  /** The source this one replaced (e.g. an email rate that superseded a pack rate),
   *  so the costed line can tell the full "375 replaced 340" story, not just the winner. */
  supersedes?: Provenance;
}

/** How a located rate relates to its source. `correspondence` supersedes `pack`;
 *  `carried_forward` is an expired tariff reused, which the engine marks stale. */
export type RateKind = "pack" | "correspondence" | "carried_forward";

export interface RateCandidate {
  value: number;
  kind: RateKind;
  provenance: Provenance;
  /** The date range this rate is valid for, if the source states one. */
  validity?: { from: string; to: string };
  /** The season band this rate belongs to, if the source is seasonal. */
  season?: { from: string; to: string };
  /** The pack row this candidate supersedes (for correspondence rates). */
  supersedes?: Provenance;
}

export interface Quantities {
  rooms?: number;
  units?: number;
  villas?: number;
  nights?: number;
  pax?: number;
  vehicles?: number;
  groups?: number;
  movements?: number;
}

/** A soft observation the extraction layer could not resolve on its own — the
 *  engine elevates it to an `assumption` tier plus a needs_review reason. */
export interface ServiceFlag {
  code: string;
  reason: string;
}

/** One booked service as the extraction layer handed it over. No totals, no final
 *  confidence — those are the engine's to compute. */
export interface ExtractedService {
  id: string;
  description: string;
  location: string;
  date_in?: string;
  date_out?: string;
  basis: Basis;
  quantities: Quantities;
  /** Every rate the extraction layer located for this service. May be empty. */
  rate_candidates: RateCandidate[];
  /** Unresolved observations that make an otherwise-computable figure an assumption. */
  flags?: ServiceFlag[];
}

export interface Extraction {
  quote_ref: string;
  currency: "USD";
  pax: number;
  services: ExtractedService[];
}

// ---- Output ----

export type ConfidenceTier = "confirmed" | "assumption" | "stale" | "unresolved";

export interface Confidence {
  tier: ConfidenceTier;
  reason: string;
}

export interface CostedLine {
  id: string;
  description: string;
  basis: Basis;
  quantities: Quantities;
  /** The effective rate the engine selected, or null when none was usable. */
  unit_rate: number | null;
  /** rate × the quantities the basis calls for, or null when unpriced.
   *  Never 0 for an unpriced line — 0 means genuinely free (complimentary). */
  line_total: number | null;
  confidence: Confidence;
  provenance: Provenance | null;
}

export interface ReviewItem {
  id: string;
  reason: string;
  tier: ConfidenceTier;
}

export interface QuotationTotals {
  currency: "USD";
  confirmed_subtotal: number;
  assumption_subtotal: number;
  /** confirmed + assumption — the honest "this much is real" figure. */
  resolved_subtotal: number;
  /** Stale figures, shown for information, never folded into the subtotal. */
  stale_indicative: number;
  unresolved_count: number;
  needs_review_count: number;
}

export interface CostedQuotation {
  quote_ref: string;
  lines: CostedLine[];
  needs_review: ReviewItem[];
  totals: QuotationTotals;
}

import { describe, it, expect } from "vitest";
import { costQuotation } from "../src/costQuotation.js";
import type { Extraction, Provenance } from "../src/types.js";

const prov: Provenance = { document: "pack.pdf", locator: "§x", raw_value: "1" };

describe("costQuotation", () => {
  it("separates resolved, stale and unresolved, and lists needs_review", () => {
    const extraction: Extraction = {
      quote_ref: "TEST-1",
      currency: "USD",
      pax: 5,
      services: [
        {
          id: "a",
          description: "confirmed line",
          location: "CPT",
          basis: "per_person",
          quantities: { pax: 5 },
          rate_candidates: [{ value: 100, kind: "pack", provenance: prov }],
        },
        {
          id: "b",
          description: "stale line",
          location: "VNX",
          basis: "per_person",
          quantities: { pax: 5 },
          rate_candidates: [
            {
              value: 200,
              kind: "carried_forward",
              provenance: prov,
              validity: { from: "2025-01-01", to: "2026-12-31" },
            },
          ],
        },
        {
          id: "c",
          description: "unresolved line",
          location: "JNB",
          basis: "per_person",
          quantities: { pax: 5 },
          rate_candidates: [],
        },
      ],
    };

    const q = costQuotation(extraction);

    expect(q.totals.confirmed_subtotal).toBe(500); // 100 × 5
    expect(q.totals.resolved_subtotal).toBe(500); // no assumptions here
    expect(q.totals.stale_indicative).toBe(1000); // 200 × 5, listed apart
    expect(q.totals.unresolved_count).toBe(1);
    expect(q.totals.needs_review_count).toBe(2); // stale + unresolved
    expect(q.needs_review.map((r) => r.id).sort()).toEqual(["b", "c"]);
  });
});

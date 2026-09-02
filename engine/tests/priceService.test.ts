import { describe, it, expect } from "vitest";
import { priceService } from "../src/priceService.js";
import type { ExtractedService, Provenance } from "../src/types.js";

const packRef: Provenance = {
  document: "Supplier-Rate-Pack-SA-2027-v3.pdf",
  locator: "§2 Cape Town Touring › 'SLOW Walks & Hikes'",
  raw_value: "95.00",
};

function service(overrides: Partial<ExtractedService>): ExtractedService {
  return {
    id: "svc-x",
    description: "test service",
    location: "Cape Town",
    basis: "per_person",
    quantities: { pax: 5 },
    rate_candidates: [],
    ...overrides,
  };
}

describe("priceService", () => {
  it("costs a confirmed per-person line from a current pack rate", () => {
    // Oracle svc-06: Table Mountain hike, 95 per person × 5 pax = 475.
    const line = priceService(
      service({
        id: "svc-06",
        description: "Table Mountain hike",
        basis: "per_person",
        quantities: { pax: 5 },
        rate_candidates: [{ value: 95, kind: "pack", provenance: packRef }],
      }),
    );

    expect(line.unit_rate).toBe(95);
    expect(line.line_total).toBe(475);
    expect(line.confidence.tier).toBe("confirmed");
    expect(line.provenance?.document).toBe("Supplier-Rate-Pack-SA-2027-v3.pdf");
  });
});

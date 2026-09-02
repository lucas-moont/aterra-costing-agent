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

  it("lets supplier correspondence supersede the pack rate", () => {
    // Oracle svc-04: Camissa Family Suite. Email 375 supersedes pack 340.
    // 375 per room per night × 1 room × 4 nights = 1500.
    const emailRef: Provenance = {
      document: "Supplier-email-Camissa-2027-rates.txt",
      locator: "body › 'Family Suite (B&B) USD 375.00'",
      raw_value: "USD 375.00",
    };
    const line = priceService(
      service({
        id: "svc-04",
        description: "Family Suite B&B",
        basis: "per_room_per_night",
        quantities: { rooms: 1, nights: 4 },
        rate_candidates: [
          { value: 340, kind: "pack", provenance: packRef },
          {
            value: 375,
            kind: "correspondence",
            provenance: emailRef,
            supersedes: packRef,
          },
        ],
      }),
    );

    expect(line.unit_rate).toBe(375);
    expect(line.line_total).toBe(1500);
    expect(line.confidence.tier).toBe("confirmed");
    expect(line.provenance?.document).toBe("Supplier-email-Camissa-2027-rates.txt");
  });

  it("marks a carried-forward tariff as stale, not confirmed", () => {
    // Oracle svc-25: helicopter, 2025 tariff carried forward. 395 × 5 = 1975 indicative.
    const line = priceService(
      service({
        id: "svc-25",
        description: "Helicopter VNX→Ilha Azul",
        basis: "per_person",
        quantities: { pax: 5 },
        rate_candidates: [
          {
            value: 395,
            kind: "carried_forward",
            provenance: packRef,
            validity: { from: "2025-01-01", to: "2026-12-31" },
          },
        ],
      }),
    );

    expect(line.unit_rate).toBe(395);
    expect(line.line_total).toBe(1975);
    expect(line.confidence.tier).toBe("stale");
  });

  it("leaves a service with no located rate unresolved, not zero", () => {
    // Oracle svc-12: Zambezi Air flight. No rate in any document.
    const line = priceService(
      service({
        id: "svc-12",
        description: "Flight Zambezi Air CPT→HDS",
        basis: "per_person",
        quantities: { pax: 5 },
        rate_candidates: [],
      }),
    );

    expect(line.unit_rate).toBeNull();
    expect(line.line_total).toBeNull();
    expect(line.confidence.tier).toBe("unresolved");
  });

  it("costs a complimentary service as a real zero, confirmed", () => {
    // Oracle svc-13: free scheduled transfer for 2+ night stays.
    const line = priceService(
      service({
        id: "svc-13",
        description: "Scheduled transfer HDS→Marula",
        basis: "complimentary",
        quantities: {},
        rate_candidates: [],
      }),
    );

    expect(line.line_total).toBe(0);
    expect(line.confidence.tier).toBe("confirmed");
  });

  it("multiplies per-person-sharing by pax and nights", () => {
    // Oracle svc-19: Kudu Ridge, 890 pps × 5 pax × 3 nights = 13350.
    const line = priceService(
      service({
        id: "svc-19",
        description: "Luxury Suite FI",
        basis: "per_person_sharing_per_night",
        quantities: { pax: 5, nights: 3 },
        rate_candidates: [{ value: 890, kind: "pack", provenance: packRef }],
      }),
    );

    expect(line.line_total).toBe(13350);
    expect(line.confidence.tier).toBe("confirmed");
  });
});

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

  it("elevates a flagged-but-computable line to an assumption", () => {
    // Oracle svc-16: Marula levy 28 pp/night × 5 pax × 2 nights = 280, but the
    // quote shows "2× levy" against 5 travellers — computable, but an assumption.
    const line = priceService(
      service({
        id: "svc-16",
        description: "Marula Conservation Levy",
        basis: "per_person_per_night",
        quantities: { pax: 5, nights: 2 },
        rate_candidates: [{ value: 28, kind: "pack", provenance: packRef }],
        flags: [
          {
            code: "levy_count_mismatch",
            reason: "Quote shows 2× levy but 5 travellers; levy is compulsory per person",
          },
        ],
      }),
    );

    expect(line.line_total).toBe(280);
    expect(line.confidence.tier).toBe("assumption");
    expect(line.confidence.reason).toContain("levy is compulsory per person");
  });

  it("computes nights from the stay dates rather than trusting a passed count", () => {
    // Oracle svc-19 dates: 11–14 Jul = 3 nights. Engine derives 3, not the wrong 9.
    const line = priceService(
      service({
        id: "svc-19",
        description: "Luxury Suite FI",
        basis: "per_person_sharing_per_night",
        date_in: "2027-07-11",
        date_out: "2027-07-14",
        quantities: { pax: 5, nights: 9 },
        rate_candidates: [{ value: 890, kind: "pack", provenance: packRef }],
      }),
    );

    expect(line.line_total).toBe(13350); // 890 × 5 × 3, not × 9
  });

  it("picks the season band by date and flags a boundary night as an assumption", () => {
    // Oracle svc-14: Marula Family Chalet, 09–11 Jul = 2 nights. The 09 Jul night
    // falls in BOTH green (…–09 Jul) and peak (09 Jul–…). Engine takes peak (higher)
    // and flags the ambiguity. 890 × 1 unit × 2 nights = 1780.
    const line = priceService(
      service({
        id: "svc-14",
        description: "Family Chalet FI",
        basis: "per_unit_per_night",
        date_in: "2027-07-09",
        date_out: "2027-07-11",
        quantities: { units: 1 },
        rate_candidates: [
          {
            value: 620,
            kind: "pack",
            provenance: packRef,
            season: { from: "2027-04-01", to: "2027-07-09" },
          },
          {
            value: 890,
            kind: "pack",
            provenance: packRef,
            season: { from: "2027-07-09", to: "2027-10-31" },
          },
        ],
      }),
    );

    expect(line.unit_rate).toBe(890);
    expect(line.line_total).toBe(1780);
    expect(line.confidence.tier).toBe("assumption");
    expect(line.confidence.reason.toLowerCase()).toContain("season");
  });

  it("flags a missing essential quantity instead of silently assuming one", () => {
    // A per-person line with no pax: cost as 1, but never present that as certain.
    const line = priceService(
      service({
        id: "svc-missing",
        basis: "per_person",
        quantities: {}, // pax absent
        rate_candidates: [{ value: 95, kind: "pack", provenance: packRef }],
      }),
    );

    expect(line.line_total).toBe(95); // computed as if 1 pax
    expect(line.confidence.tier).toBe("assumption");
    expect(line.confidence.reason.toLowerCase()).toContain("missing pax");
  });

  it("does not flag per_vehicle / per_group when the count is left implicit", () => {
    // vehicles and groups legitimately default to 1 — silence is not an unknown here.
    const line = priceService(
      service({
        id: "svc-veh",
        basis: "per_vehicle",
        quantities: {}, // vehicles absent — fine, defaults to 1
        rate_candidates: [{ value: 480, kind: "pack", provenance: packRef }],
      }),
    );

    expect(line.line_total).toBe(480);
    expect(line.confidence.tier).toBe("confirmed");
  });
});

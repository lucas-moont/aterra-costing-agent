import { describe, it, expect } from "vitest";
import { costQuotation } from "../src/costQuotation.js";
import type { Extraction } from "../src/types.js";
import fixture from "./fixtures/extraction.halloran.json" with { type: "json" };

// The golden set: the full Halloran quote costed end to end. Every expected number
// is the hand-worked oracle (oracle/worked-costing.md), an independent source of
// truth — the engine must agree with the analyst, not with itself.
describe("golden set — Halloran MRA-2027-0641", () => {
  const q = costQuotation(fixture as Extraction);

  it("has one costed line per booked service", () => {
    expect(q.lines).toHaveLength(30);
  });

  it("matches the oracle confirmed subtotal", () => {
    expect(q.totals.confirmed_subtotal).toBe(22555);
  });

  it("matches the oracle assumption subtotal", () => {
    expect(q.totals.assumption_subtotal).toBe(4460);
  });

  it("matches the oracle resolved subtotal (confirmed + assumption)", () => {
    expect(q.totals.resolved_subtotal).toBe(27015);
  });

  it("keeps the stale helicopter tariffs apart, never in the subtotal", () => {
    expect(q.totals.stale_indicative).toBe(3950); // 1975 × 2
  });

  it("counts the four genuinely unresolved lines", () => {
    expect(q.totals.unresolved_count).toBe(4);
    const unresolved = q.lines
      .filter((l) => l.confidence.tier === "unresolved")
      .map((l) => l.id)
      .sort();
    expect(unresolved).toEqual(["svc-12", "svc-24", "svc-27", "svc-29"]);
  });

  it("raises a needs_review item for every non-confirmed line", () => {
    expect(q.totals.needs_review_count).toBe(13);
  });

  it("prices the Camissa Family Suite from the email, not the pack", () => {
    const suite = q.lines.find((l) => l.id === "svc-04");
    expect(suite?.unit_rate).toBe(375);
    expect(suite?.line_total).toBe(1500);
    expect(suite?.provenance?.document).toBe("Supplier-email-Camissa-2027-rates.txt");
    expect(suite?.confidence.tier).toBe("confirmed");
  });

  it("carries the superseded pack rate so the line tells the whole story", () => {
    const suite = q.lines.find((l) => l.id === "svc-04");
    expect(suite?.provenance?.supersedes?.raw_value).toBe("340.00");
    expect(suite?.provenance?.supersedes?.document).toBe(
      "Supplier-Rate-Pack-SA-2027-v3.pdf",
    );
  });

  it("never emits 0 for an unpriced line (null, not free)", () => {
    const flight = q.lines.find((l) => l.id === "svc-12");
    expect(flight?.line_total).toBeNull();
  });
});

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { costQuotation } from "./costQuotation.js";
import type { Extraction } from "./types.js";

// Reads an extraction.json (the extraction layer's output), costs it, writes the
// quotation, and prints an honest one-screen summary. Numbers only ever come from
// here — the deterministic engine — never from the model that produced the input.

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(
  process.argv[2] ?? resolve(here, "../tests/fixtures/extraction.halloran.json"),
);
const outputPath = resolve(here, "../out/quotation.json");

const extraction = JSON.parse(readFileSync(inputPath, "utf8")) as Extraction;
const quotation = costQuotation(extraction);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(quotation, null, 2) + "\n", "utf8");

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const t = quotation.totals;
const describe = new Map(quotation.lines.map((l) => [l.id, l.description]));

// A human-first summary. One reviewer is non-technical and checks this against the
// source documents by hand, so we lead with plain money and plain reasons, and group
// the review items by what the reader has to DO about them — not by internal id.
console.log(`\n  Costed quotation — ${quotation.quote_ref}`);
console.log(`  ${quotation.lines.length} services read · full detail in ${outputPath}\n`);

console.log(`  WHAT WE CAN PRICE`);
console.log(`    Read from signed rates    ${money(t.confirmed_subtotal).padStart(12)}`);
console.log(`    Priced on an assumption   ${money(t.assumption_subtotal).padStart(12)}   (fine to use, but flagged below)`);
console.log(`    ────────────────────────────────────────`);
console.log(`    Subtotal we stand behind  ${money(t.resolved_subtotal).padStart(12)}\n`);

console.log(`  NOT IN THAT SUBTOTAL — on purpose`);
console.log(`    Stale rate (reconfirm)    ${money(t.stale_indicative).padStart(12)}   ${countTier("stale")} line(s) on an old tariff`);
console.log(`    No price yet              ${"—".padStart(12)}   ${t.unresolved_count} line(s) still need a supplier\n`);

console.log(`  ⚠ ${t.needs_review_count} things to check before this goes to a client:\n`);
section("assumption", "Priced, but on an assumption — double-check");
section("stale", "Old tariff — reconfirm with the supplier");
section("unresolved", "No price found — a supplier has to fill this in");
console.log("");

function countTier(tier: string): number {
  return quotation.needs_review.filter((r) => r.tier === tier).length;
}

function section(tier: string, heading: string): void {
  const items = quotation.needs_review.filter((r) => r.tier === tier);
  if (items.length === 0) return;
  console.log(`  ${heading}  (${items.length})`);
  for (const item of items) {
    console.log(`    • ${describe.get(item.id) ?? item.id}`);
    console.log(`        ${item.reason}`);
  }
  console.log("");
}

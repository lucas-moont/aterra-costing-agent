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

console.log(`\nCosted quotation — ${quotation.quote_ref}`);
console.log(`  input : ${inputPath}`);
console.log(`  output: ${outputPath}\n`);
console.log(`  Confirmed subtotal   ${money(t.confirmed_subtotal)}`);
console.log(`  Assumption subtotal  ${money(t.assumption_subtotal)}`);
console.log(`  ─────────────────────`);
console.log(`  Resolved subtotal    ${money(t.resolved_subtotal)}`);
console.log(`  Stale (indicative)   ${money(t.stale_indicative)}  — reconfirm, not in subtotal`);
console.log(`  Unresolved lines     ${t.unresolved_count}  — no price yet`);
console.log(`\n  ⚠ Provisional: ${t.needs_review_count} item(s) need review before this is sent.\n`);

for (const item of quotation.needs_review) {
  console.log(`  · [${item.tier}] ${item.id}: ${item.reason}`);
}
console.log("");

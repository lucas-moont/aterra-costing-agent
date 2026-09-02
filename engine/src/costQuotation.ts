import { priceService } from "./priceService.js";
import type {
  CostedLine,
  CostedQuotation,
  Extraction,
  QuotationTotals,
  ReviewItem,
} from "./types.js";

function emptyTotals(): QuotationTotals {
  return {
    currency: "USD",
    confirmed_subtotal: 0,
    assumption_subtotal: 0,
    resolved_subtotal: 0,
    stale_indicative: 0,
    unresolved_count: 0,
    needs_review_count: 0,
  };
}

/** Roll costed lines into honest totals: a resolved subtotal (confirmed + assumption),
 *  stale figures kept apart, unresolved lines counted not summed. Anything that is not
 *  confirmed becomes a needs_review item. See ADR 0003. */
export function costQuotation(extraction: Extraction): CostedQuotation {
  const lines: CostedLine[] = extraction.services.map(priceService);
  const totals = emptyTotals();
  const needs_review: ReviewItem[] = [];

  for (const line of lines) {
    const { tier, reason } = line.confidence;
    const amount = line.line_total ?? 0;

    switch (tier) {
      case "confirmed":
        totals.confirmed_subtotal += amount;
        break;
      case "assumption":
        totals.assumption_subtotal += amount;
        break;
      case "stale":
        totals.stale_indicative += amount;
        break;
      case "unresolved":
        totals.unresolved_count += 1;
        break;
    }

    if (tier !== "confirmed") {
      needs_review.push({ id: line.id, reason, tier });
    }
  }

  totals.resolved_subtotal = totals.confirmed_subtotal + totals.assumption_subtotal;
  totals.needs_review_count = needs_review.length;

  return { quote_ref: extraction.quote_ref, lines, needs_review, totals };
}

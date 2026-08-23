import type { VerdictBand } from "@/lib/domain/bottle";

export type PriceLadder = {
  stealMaxCents: number;
  buyMaxCents: number;
  fairMaxCents: number;
  maybeMaxCents: number;
};

/**
 * Turns a shelf price into a verdict. Mirrors the `evaluate_verdict` SQL
 * function exactly — the two must stay in step, and the test suite pins the
 * boundary behaviour of both.
 *
 * Bands are inclusive ceilings: a price equal to a ceiling earns that band.
 */
export function evaluateVerdict(
  shelfPriceCents: number,
  ladder: PriceLadder,
): VerdictBand {
  if (shelfPriceCents <= ladder.stealMaxCents) return "steal";
  if (shelfPriceCents <= ladder.buyMaxCents) return "buy";
  if (shelfPriceCents <= ladder.fairMaxCents) return "fair";
  if (shelfPriceCents <= ladder.maybeMaxCents) return "maybe";
  return "walk_away";
}

/**
 * The headline "most we'd pay" figure shown above the fold on a bottle page:
 * the top of the Buy band, the highest price we'd comfortably recommend.
 */
export function whatWedPayCents(ladder: PriceLadder): number {
  return ladder.buyMaxCents;
}

export const VERDICT_TONE: Record<VerdictBand, "positive" | "neutral" | "caution" | "negative"> = {
  steal: "positive",
  buy: "positive",
  fair: "neutral",
  maybe: "caution",
  walk_away: "negative",
};

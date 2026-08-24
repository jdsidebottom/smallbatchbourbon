import { track as vercelTrack } from "@vercel/analytics";

/**
 * First-party business events (PRD §21.1).
 *
 * These go to Vercel Web Analytics, which is cookieless and stores no personal
 * data — so the site needs no consent banner, and a visitor is not asked to
 * clear a cookie dialog on top of the 21+ gate before reading anything.
 *
 * The provider sits behind this one function deliberately. Swapping GA4 and
 * Clarity out for Vercel touched this file and nothing else: no component knows
 * who collects the data.
 */
export type BusinessEvent =
  | "age_gate_entered"
  | "hero_cta_clicked"
  | "newsletter_signup_attempt"
  | "newsletter_signup_success"
  | "feature_interest_clicked"
  | "bottle_search"
  | "store_mode_search"
  | "store_mode_price_checked"
  | "affiliate_click"
  | "alternative_clicked"
  | "buying_guide_bottle_clicked";

/**
 * Vercel Analytics accepts only flat scalar properties, so this is narrower
 * than it looks — nested objects would be dropped silently.
 */
type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * Undefined values are removed rather than sent.
 *
 * An absent value and a value of `undefined` mean the same thing to us, but not
 * to a dashboard: sending it produces a phantom property that shows up as a
 * dimension you can filter on and never learn anything from.
 */
function clean(params: EventParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function track(event: BusinessEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  const properties = clean(params);
  vercelTrack(event, properties);

  if (process.env.NODE_ENV === "development") {
    // Vercel Analytics is inert in development, so this is the only way to see
    // an event fire locally.
    console.debug(`[analytics] ${event}`, properties);
  }
}

/**
 * First-party business events (PRD §21.1).
 *
 * Events are pushed to the GA4 dataLayer when GA is configured and mirrored to
 * the console in development. Nothing here assumes a provider is present, so
 * the site behaves correctly before analytics accounts exist.
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
  | "buying_guide_bottle_clicked"
  | "outbound_social_click";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: BusinessEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });

  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, params);
  }
}

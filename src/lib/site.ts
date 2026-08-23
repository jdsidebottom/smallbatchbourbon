export const site = {
  name: "Small Batch Bourbon",
  domain: "smallbatchbourbon.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://smallbatchbourbon.com",
  tagline: "Drink Smarter. Ignore the Noise.",
  description:
    "Straightforward bourbon recommendations, real-world value and better alternatives — without the hype. Know what a bottle is actually worth before you buy it.",
  contactEmail: "hello@smallbatchbourbon.com",
} as const;

/**
 * The What We'd Pay verdict ladder (PRD §9). Editorial value bands — not a
 * claim of real-time market pricing.
 */
export const VERDICT_LADDER = [
  { key: "steal", label: "Steal", meaning: "Exceptional price. Strongly favorable value.", color: "var(--color-verdict-steal)" },
  { key: "buy", label: "Buy", meaning: "A price we're comfortable recommending.", color: "var(--color-verdict-buy)" },
  { key: "fair", label: "Fair", meaning: "Reasonable, but not compelling.", color: "var(--color-verdict-fair)" },
  { key: "maybe", label: "Maybe", meaning: "Depends on preference and availability. Better value may exist.", color: "var(--color-verdict-maybe)" },
  { key: "walk", label: "Walk Away", meaning: "Price exceeds what we'd recommend paying.", color: "var(--color-verdict-walk)" },
] as const;

/**
 * Whether search engines may index this deployment.
 *
 * Defaults to **no**. The database still holds fictional demo bottles with
 * invented MSRPs, and the one rule this project does not bend is that we do not
 * publish invented bourbon facts — least of all into Google's index, where a
 * page outlives the row behind it.
 *
 * Set `NEXT_PUBLIC_ALLOW_INDEXING=true` in Vercel once real content is in and
 * the demo rows are cleared. It fails closed on purpose: forgetting it costs a
 * few days of crawling, while the opposite mistake is served to the public and
 * cached by someone else.
 */
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

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
 * Optional home-page hero photograph.
 *
 * `null` keeps the original CSS-only hero exactly as it was. To add a
 * photograph, drop the file in `public/` and set:
 *
 *     export const heroImage = { src: "/hero.jpg" };
 *
 * Brand assets live in the repo rather than Supabase Storage: they are part of
 * the build, and a rollback should restore the artwork that matched it.
 *
 * `position` is any Tailwind object-position class, for when the interesting
 * part of the photograph is not the middle — e.g. "object-[70%_center]" to keep
 * a bottle on the right in frame as the viewport narrows.
 */
export const heroImage: { src: string; position?: string } | null = null;

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

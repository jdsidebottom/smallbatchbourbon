import { z } from "zod";

/**
 * Typed domain model for the canonical Bottle entity, shared by the admin
 * forms, the server actions that write it, and (from Milestone 3) the public
 * bottle page. Bottle facts have one definition here rather than one per page.
 */

export const PUBLICATION_STATUSES = ["draft", "review", "published", "archived"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const MASH_BILL_STATUSES = ["disclosed", "partial", "undisclosed"] as const;
export type MashBillStatus = (typeof MASH_BILL_STATUSES)[number];

export const VERDICT_BANDS = ["steal", "buy", "fair", "maybe", "walk_away"] as const;
export type VerdictBand = (typeof VERDICT_BANDS)[number];

export const VERDICT_LABELS: Record<VerdictBand, string> = {
  steal: "Steal",
  buy: "Buy",
  fair: "Fair",
  maybe: "Maybe",
  walk_away: "Walk Away",
};

export const TASTING_AXES = [
  "sweetness",
  "oak",
  "spice",
  "fruit",
  "vanilla",
  "caramel",
  "richness",
  "heat",
  "finish",
] as const;
export type TastingAxis = (typeof TASTING_AXES)[number];

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Money is handled in integer cents everywhere. Never floats.
 *
 * The decimal shift is done on the string rather than by multiplying, because
 * `1.005 * 100` is 100.49999999999999 in IEEE 754 and would round down to the
 * wrong cent.
 */
export const dollarsToCents = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const raw = typeof value === "number" ? value.toString() : value.trim();
  if (raw === "" || !/^-?\d*\.?\d*$/.test(raw)) return null;

  const negative = raw.startsWith("-");
  const [whole = "0", fraction = ""] = raw.replace("-", "").split(".");
  const cents = fraction.padEnd(3, "0").slice(0, 3);

  // Half-up on the third decimal, matching how a person reads a price.
  const scaled = Number(whole) * 1000 + Number(cents);
  if (!Number.isFinite(scaled)) return null;

  const rounded = Math.round(scaled / 10);
  return negative ? -rounded : rounded;
};

export const centsToDollars = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);

export const formatCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      }).format(cents / 100);

const optionalText = z
  .string()
  .trim()
  .max(20_000)
  .optional()
  .transform((value) => (value ? value : null));

const optionalShortText = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((value) => (value ? value : null));

const centsField = z
  .number({ message: "Enter a price." })
  .int()
  .positive("Price must be greater than zero.")
  .max(100_000_00, "That price looks wrong.");

const axisField = z
  .number()
  .int()
  .min(0)
  .max(10)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

/**
 * The What We'd Pay ladder. Band ceilings must ascend, which is also enforced
 * by a CHECK constraint — validated here so an editor gets a useful message
 * instead of a database error.
 */
export const priceLadderSchema = z
  .object({
    msrpCents: centsField.nullable().optional().transform((v) => v ?? null),
    msrpSourceUrl: z
      .string()
      .trim()
      .url("Enter a full URL, including https://")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    msrpSourceNote: optionalShortText,
    msrpVerifiedAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    stealMaxCents: centsField,
    buyMaxCents: centsField,
    fairMaxCents: centsField,
    maybeMaxCents: centsField,
    editorialNote: optionalText,
  })
  .refine((v) => v.stealMaxCents <= v.buyMaxCents, {
    message: "Steal ceiling must be at or below the Buy ceiling.",
    path: ["stealMaxCents"],
  })
  .refine((v) => v.buyMaxCents <= v.fairMaxCents, {
    message: "Buy ceiling must be at or below the Fair ceiling.",
    path: ["buyMaxCents"],
  })
  .refine((v) => v.fairMaxCents <= v.maybeMaxCents, {
    message: "Fair ceiling must be at or below the Maybe ceiling.",
    path: ["fairMaxCents"],
  })
  .refine((v) => v.msrpCents === null || v.msrpVerifiedAt !== null, {
    message: "A reference price needs a verification date.",
    path: ["msrpVerifiedAt"],
  })
  .refine((v) => v.msrpCents === null || v.msrpSourceUrl !== null || v.msrpSourceNote !== null, {
    message: "A reference price needs a source URL or a source note.",
    path: ["msrpSourceUrl"],
  });

export const bottleSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2, "Enter a slug.")
      .max(120)
      .regex(SLUG, "Lowercase letters, numbers and hyphens only."),
    brandId: z.string().uuid("Choose a brand."),
    name: z.string().trim().min(2, "Enter the bottle name.").max(200),
    classification: optionalShortText,

    proof: z
      .number()
      .positive()
      .max(200, "Proof cannot exceed 200.")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    abv: z
      .number()
      .positive()
      .max(100, "ABV cannot exceed 100%.")
      .nullable()
      .optional()
      .transform((v) => v ?? null),

    hasAgeStatement: z.boolean().default(false),
    ageYears: z
      .number()
      .positive()
      .max(100)
      .nullable()
      .optional()
      .transform((v) => v ?? null),

    mashBillStatus: z.enum(MASH_BILL_STATUSES).default("undisclosed"),
    mashBillDetails: optionalText,

    producer: optionalShortText,
    actualDistiller: optionalShortText,
    description: optionalText,

    imagePath: optionalShortText,
    imageAlt: optionalShortText,

    status: z.enum(PUBLICATION_STATUSES).default("draft"),
  })
  .refine((v) => v.ageYears === null || v.hasAgeStatement, {
    message: "Clear the age, or mark the bottle as carrying an age statement.",
    path: ["ageYears"],
  })
  .refine((v) => v.imagePath === null || v.imageAlt !== null, {
    message: "An image needs alt text.",
    path: ["imageAlt"],
  })
  .refine((v) => v.mashBillStatus === "undisclosed" || v.mashBillDetails !== null, {
    message: "Describe the mash bill, or mark it undisclosed.",
    path: ["mashBillDetails"],
  });

export const reviewSchema = z.object({
  quickTake: optionalText,
  nose: optionalText,
  palate: optionalText,
  finish: optionalText,
  overall: optionalText,
  bestFor: optionalText,
  skipIf: optionalText,
  sampleProvided: z.boolean().default(false),
  reviewedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export const tastingProfileSchema = z.object(
  Object.fromEntries(TASTING_AXES.map((axis) => [axis, axisField])) as Record<
    TastingAxis,
    typeof axisField
  >,
);

export type BottleInput = z.infer<typeof bottleSchema>;
export type PriceLadderInput = z.infer<typeof priceLadderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type TastingProfileInput = z.infer<typeof tastingProfileSchema>;

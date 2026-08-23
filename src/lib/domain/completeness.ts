/**
 * Completeness scoring (PRD §13.2). Tells an editor what a bottle record is
 * still missing, and blocks publication when something required is absent.
 *
 * "Required" here means required to publish honestly — a verdict is meaningless
 * without a price ladder, and an image is unusable without alt text. Facts a
 * producer refuses to disclose are never treated as missing data.
 */
export type CompletenessField = {
  key: string;
  label: string;
  present: boolean;
  requiredToPublish: boolean;
};

export type CompletenessReport = {
  score: number;
  fields: CompletenessField[];
  missingRequired: CompletenessField[];
  canPublish: boolean;
};

export type CompletenessInput = {
  bottle: {
    name?: string | null;
    slug?: string | null;
    brandId?: string | null;
    classification?: string | null;
    proof?: number | null;
    abv?: number | null;
    description?: string | null;
    imagePath?: string | null;
    imageAlt?: string | null;
    producer?: string | null;
    actualDistiller?: string | null;
    mashBillStatus?: string | null;
    mashBillDetails?: string | null;
  };
  price?: {
    msrpCents?: number | null;
    msrpVerifiedAt?: string | null;
    stealMaxCents?: number | null;
    buyMaxCents?: number | null;
    fairMaxCents?: number | null;
    maybeMaxCents?: number | null;
    editorialNote?: string | null;
  } | null;
  review?: {
    quickTake?: string | null;
    nose?: string | null;
    palate?: string | null;
    finish?: string | null;
    overall?: string | null;
    bestFor?: string | null;
    skipIf?: string | null;
  } | null;
  tastingProfileSet?: boolean;
  alternativeCount?: number;
  retailerCount?: number;
  sourceCount?: number;
};

const filled = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== "" && !Number.isNaN(value);

export function scoreCompleteness(input: CompletenessInput): CompletenessReport {
  const { bottle, price, review } = input;

  const fields: CompletenessField[] = [
    { key: "name", label: "Bottle name", present: filled(bottle.name), requiredToPublish: true },
    { key: "slug", label: "URL slug", present: filled(bottle.slug), requiredToPublish: true },
    { key: "brand", label: "Brand", present: filled(bottle.brandId), requiredToPublish: true },
    {
      key: "classification",
      label: "Classification",
      present: filled(bottle.classification),
      requiredToPublish: true,
    },
    { key: "proof", label: "Proof", present: filled(bottle.proof), requiredToPublish: true },
    { key: "abv", label: "ABV", present: filled(bottle.abv), requiredToPublish: false },
    {
      key: "description",
      label: "Description",
      present: filled(bottle.description),
      requiredToPublish: false,
    },
    {
      key: "image",
      label: "Bottle image with alt text",
      present: filled(bottle.imagePath) && filled(bottle.imageAlt),
      requiredToPublish: true,
    },
    { key: "producer", label: "Producer", present: filled(bottle.producer), requiredToPublish: true },
    {
      key: "distiller",
      label: "Actual distiller",
      // An undisclosed distiller is a fact about the bottle, not a gap in the
      // record, so this never blocks publication.
      present: filled(bottle.actualDistiller),
      requiredToPublish: false,
    },
    {
      key: "mash_bill",
      label: "Mash bill",
      present:
        bottle.mashBillStatus === "undisclosed" ? true : filled(bottle.mashBillDetails),
      requiredToPublish: false,
    },
    {
      key: "ladder",
      label: "What We'd Pay ladder",
      present:
        filled(price?.stealMaxCents) &&
        filled(price?.buyMaxCents) &&
        filled(price?.fairMaxCents) &&
        filled(price?.maybeMaxCents),
      requiredToPublish: true,
    },
    {
      key: "msrp",
      label: "Verified reference price",
      present: filled(price?.msrpCents) && filled(price?.msrpVerifiedAt),
      requiredToPublish: false,
    },
    {
      key: "verdict_note",
      label: "Verdict explanation",
      present: filled(price?.editorialNote),
      requiredToPublish: true,
    },
    {
      key: "quick_take",
      label: "30-second review",
      present: filled(review?.quickTake),
      requiredToPublish: true,
    },
    {
      key: "full_review",
      label: "Nose / palate / finish / overall",
      present:
        filled(review?.nose) &&
        filled(review?.palate) &&
        filled(review?.finish) &&
        filled(review?.overall),
      requiredToPublish: false,
    },
    {
      key: "best_skip",
      label: "Best for / Skip if",
      present: filled(review?.bestFor) && filled(review?.skipIf),
      requiredToPublish: false,
    },
    {
      key: "tasting_profile",
      label: "Flavour profile",
      present: Boolean(input.tastingProfileSet),
      requiredToPublish: false,
    },
    {
      key: "alternatives",
      label: "Alternative bottles",
      present: (input.alternativeCount ?? 0) > 0,
      requiredToPublish: false,
    },
    {
      key: "retailers",
      label: "Retailer destinations",
      present: (input.retailerCount ?? 0) > 0,
      requiredToPublish: false,
    },
    {
      key: "sources",
      label: "Cited sources",
      present: (input.sourceCount ?? 0) > 0,
      requiredToPublish: true,
    },
  ];

  const present = fields.filter((field) => field.present).length;
  const missingRequired = fields.filter((field) => field.requiredToPublish && !field.present);

  return {
    score: Math.round((present / fields.length) * 100),
    fields,
    missingRequired,
    canPublish: missingRequired.length === 0,
  };
}

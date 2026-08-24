import { z } from "zod";

/**
 * Editorial content: buying guides, alternatives guides, Learn and Gear
 * (PRD §11, §12, §13.3).
 *
 * The rule this module exists to enforce is that a guide never copies a bottle
 * fact. Proof, reference price, the What We'd Pay ladder and the verdict all
 * render from the canonical bottle record at request time, so correcting a
 * bottle corrects every guide that features it. A guide item carries only what
 * is genuinely guide-specific: where the bottle ranks, what it is being called,
 * and why it earned the spot.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const ARTICLE_TYPES = ["buying_guide", "alternatives", "learn", "gear", "news"] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  buying_guide: "Buying guide",
  alternatives: "Alternatives guide",
  learn: "Learn",
  gear: "Gear",
  news: "News",
};

/**
 * Route prefixes are fixed by PRD §20 and are part of the SEO contract, so they
 * live here rather than being spelled out at each call site. Slugs are unique
 * across all articles, so a type change moves a page without risking a
 * collision.
 */
export const ARTICLE_ROUTE_PREFIX: Record<ArticleType, string> = {
  buying_guide: "/best",
  alternatives: "/alternatives",
  learn: "/learn",
  gear: "/gear",
  news: "/news",
};

export function articlePath(type: ArticleType, slug: string): string {
  return `${ARTICLE_ROUTE_PREFIX[type]}/${slug}`;
}

/** Types whose whole purpose is to recommend bottles from the canonical set. */
export const GUIDE_TYPES: ArticleType[] = ["buying_guide", "alternatives"];

export function isGuideType(type: ArticleType): boolean {
  return GUIDE_TYPES.includes(type);
}

/** How many picks render above the fold before the full list (PRD §11). */
export const TOP_PICK_COUNT = 3;

// ---------------------------------------------------------------- schemas ----

const optionalText = z
  .string()
  .trim()
  .max(20000)
  .optional()
  .transform((v) => (v ? v : null));

const optionalShortText = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? v : null));

export const articleSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2, "Enter a slug.")
      .max(120)
      .regex(SLUG, "Lowercase letters, numbers and hyphens only — no slashes."),
    title: z.string().trim().min(4, "Enter a title.").max(200),
    articleType: z.enum(ARTICLE_TYPES),
    excerpt: z
      .string()
      .trim()
      .max(200, "Keep the meta description under 200 characters.")
      .optional()
      .transform((v) => (v ? v : null)),
    intro: optionalText,
    body: optionalText,
    methodology: optionalText,
    heroImagePath: optionalShortText,
    heroImageAlt: optionalShortText,
    reviewedAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
  })
  .refine((v) => v.heroImagePath === null || v.heroImageAlt !== null, {
    message: "An image needs alt text.",
    path: ["heroImageAlt"],
  });

/**
 * A pick carries no rank: new picks append to the end of the guide and are
 * reordered afterwards. Letting an editor type a rank invites two items
 * claiming the same position, which the schema cannot see and the database
 * would reject with a constraint error.
 */
export const guideItemSchema = z.object({
  bottleId: z.string().uuid("Choose a bottle."),
  label: z
    .string()
    .trim()
    .max(60, "Keep the label short — it renders as a badge.")
    .optional()
    .transform((v) => (v ? v : null)),
  rationale: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type ArticleInput = z.infer<typeof articleSchema>;
export type GuideItemInput = z.infer<typeof guideItemSchema>;

// ----------------------------------------------------------- completeness ----

export type ArticleCompletenessField = {
  key: string;
  label: string;
  present: boolean;
  requiredToPublish: boolean;
};

export type ArticleCompletenessReport = {
  score: number;
  fields: ArticleCompletenessField[];
  missingRequired: ArticleCompletenessField[];
  canPublish: boolean;
};

export type ArticleCompletenessInput = {
  article: {
    title?: string | null;
    slug?: string | null;
    articleType: ArticleType;
    excerpt?: string | null;
    intro?: string | null;
    body?: string | null;
    methodology?: string | null;
    heroImagePath?: string | null;
    heroImageAlt?: string | null;
    reviewedAt?: string | null;
  };
  /** Guide items whose bottle is itself published. */
  publishedItemCount?: number;
  /** Items pointing at a bottle that is not published — these break the page. */
  unpublishedItemCount?: number;
  itemsMissingRationale?: number;
  sourceCount?: number;
};

const filled = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== "";

/**
 * What a piece of content needs before it can go out (PRD §13.2 applied to
 * §11). The gates that matter:
 *
 *  - A guide with no published picks is an empty page.
 *  - A guide item pointing at an unpublished bottle renders nothing, because
 *    RLS will not return the bottle — so it is a hard block, not a warning.
 *  - A guide claims a methodology, so it has to state one.
 *  - A last-reviewed date must reflect real review, so it is entered by hand
 *    rather than derived from updated_at (PRD §20).
 */
export function scoreArticleCompleteness(
  input: ArticleCompletenessInput,
): ArticleCompletenessReport {
  const { article } = input;
  const guide = isGuideType(article.articleType);

  const fields: ArticleCompletenessField[] = [
    { key: "title", label: "Title", present: filled(article.title), requiredToPublish: true },
    { key: "slug", label: "URL slug", present: filled(article.slug), requiredToPublish: true },
    {
      key: "excerpt",
      label: "Meta description",
      present: filled(article.excerpt),
      requiredToPublish: true,
    },
    { key: "intro", label: "Intro", present: filled(article.intro), requiredToPublish: true },
    {
      key: "body",
      label: "Body copy",
      present: filled(article.body),
      // A guide's substance is its picks and their rationales; long-form body
      // copy below them is optional. Learn and Gear are body copy or nothing.
      requiredToPublish: !guide,
    },
    {
      key: "methodology",
      label: "Methodology",
      present: filled(article.methodology),
      requiredToPublish: guide,
    },
    {
      key: "hero_image",
      label: "Hero image with alt text",
      present: filled(article.heroImagePath) && filled(article.heroImageAlt),
      requiredToPublish: false,
    },
    {
      key: "reviewed_at",
      label: "Last-reviewed date",
      present: filled(article.reviewedAt),
      requiredToPublish: true,
    },
  ];

  if (guide) {
    fields.push(
      {
        key: "picks",
        label: "At least one published bottle",
        present: (input.publishedItemCount ?? 0) > 0,
        requiredToPublish: true,
      },
      {
        key: "picks_live",
        label: "Every pick points at a published bottle",
        present: (input.unpublishedItemCount ?? 0) === 0,
        requiredToPublish: true,
      },
      {
        key: "rationales",
        label: "Every pick has a rationale",
        present: (input.itemsMissingRationale ?? 0) === 0,
        requiredToPublish: true,
      },
    );
  } else {
    fields.push({
      key: "sources",
      label: "Cited sources",
      present: (input.sourceCount ?? 0) > 0,
      // Learn and Gear make claims of their own rather than inheriting a
      // bottle record's citations.
      requiredToPublish: true,
    });
  }

  const present = fields.filter((field) => field.present).length;
  const missingRequired = fields.filter((field) => field.requiredToPublish && !field.present);

  return {
    score: Math.round((present / fields.length) * 100),
    fields,
    missingRequired,
    canPublish: missingRequired.length === 0,
  };
}

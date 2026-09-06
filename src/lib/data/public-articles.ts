import { createPublicClient } from "@/lib/supabase/public";
import type { ArticleType } from "@/lib/domain/article";
import type { PublicBottleSummary, PublicBrand } from "@/lib/data/public-bottles";

/**
 * Public reads for editorial content. Like the bottle reads, everything here
 * goes through the publishable key so RLS decides what comes back — an
 * unpublished guide, or a published guide's pick that points at a draft bottle,
 * simply does not appear.
 *
 * Guide items carry no bottle facts. Proof, reference price, the price ladder
 * and the review copy are joined from the canonical bottle record on every
 * read, which is what makes a guide stay correct when a bottle is corrected
 * (PRD §11).
 */

const ARTICLE_COLUMNS = `
  id, slug, title, article_type, excerpt, intro, body, methodology,
  hero_image_path, hero_image_alt, published_at, reviewed_at, updated_at
`;

const PICK_BOTTLE_COLUMNS = `
  id, slug, name, classification, proof, image_path, image_alt,
  brands ( name, slug, parent_company ),
  bottle_prices ( msrp_cents, msrp_verified_at, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents, editorial_note ),
  reviews ( quick_take, best_for, skip_if ),
  tasting_profiles ( sweetness, oak, spice, fruit, vanilla, caramel, richness, heat, finish )
`;

export type PublicArticleSummary = {
  id: string;
  slug: string;
  title: string;
  article_type: ArticleType;
  excerpt: string | null;
  published_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
};

export type GuidePick = {
  id: string;
  rank: number;
  label: string | null;
  rationale: string | null;
  bottle: PublicBottleSummary & {
    msrp_cents: number | null;
    msrp_verified_at: string | null;
    review: { quick_take: string | null; best_for: string | null; skip_if: string | null } | null;
    tasting: Record<string, number | null> | null;
  };
};

export type PublicArticle = PublicArticleSummary & {
  intro: string | null;
  body: string | null;
  methodology: string | null;
  hero_image_path: string | null;
  hero_image_alt: string | null;
  picks: GuidePick[];
};

const one = <T>(value: unknown): T | null =>
  Array.isArray(value) ? ((value[0] as T) ?? null) : ((value as T) ?? null);

export async function getPublishedArticle(
  type: ArticleType,
  slug: string,
): Promise<PublicArticle | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_COLUMNS)
    .eq("slug", slug)
    .eq("article_type", type)
    .maybeSingle();

  // A failed query is not a missing article; conflating them lets an outage
  // cache itself as a permanent 404.
  if (error) throw error;
  if (!data) return null;

  const record = data as unknown as PublicArticle;
  return { ...record, picks: await getPicks(record.id) };
}

async function getPicks(articleId: string): Promise<GuidePick[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  // guide_items.bottle_id is a real foreign key, so PostgREST can embed the
  // bottle directly here — unlike the polymorphic `sources` table.
  const { data, error } = await supabase
    .from("guide_items")
    .select(`id, rank, label, rationale, bottle:bottles ( ${PICK_BOTTLE_COLUMNS} )`)
    .eq("article_id", articleId)
    .order("rank");

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const bottle = one<Record<string, unknown>>(record.bottle);
      // RLS drops picks whose bottle is not published. Skipping them here means
      // an unpublished bottle leaves no hole in the guide.
      if (!bottle) return null;

      const price = one<Record<string, unknown>>(bottle.bottle_prices);

      return {
        id: record.id as string,
        rank: record.rank as number,
        label: (record.label as string | null) ?? null,
        rationale: (record.rationale as string | null) ?? null,
        bottle: {
          ...(bottle as unknown as PublicBottleSummary),
          brand: one<PublicBrand>(bottle.brands),
          price: price as GuidePick["bottle"]["price"],
          msrp_cents: (price?.msrp_cents as number | null) ?? null,
          msrp_verified_at: (price?.msrp_verified_at as string | null) ?? null,
          review: one(bottle.reviews),
          tasting: one(bottle.tasting_profiles),
        } as GuidePick["bottle"],
      };
    })
    .filter((row): row is GuidePick => row !== null);
}

export async function listPublishedArticles(type: ArticleType): Promise<PublicArticleSummary[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, article_type, excerpt, published_at, reviewed_at, updated_at")
    .eq("article_type", type)
    .order("published_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as PublicArticleSummary[];
}

/** Every published article, for the sitemap and for cross-type internal links. */
export async function listPublishedArticleSlugs(): Promise<
  { slug: string; article_type: ArticleType; updated_at: string }[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("articles").select("slug, article_type, updated_at");
  if (error) throw error;

  return (data ?? []) as unknown as { slug: string; article_type: ArticleType; updated_at: string }[];
}

/**
 * The guides that feature a given bottle, for the "Featured in" block on the
 * bottle page. This is the internal link that closes the loop between canonical
 * records and commercial content (PRD §20).
 */
export async function getGuidesFeaturingBottle(
  bottleId: string,
): Promise<(PublicArticleSummary & { label: string | null; rank: number })[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("guide_items")
    .select(
      `rank, label,
       article:articles ( id, slug, title, article_type, excerpt, published_at, reviewed_at, updated_at )`,
    )
    .eq("bottle_id", bottleId)
    .order("rank")
    .limit(6);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const article = one<PublicArticleSummary>(record.article);
      if (!article) return null;
      return {
        ...article,
        rank: record.rank as number,
        label: (record.label as string | null) ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

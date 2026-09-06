import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isGuideType,
  scoreArticleCompleteness,
  type ArticleCompletenessReport,
  type ArticleType,
} from "@/lib/domain/article";

/**
 * Admin-side reads for editorial content. These use the service role and are
 * only reachable from pages that have already called `requireAdmin()`.
 */

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  article_type: ArticleType;
  excerpt: string | null;
  intro: string | null;
  body: string | null;
  methodology: string | null;
  hero_image_path: string | null;
  hero_image_alt: string | null;
  status: "draft" | "review" | "published" | "archived";
  published_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuideItemRow = {
  id: string;
  bottle_id: string;
  rank: number;
  label: string | null;
  rationale: string | null;
  bottle: {
    name: string;
    slug: string;
    status: string;
    proof: number | null;
    brands: { name: string } | null;
  } | null;
};

export type ArticleDetail = {
  article: ArticleRow;
  items: GuideItemRow[];
  sources: {
    id: string;
    field_name: string | null;
    source_type: string;
    url: string | null;
    title: string | null;
    verified_at: string;
    internal_notes: string | null;
  }[];
  completeness: ArticleCompletenessReport;
};

export type ArticleListItem = ArticleRow & {
  itemCount: number;
  completenessScore: number;
  missingRequired: number;
};

const firstOrNull = (value: unknown): Record<string, unknown> | null =>
  Array.isArray(value)
    ? ((value[0] as Record<string, unknown>) ?? null)
    : ((value as Record<string, unknown> | null) ?? null);

function toCompletenessArticle(row: ArticleRow) {
  return {
    title: row.title,
    slug: row.slug,
    articleType: row.article_type,
    excerpt: row.excerpt,
    intro: row.intro,
    body: row.body,
    methodology: row.methodology,
    heroImagePath: row.hero_image_path,
    heroImageAlt: row.hero_image_alt,
    reviewedAt: row.reviewed_at,
  };
}

/** Counts the three things that gate publishing a guide, in one pass. */
function tallyItems(items: { rationale: string | null; bottle: { status: string } | null }[]) {
  let published = 0;
  let unpublished = 0;
  let missingRationale = 0;

  for (const item of items) {
    if (item.bottle?.status === "published") published += 1;
    else unpublished += 1;
    if (!item.rationale) missingRationale += 1;
  }

  return { published, unpublished, missingRationale };
}

export async function listArticles(): Promise<ArticleListItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("articles")
    .select(`*, guide_items ( id, rationale, bottle:bottles ( status ) )`)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  // `sources` is polymorphic, so it cannot be embedded. Count per article.
  const { data: sourceRows, error: sourceError } = await supabase
    .from("sources")
    .select("entity_id")
    .eq("entity_table", "articles");

  if (sourceError) throw sourceError;

  const sourceCounts = new Map<string, number>();
  for (const row of sourceRows ?? []) {
    const key = (row as { entity_id: string }).entity_id;
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown> & ArticleRow;
    const rawItems = (record.guide_items ?? []) as Record<string, unknown>[];
    const items = rawItems.map((item) => ({
      rationale: (item.rationale as string | null) ?? null,
      bottle: firstOrNull(item.bottle) as { status: string } | null,
    }));
    const tally = tallyItems(items);

    const report = scoreArticleCompleteness({
      article: toCompletenessArticle(record),
      publishedItemCount: tally.published,
      unpublishedItemCount: tally.unpublished,
      itemsMissingRationale: tally.missingRationale,
      sourceCount: sourceCounts.get(record.id) ?? 0,
    });

    return {
      ...(record as ArticleRow),
      itemCount: items.length,
      completenessScore: report.score,
      missingRequired: report.missingRequired.length,
    };
  });
}

export async function getArticle(id: string): Promise<ArticleDetail | null> {
  const supabase = createAdminClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!article) return null;

  const [items, sources] = await Promise.all([
    supabase
      .from("guide_items")
      .select(
        "id, bottle_id, rank, label, rationale, bottle:bottles ( name, slug, status, proof, brands ( name ) )",
      )
      .eq("article_id", id)
      .order("rank"),
    supabase
      .from("sources")
      .select("id, field_name, source_type, url, title, verified_at, internal_notes")
      .eq("entity_table", "articles")
      .eq("entity_id", id)
      .order("verified_at", { ascending: false }),
  ]);

  // Same reason as getBottle: a failed read must not render as absent content.
  for (const result of [items, sources]) {
    if (result.error) throw result.error;
  }

  const shaped: GuideItemRow[] = (items.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const bottle = firstOrNull(record.bottle);
    return {
      ...(record as unknown as GuideItemRow),
      bottle: bottle
        ? ({
            ...(bottle as unknown as NonNullable<GuideItemRow["bottle"]>),
            brands: firstOrNull(bottle.brands) as { name: string } | null,
          } as GuideItemRow["bottle"])
        : null,
    };
  });

  const tally = tallyItems(shaped);

  return {
    article: article as ArticleRow,
    items: shaped,
    sources: (sources.data ?? []) as unknown as ArticleDetail["sources"],
    completeness: scoreArticleCompleteness({
      article: toCompletenessArticle(article as ArticleRow),
      publishedItemCount: tally.published,
      unpublishedItemCount: tally.unpublished,
      itemsMissingRationale: tally.missingRationale,
      sourceCount: sources.data?.length ?? 0,
    }),
  };
}

/**
 * Bottles offered in the guide-item picker. Every bottle is listed, not only
 * published ones, so an editor can build a guide alongside a bottle record that
 * is still in review — the publish gate is what refuses to ship it early.
 */
export async function listBottleOptions(): Promise<
  { id: string; name: string; status: string; brand: string | null }[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bottles")
    .select("id, name, status, brands ( name )")
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const brand = firstOrNull(record.brands) as { name: string } | null;
    return {
      id: record.id as string,
      name: record.name as string,
      status: record.status as string,
      brand: brand?.name ?? null,
    };
  });
}

/** Whether a type needs the guide builder rendered at all. */
export const articleUsesPicker = (type: ArticleType): boolean => isGuideType(type);

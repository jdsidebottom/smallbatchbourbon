import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { scoreCompleteness, type CompletenessReport } from "@/lib/domain/completeness";

/**
 * Admin-side reads. These use the service role and are only reachable from
 * pages that have already called `requireAdmin()`.
 */

export type BottleRow = {
  id: string;
  slug: string;
  brand_id: string;
  name: string;
  classification: string | null;
  proof: number | null;
  abv: number | null;
  has_age_statement: boolean;
  age_years: number | null;
  mash_bill_status: "disclosed" | "partial" | "undisclosed";
  mash_bill_details: string | null;
  producer: string | null;
  actual_distiller: string | null;
  description: string | null;
  image_path: string | null;
  image_alt: string | null;
  status: "draft" | "review" | "published" | "archived";
  published_at: string | null;
  updated_at: string;
};

export type PriceRow = {
  bottle_id: string;
  msrp_cents: number | null;
  currency: string;
  msrp_source_url: string | null;
  msrp_source_note: string | null;
  msrp_verified_at: string | null;
  steal_max_cents: number;
  buy_max_cents: number;
  fair_max_cents: number;
  maybe_max_cents: number;
  editorial_note: string | null;
};

export type ReviewRow = {
  bottle_id: string;
  quick_take: string | null;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall: string | null;
  best_for: string | null;
  skip_if: string | null;
  sample_provided: boolean;
  reviewed_at: string | null;
  published_at: string | null;
};

export type TastingRow = Record<string, number | null> & { bottle_id: string };

export type BrandRow = { id: string; slug: string; name: string; parent_company: string | null };

export type BottleDetail = {
  bottle: BottleRow;
  brand: BrandRow | null;
  price: PriceRow | null;
  review: ReviewRow | null;
  tasting: TastingRow | null;
  alternatives: {
    id: string;
    target_bottle_id: string;
    relationship_type: string;
    rank: number;
    note: string | null;
    target: { name: string; slug: string; status: string } | null;
  }[];
  retailers: {
    id: string;
    retailer_id: string;
    destination_url: string;
    is_active: boolean;
    retailer: { name: string; slug: string; is_active: boolean } | null;
  }[];
  sources: {
    id: string;
    field_name: string | null;
    source_type: string;
    url: string | null;
    title: string | null;
    verified_at: string;
    internal_notes: string | null;
  }[];
  completeness: CompletenessReport;
};

export async function listBrands(): Promise<BrandRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name, parent_company")
    .order("name");
  if (error) throw error;
  return (data ?? []) as BrandRow[];
}

export type BottleListItem = BottleRow & {
  brands: { name: string } | null;
  completenessScore: number;
  missingRequired: number;
};

export async function listBottles(): Promise<BottleListItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bottles")
    .select(
      `*, brands ( name ),
       bottle_prices ( msrp_cents, msrp_verified_at, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents, editorial_note ),
       reviews ( quick_take, nose, palate, finish, overall, best_for, skip_if ),
       tasting_profiles ( bottle_id ),
       bottle_relationships!bottle_relationships_source_bottle_id_fkey ( id ),
       bottle_retailers ( id ),
       sources_count:sources ( id )`,
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown> & BottleRow;
    const price = firstOrNull(record.bottle_prices);
    const review = firstOrNull(record.reviews);

    const report = scoreCompleteness({
      bottle: toBottleCompleteness(record),
      price: price ? toPriceCompleteness(price) : null,
      review: review ? toReviewCompleteness(review) : null,
      tastingProfileSet: countOf(record.tasting_profiles) > 0,
      alternativeCount: countOf(record.bottle_relationships),
      retailerCount: countOf(record.bottle_retailers),
      sourceCount: countOf(record.sources_count),
    });

    return {
      ...(row as BottleListItem),
      completenessScore: report.score,
      missingRequired: report.missingRequired.length,
    };
  });
}

export async function getBottle(id: string): Promise<BottleDetail | null> {
  const supabase = createAdminClient();

  const { data: bottle, error } = await supabase
    .from("bottles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!bottle) return null;

  const [brand, price, review, tasting, alternatives, retailers, sources] = await Promise.all([
    supabase.from("brands").select("id, slug, name, parent_company").eq("id", bottle.brand_id).maybeSingle(),
    supabase.from("bottle_prices").select("*").eq("bottle_id", id).maybeSingle(),
    supabase.from("reviews").select("*").eq("bottle_id", id).maybeSingle(),
    supabase.from("tasting_profiles").select("*").eq("bottle_id", id).maybeSingle(),
    supabase
      .from("bottle_relationships")
      .select("id, target_bottle_id, relationship_type, rank, note, target:bottles!bottle_relationships_target_bottle_id_fkey ( name, slug, status )")
      .eq("source_bottle_id", id)
      .order("rank"),
    supabase
      .from("bottle_retailers")
      .select("id, retailer_id, destination_url, is_active, retailer:retailers ( name, slug, is_active )")
      .eq("bottle_id", id),
    supabase
      .from("sources")
      .select("id, field_name, source_type, url, title, verified_at, internal_notes")
      .eq("entity_table", "bottles")
      .eq("entity_id", id)
      .order("verified_at", { ascending: false }),
  ]);

  const completeness = scoreCompleteness({
    bottle: toBottleCompleteness(bottle as BottleRow),
    price: price.data ? toPriceCompleteness(price.data) : null,
    review: review.data ? toReviewCompleteness(review.data) : null,
    tastingProfileSet: Boolean(tasting.data),
    alternativeCount: alternatives.data?.length ?? 0,
    retailerCount: retailers.data?.length ?? 0,
    sourceCount: sources.data?.length ?? 0,
  });

  return {
    bottle: bottle as BottleRow,
    brand: (brand.data as BrandRow | null) ?? null,
    price: (price.data as PriceRow | null) ?? null,
    review: (review.data as ReviewRow | null) ?? null,
    tasting: (tasting.data as TastingRow | null) ?? null,
    // PostgREST returns an embedded to-one relation as an array; flatten it so
    // callers get the single record the foreign key actually guarantees.
    alternatives: (alternatives.data ?? []).map((row) => ({
      ...(row as unknown as BottleDetail["alternatives"][number]),
      target: firstOrNull((row as Record<string, unknown>).target) as
        | { name: string; slug: string; status: string }
        | null,
    })),
    retailers: (retailers.data ?? []).map((row) => ({
      ...(row as unknown as BottleDetail["retailers"][number]),
      retailer: firstOrNull((row as Record<string, unknown>).retailer) as
        | { name: string; slug: string; is_active: boolean }
        | null,
    })),
    sources: (sources.data ?? []) as unknown as BottleDetail["sources"],
    completeness,
  };
}

// ---------------------------------------------------------------- helpers ----

function firstOrNull(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  return (value as Record<string, unknown> | null) ?? null;
}

function countOf(value: unknown): number {
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

function toBottleCompleteness(row: BottleRow) {
  return {
    name: row.name,
    slug: row.slug,
    brandId: row.brand_id,
    classification: row.classification,
    proof: row.proof,
    abv: row.abv,
    description: row.description,
    imagePath: row.image_path,
    imageAlt: row.image_alt,
    producer: row.producer,
    actualDistiller: row.actual_distiller,
    mashBillStatus: row.mash_bill_status,
    mashBillDetails: row.mash_bill_details,
  };
}

function toPriceCompleteness(row: Record<string, unknown>) {
  return {
    msrpCents: row.msrp_cents as number | null,
    msrpVerifiedAt: row.msrp_verified_at as string | null,
    stealMaxCents: row.steal_max_cents as number | null,
    buyMaxCents: row.buy_max_cents as number | null,
    fairMaxCents: row.fair_max_cents as number | null,
    maybeMaxCents: row.maybe_max_cents as number | null,
    editorialNote: row.editorial_note as string | null,
  };
}

function toReviewCompleteness(row: Record<string, unknown>) {
  return {
    quickTake: row.quick_take as string | null,
    nose: row.nose as string | null,
    palate: row.palate as string | null,
    finish: row.finish as string | null,
    overall: row.overall as string | null,
    bestFor: row.best_for as string | null,
    skipIf: row.skip_if as string | null,
  };
}

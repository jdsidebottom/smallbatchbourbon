import { createPublicClient } from "@/lib/supabase/public";

/**
 * Public reads. Every query here goes through the publishable key, so RLS
 * decides what comes back — these functions never need to filter on
 * `status = 'published'` themselves, though they do so anyway where it makes
 * the intent legible.
 *
 * Note what is absent: `bottle_retailers.destination_url` is not selected
 * anywhere in this file, because the public role has no GRANT on it. Outbound
 * links go through /go/{merchant}/{bottle}, which resolves the destination
 * server-side.
 */

const BOTTLE_COLUMNS = `
  id, slug, name, classification, proof, abv,
  has_age_statement, age_years, mash_bill_status, mash_bill_details,
  producer, actual_distiller, description, image_path, image_alt,
  published_at, updated_at,
  brands ( name, slug, parent_company )
`;

const PRICE_COLUMNS = `
  msrp_cents, currency, msrp_source_url, msrp_verified_at,
  steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents,
  editorial_note, updated_at
`;

export type PublicBrand = { name: string; slug: string; parent_company: string | null };

export type PublicBottleSummary = {
  id: string;
  slug: string;
  name: string;
  classification: string | null;
  proof: number | null;
  image_path: string | null;
  image_alt: string | null;
  brand: PublicBrand | null;
  price: {
    msrp_cents: number | null;
    steal_max_cents: number;
    buy_max_cents: number;
    fair_max_cents: number;
    maybe_max_cents: number;
    editorial_note?: string | null;
  } | null;
};

export type PublicBottle = {
  id: string;
  slug: string;
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
  published_at: string | null;
  updated_at: string;
  brand: PublicBrand | null;
  price: {
    msrp_cents: number | null;
    currency: string;
    msrp_source_url: string | null;
    msrp_verified_at: string | null;
    steal_max_cents: number;
    buy_max_cents: number;
    fair_max_cents: number;
    maybe_max_cents: number;
    editorial_note: string | null;
    updated_at: string;
  } | null;
  review: {
    quick_take: string | null;
    nose: string | null;
    palate: string | null;
    finish: string | null;
    overall: string | null;
    best_for: string | null;
    skip_if: string | null;
    sample_provided: boolean;
    reviewed_at: string | null;
  } | null;
  tasting: Record<string, number | null> | null;
  alternatives: {
    relationship_type: string;
    rank: number;
    note: string | null;
    bottle: PublicBottleSummary;
  }[];
  retailers: { id: string; retailer: { name: string; slug: string; disclosure_note: string | null } }[];
};

const one = <T>(value: unknown): T | null =>
  Array.isArray(value) ? ((value[0] as T) ?? null) : ((value as T) ?? null);

export async function getPublishedBottle(slug: string): Promise<PublicBottle | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("bottles")
    .select(
      `${BOTTLE_COLUMNS},
       bottle_prices ( ${PRICE_COLUMNS} ),
       reviews ( quick_take, nose, palate, finish, overall, best_for, skip_if, sample_provided, reviewed_at ),
       tasting_profiles ( sweetness, oak, spice, fruit, vanilla, caramel, richness, heat, finish )`,
    )
    .eq("slug", slug)
    .maybeSingle();

  // A failed query is not a missing bottle. Returning null for both would let a
  // transient outage cache itself as a permanent 404.
  if (error) throw error;
  if (!data) return null;

  const record = data as Record<string, unknown>;

  const [alternatives, retailers] = await Promise.all([
    getAlternatives(record.id as string),
    getRetailers(record.id as string),
  ]);

  return {
    ...(record as unknown as PublicBottle),
    brand: one<PublicBrand>(record.brands),
    price: one(record.bottle_prices),
    review: one(record.reviews),
    tasting: one(record.tasting_profiles),
    alternatives,
    retailers,
  } as PublicBottle;
}

async function getAlternatives(bottleId: string): Promise<PublicBottle["alternatives"]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  // RLS requires both ends of the relationship to be published, so an
  // alternative pointing at a draft simply does not come back.
  const { data, error } = await supabase
    .from("bottle_relationships")
    .select(
      `relationship_type, rank, note,
       bottle:bottles!bottle_relationships_target_bottle_id_fkey (
         id, slug, name, classification, proof, image_path, image_alt,
         brands ( name, slug, parent_company ),
         bottle_prices ( msrp_cents, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents )
       )`,
    )
    .eq("source_bottle_id", bottleId)
    .order("rank")
    .limit(6);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const target = one<Record<string, unknown>>(record.bottle);
      if (!target) return null;

      return {
        relationship_type: record.relationship_type as string,
        rank: record.rank as number,
        note: (record.note as string | null) ?? null,
        bottle: {
          ...(target as unknown as PublicBottleSummary),
          brand: one<PublicBrand>(target.brands),
          price: one(target.bottle_prices),
        } as PublicBottleSummary,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

async function getRetailers(bottleId: string): Promise<PublicBottle["retailers"]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  // destination_url is intentionally not selected — the public role cannot read it.
  const { data, error } = await supabase
    .from("bottle_retailers")
    .select("id, retailers ( name, slug, disclosure_note )")
    .eq("bottle_id", bottleId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const retailer = one<{ name: string; slug: string; disclosure_note: string | null }>(
        record.retailers,
      );
      return retailer ? { id: record.id as string, retailer } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function listPublishedBottles(): Promise<PublicBottleSummary[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("bottles")
    .select(
      `id, slug, name, classification, proof, image_path, image_alt,
       brands ( name, slug, parent_company ),
       bottle_prices ( msrp_cents, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents, editorial_note )`,
    )
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      ...(record as unknown as PublicBottleSummary),
      brand: one<PublicBrand>(record.brands),
      price: one(record.bottle_prices),
    } as PublicBottleSummary;
  });
}

export async function listPublishedSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("bottles").select("slug, updated_at");
  if (error) throw error;

  return (data ?? []) as { slug: string; updated_at: string }[];
}

/**
 * Autocomplete. Full-text match first (which includes the brand name), falling
 * back to a trigram-backed prefix match so a half-typed name still returns
 * something useful.
 */
export async function searchBottles(query: string, limit = 8): Promise<PublicBottleSummary[]> {
  const supabase = createPublicClient();
  const trimmed = query.trim();
  if (!supabase || trimmed.length < 2) return [];

  const columns = `
    id, slug, name, classification, proof, image_path, image_alt,
    brands ( name, slug, parent_company ),
    bottle_prices ( msrp_cents, steal_max_cents, buy_max_cents, fair_max_cents, maybe_max_cents, editorial_note )
  `;

  const shape = (rows: unknown[]): PublicBottleSummary[] =>
    rows.map((row) => {
      const record = row as Record<string, unknown>;
      return {
        ...(record as unknown as PublicBottleSummary),
        brand: one<PublicBrand>(record.brands),
        price: one(record.bottle_prices),
      } as PublicBottleSummary;
    });

  // Strip punctuation before discarding empties: a term of "--" would otherwise
  // survive as ":*" and make the whole tsquery invalid.
  const terms = trimmed
    .split(/\s+/)
    .map((term) => term.replace(/[^\w]/g, ""))
    .filter(Boolean);
  const prefixQuery = terms.map((term) => `${term}:*`).join(" & ");

  if (prefixQuery) {
    const { data, error } = await supabase
      .from("bottles")
      .select(columns)
      .textSearch("search_vector", prefixQuery, { config: "english" })
      .limit(limit);

    if (error) throw error;
    if (data && data.length > 0) return shape(data);
  }

  const { data: fuzzy, error: fuzzyError } = await supabase
    .from("bottles")
    .select(columns)
    .ilike("name", `%${trimmed}%`)
    .limit(limit);

  if (fuzzyError) throw fuzzyError;

  return shape(fuzzy ?? []);
}

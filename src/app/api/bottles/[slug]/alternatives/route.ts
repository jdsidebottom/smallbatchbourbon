import { NextResponse } from "next/server";
import { getPublishedBottle } from "@/lib/data/public-bottles";

export const runtime = "nodejs";

/**
 * Alternatives for one bottle, for Liquor Store Mode.
 *
 * Fetched lazily and only when the verdict is poor enough for alternatives to
 * be useful, so the common case — a good price, buy it, put the phone away —
 * costs nothing extra.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ alternatives: [] }, { status: 404 });
  }

  const bottle = await getPublishedBottle(slug);
  if (!bottle) return NextResponse.json({ alternatives: [] }, { status: 404 });

  return NextResponse.json(
    {
      alternatives: bottle.alternatives.slice(0, 3).map((alt) => ({
        slug: alt.bottle.slug,
        name: alt.bottle.name,
        brand: alt.bottle.brand?.name ?? null,
        note: alt.note,
        buyMaxCents: alt.bottle.price?.buy_max_cents ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}

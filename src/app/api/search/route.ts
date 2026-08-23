import { NextResponse } from "next/server";
import { searchBottles } from "@/lib/data/public-bottles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bottle autocomplete. Read-only and RLS-bound, so it can only ever return
 * published bottles and the columns the public role is granted.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchBottles(query.slice(0, 120));

  return NextResponse.json(
    {
      results: results.map((bottle) => ({
        slug: bottle.slug,
        name: bottle.name,
        brand: bottle.brand?.name ?? null,
        classification: bottle.classification,
        proof: bottle.proof,
        buyMaxCents: bottle.price?.buy_max_cents ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
  );
}

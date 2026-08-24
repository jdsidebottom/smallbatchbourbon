import { NextResponse } from "next/server";
import { searchBottles } from "@/lib/data/public-bottles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bottle autocomplete. Read-only and RLS-bound, so it can only ever return
 * published bottles and the columns the public role is granted.
 *
 * The full What We'd Pay ladder ships with each result. That is public
 * editorial data, and it means Liquor Store Mode can turn a shelf price into a
 * verdict without a second round trip — which matters when the shopper is
 * standing in an aisle on a bad signal.
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
        ladder: bottle.price
          ? {
              stealMaxCents: bottle.price.steal_max_cents,
              buyMaxCents: bottle.price.buy_max_cents,
              fairMaxCents: bottle.price.fair_max_cents,
              maybeMaxCents: bottle.price.maybe_max_cents,
            }
          : null,
        msrpCents: bottle.price?.msrp_cents ?? null,
        editorialNote: bottle.price?.editorial_note ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
  );
}

import { after, NextResponse } from "next/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { buildDestination, isSafeSlug, sanitizeOriginPath } from "@/lib/domain/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

/**
 * Outbound affiliate redirect (PRD §14).
 *
 * The destination is resolved from the database by merchant slug and bottle
 * slug — never from anything the caller supplies. There is no `?url=`
 * parameter and no open redirect: the worst a crafted request can do is 404.
 *
 * Both the merchant and the bottle must be active and published, so switching a
 * merchant to inactive disables its links across the whole site at once.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ merchant: string; bottle: string }> },
) {
  const { merchant, bottle } = await params;

  if (!isSafeSlug(merchant) || !isSafeSlug(bottle)) return notFound();

  const supabase = tryCreateAdminClient();
  if (!supabase) {
    console.error("[affiliate] SUPABASE_SERVICE_ROLE_KEY is not configured; redirect unavailable");
    return notFound();
  }

  const { data, error } = await supabase
    .from("bottle_retailers")
    .select(
      `destination_url,
       retailers!inner ( id, slug, is_active, tracking_config ),
       bottles!inner ( id, slug, status )`,
    )
    .eq("retailers.slug", merchant)
    .eq("bottles.slug", bottle)
    .eq("is_active", true)
    .eq("retailers.is_active", true)
    .eq("bottles.status", "published")
    .maybeSingle();

  if (error || !data) return notFound();

  const row = data as unknown as {
    destination_url: string;
    retailers: { id: string; tracking_config: Record<string, unknown> | null };
    bottles: { id: string };
  };

  const destination = buildDestination(row.destination_url, row.retailers.tracking_config);
  if (!destination) return notFound();

  // Click metadata is deliberately minimal: no IP, no user agent, nothing that
  // identifies a person. Logging must never block or fail the redirect, so it
  // runs after the response is on its way — awaiting it here put a second
  // database round trip between the shopper and the merchant.
  const originPath = sanitizeOriginPath(request.headers.get("referer"), request.url);

  after(async () => {
    try {
      const { error: logError } = await supabase.from("affiliate_clicks").insert({
        retailer_id: row.retailers.id,
        bottle_id: row.bottles.id,
        origin_path: originPath,
      });
      if (logError) console.error("[affiliate] click log failed:", logError.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("[affiliate] click log failed:", message);
    }
  });

  const response = NextResponse.redirect(destination, { status: 302 });
  response.headers.set("Cache-Control", "no-store");

  // Referrer-Policy is deliberately not set here: the site-wide
  // `strict-origin-when-cross-origin` from next.config.ts already takes effect
  // and wins over anything set on this response, so the merchant receives our
  // origin and never the full referring URL. Setting it here would be dead code
  // that reads as though it were doing the work.
  return response;
}

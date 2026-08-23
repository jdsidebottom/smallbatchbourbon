/**
 * Pure helpers for the outbound affiliate redirect. Kept out of the route
 * handler so the security-critical decisions are unit-testable.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Slugs are the only caller-supplied input the redirect accepts. */
export function isSafeSlug(value: string): boolean {
  return value.length <= 120 && SLUG.test(value);
}

/**
 * Builds the final destination from a database-held URL plus the merchant's
 * tracking parameters.
 *
 * Returns null for anything that is not an https URL. The database has an https
 * CHECK constraint too, but a redirect is worth re-validating at the point of
 * use — this is the function that decides where a reader's browser goes next.
 */
export function buildDestination(
  storedUrl: string,
  trackingConfig: Record<string, unknown> | null | undefined,
): string | null {
  let url: URL;
  try {
    url = new URL(storedUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  for (const [key, value] of Object.entries(trackingConfig ?? {})) {
    if (typeof value === "string" && key.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Click logging records where on our own site the click came from, and nothing
 * else. An external or malformed referrer is discarded rather than stored.
 */
export function sanitizeOriginPath(referer: string | null, requestUrl: string): string | null {
  if (!referer) return null;
  try {
    const origin = new URL(requestUrl).origin;
    const parsed = new URL(referer);
    return parsed.origin === origin ? parsed.pathname.slice(0, 300) : null;
  } catch {
    return null;
  }
}

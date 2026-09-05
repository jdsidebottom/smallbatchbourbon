/**
 * Cloudflare Turnstile verification (server side).
 *
 * Why Turnstile and not a bigger rate limiter: the in-process counter in the
 * newsletter route degrades to almost nothing on Vercel's serverless runtime,
 * and the Cloudflare rate-limiting rule that covers the endpoint today goes
 * inert the moment DNS points at Vercel un-proxied. Neither ever stopped the
 * attack that actually matters here — a flood of *unique* addresses, which
 * looks like ordinary traffic to a per-IP counter but pads the list with
 * unreachable subscribers and drags deliverability down for real ones.
 *
 * Privacy note: this is a standalone widget with **pre-clearance left off**,
 * which is Cloudflare's default for every widget. In that mode Turnstile issues
 * a one-time token rather than a `cf_clearance` cookie, so the site's
 * "exactly one cookie" position in the privacy policy still holds. Enabling
 * pre-clearance would change that and would require a consent banner on top of
 * the 21+ gate — do not enable it.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type VerifyResult =
  | { status: "ok" }
  | { status: "not_configured" }
  | { status: "failed"; codes: string[] }
  | { status: "unavailable"; detail: string };

/**
 * Whether the server has a secret configured. The route uses this to tell an
 * unconfigured deployment (skip verification, warn loudly) apart from a
 * configured one that rejected the token.
 */
export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Exchanges a widget token for a verdict.
 *
 * Tokens are single-use and expire 300 seconds after they are issued, so a
 * replayed or stale token comes back as `timeout-or-duplicate`. That is a
 * client-side bug (the widget was not reset after a submit), not an attack, and
 * it is worth keeping distinguishable in the logs.
 */
export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string,
): Promise<VerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { status: "not_configured" };

  // Cloudflare caps tokens at 2048 characters. Anything longer is not a token
  // and is not worth an outbound request.
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { status: "failed", codes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (error) {
    return {
      status: "unavailable",
      detail: error instanceof Error ? error.message : "network error",
    };
  }

  if (!response.ok) {
    return { status: "unavailable", detail: `siteverify returned ${response.status}` };
  }

  let payload: { success?: boolean; "error-codes"?: string[] };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { status: "unavailable", detail: "siteverify returned a non-JSON body" };
  }

  if (payload.success) return { status: "ok" };

  const codes = payload["error-codes"] ?? [];

  // `internal-error` means Cloudflare failed, not that the visitor did. Treat it
  // as an outage so the caller can decide whether to fail open, rather than
  // silently blaming a legitimate subscriber.
  if (codes.includes("internal-error")) {
    return { status: "unavailable", detail: "internal-error" };
  }

  return { status: "failed", codes };
}

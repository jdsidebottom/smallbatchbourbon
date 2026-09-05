import { NextResponse } from "next/server";
import { isSubscribeSource, isValidEmail, subscribe } from "@/lib/newsletter";
import { isTurnstileConfigured, verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Best-effort in-process rate limit for the only public write endpoint on the
 * site. On Vercel each request may land on a fresh instance with an empty
 * counter, so this stops a naive loop from one client and little more — it is a
 * courtesy, not the defence. Turnstile below is the defence.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  if (hits.size > 10_000) hits.clear();

  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { code: "rate_limited", message: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  }

  const body = payload as {
    email?: unknown;
    source?: unknown;
    company?: unknown;
    turnstileToken?: unknown;
  };

  // Honeypot: real people never fill a visually hidden field.
  if (typeof body.company === "string" && body.company.length > 0) {
    return NextResponse.json({ code: "subscribed" }, { status: 200 });
  }

  // Turnstile runs before validation: an unverified request should not get to
  // probe which addresses the validator accepts, and should never cost an
  // outbound call against the Beehiiv list.
  if (isTurnstileConfigured()) {
    const verdict = await verifyTurnstile(body.turnstileToken, clientKey(request));

    if (verdict.status === "failed") {
      console.warn("[newsletter] turnstile rejected a submission:", verdict.codes.join(","));
      return NextResponse.json(
        { code: "verification_failed", message: "We could not verify that request. Please try again." },
        { status: 403 },
      );
    }

    // Cloudflare being down must not take signups down with it. Failing open is
    // deliberate: the honeypot and rate limit still apply, and a short window of
    // weaker filtering costs less than turning real subscribers away. Logged as
    // an error so the window is visible rather than silent.
    if (verdict.status === "unavailable") {
      console.error("[newsletter] turnstile unavailable, failing open:", verdict.detail);
    }
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json(
      { code: "invalid_email", message: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const source = isSubscribeSource(body.source) ? body.source : "landing_proof_and_perspective";
  const result = await subscribe(body.email, source);

  switch (result.status) {
    case "subscribed":
      return NextResponse.json({ code: "subscribed" }, { status: 200 });
    case "duplicate":
      return NextResponse.json(
        { code: "duplicate", message: "You're already on the list." },
        { status: 200 },
      );
    case "not_configured":
      console.warn("[newsletter] provider is not configured; subscription was not recorded");
      return NextResponse.json(
        { code: "provider_error", message: "Signup isn't available right now. Please try again later." },
        { status: 503 },
      );
    case "provider_error":
      console.error("[newsletter] provider error:", result.detail);
      return NextResponse.json(
        { code: "provider_error", message: "Signup isn't available right now. Please try again later." },
        { status: 502 },
      );
  }
}

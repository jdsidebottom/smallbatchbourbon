/**
 * Newsletter service layer (PRD §15 / §16).
 *
 * The provider is isolated behind this module so Beehiiv can be swapped without
 * touching routes or components. When credentials are absent the layer reports
 * `not_configured` rather than pretending a subscription succeeded.
 */

/**
 * The signup points on the site. Sent to Beehiiv as the `signup_source` custom
 * field and as utm_medium, which is what makes them segmentable there —
 * Beehiiv's create-subscription endpoint takes custom fields, not arbitrary
 * tags.
 *
 * `find_my_next_pour` matters most: those people asked to hear about a feature
 * that does not exist yet, and need to be reachable separately when it ships
 * (PRD §7.2).
 */
const SIGNUP_SOURCES = [
  "landing_hero",
  "landing_proof_and_perspective",
  "find_my_next_pour",
  "footer",
] as const;

export type SubscribeSource = (typeof SIGNUP_SOURCES)[number];

export type SubscribeResult =
  | { status: "subscribed" }
  | { status: "duplicate" }
  | { status: "not_configured" }
  | { status: "provider_error"; detail: string };


export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim())
  );
}

export function isSubscribeSource(value: unknown): value is SubscribeSource {
  return typeof value === "string" && (SIGNUP_SOURCES as readonly string[]).includes(value);
}

export async function subscribe(
  email: string,
  source: SubscribeSource,
): Promise<SubscribeResult> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    return { status: "not_configured" };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.beehiiv.com/v2/publications/${encodeURIComponent(publicationId)}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: "smallbatchbourbon.com",
          utm_medium: source,
          custom_fields: [{ name: "signup_source", value: source }],
        }),
        cache: "no-store",
      },
    );
  } catch (error) {
    return { status: "provider_error", detail: error instanceof Error ? error.message : "network error" };
  }

  if (response.ok) return { status: "subscribed" };

  if (response.status === 409) return { status: "duplicate" };

  const detail = await response.text().catch(() => "");
  return { status: "provider_error", detail: `${response.status} ${detail.slice(0, 200)}` };
}


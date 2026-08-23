/**
 * Newsletter service layer (PRD §15 / §16).
 *
 * The provider is isolated behind this module so Beehiiv can be swapped without
 * touching routes or components. When credentials are absent the layer reports
 * `not_configured` rather than pretending a subscription succeeded.
 */
export type SubscribeSource = "landing_hero" | "landing_weekly_pour" | "find_my_next_pour" | "footer";

export type SubscribeResult =
  | { status: "subscribed" }
  | { status: "duplicate" }
  | { status: "not_configured" }
  | { status: "provider_error"; detail: string };

const SOURCE_TAGS: Record<SubscribeSource, string[]> = {
  landing_hero: ["landing-page", "weekly-pour"],
  landing_weekly_pour: ["landing-page", "weekly-pour"],
  find_my_next_pour: ["landing-page", "find-my-next-pour-interest"],
  footer: ["landing-page", "weekly-pour", "footer"],
};

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim())
  );
}

export function isSubscribeSource(value: unknown): value is SubscribeSource {
  return typeof value === "string" && value in SOURCE_TAGS;
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

export function tagsForSource(source: SubscribeSource): string[] {
  return SOURCE_TAGS[source];
}

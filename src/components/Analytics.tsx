import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/**
 * Measurement, chosen so the site needs no cookie consent banner.
 *
 * Both providers here are cookieless and store no personal data, which is why
 * they can load without prior consent. That was the deciding factor over GA4
 * and Clarity: session recording and advertising cookies would have required a
 * consent dialog in front of every first-time visitor, on top of the 21+ gate.
 *
 *  - **Vercel Web Analytics** — page views and the PRD §21.1 business events.
 *    Served same-origin from /_vercel/insights, so it needs no CSP exception
 *    and no third-party connection.
 *  - **Cloudflare Web Analytics** — an independent page-view count. Optional:
 *    without a token, nothing is injected.
 *
 * Google Search Console is not here and needs nothing here. It reports on our
 * own search performance and sets nothing on a visitor's device; verification
 * is a DNS record or the `google` value in the layout's metadata.
 */
export function Analytics() {
  const cloudflareToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;

  return (
    <>
      <VercelAnalytics />

      {cloudflareToken && (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon={JSON.stringify({ token: cloudflareToken })}
        />
      )}
    </>
  );
}

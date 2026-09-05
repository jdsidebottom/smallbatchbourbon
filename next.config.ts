import type { NextConfig } from "next";
import { supabaseCspOrigins } from "./src/lib/domain/csp";

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on script-src is now required by exactly one script: the
 * pre-paint age-gate bootstrap, which must run inline to dismiss the gate before
 * paint without giving up static generation. Dropping GA4 and Clarity removed
 * the other inline snippets, so a hash-based policy covering that single script
 * is now a small change rather than a rewrite — worth doing before launch.
 */
const isProd = process.env.NODE_ENV === "production";

// The browser talks directly to Supabase for auth, so its origin has to be
// allowed explicitly — `'self'` does not cover it. Derived from the same env
// var the client uses, so preview and production each allow their own project
// rather than a hardcoded one.
const supabase = supabaseCspOrigins(process.env.NEXT_PUBLIC_SUPABASE_URL);

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // React's development build needs eval() for its debugging features. It is
  // never permitted in production.
  // Vercel Web Analytics is served same-origin in production, so it needs no
  // exception there. The path is NOT /_vercel/insights: the build injects a
  // per-project random prefix (REACT_APP_VERCEL_OBSERVABILITY_BASEPATH, e.g.
  // /2dab36e5d392dd39/script.js) so ad blockers cannot pattern-match it. Grep
  // production for /_vercel/insights and you will wrongly conclude analytics is
  // dead; look for a same-origin /<hash>/script.js plus POSTs to /<hash>/view.
  // In dev there is no such prefix and the package loads its debug build from
  // va.vercel-scripts.com, so that host is allowed in development only — it
  // logs events to the console and sends nothing, which is how you verify event
  // wiring locally without writing to production analytics.
  `script-src 'self' 'unsafe-inline'${
    isProd ? "" : " 'unsafe-eval' https://va.vercel-scripts.com"
  } https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
  // frame-src is not otherwise set and would fall back to default-src 'self',
  // which silently blanks the Turnstile widget. Turnstile runs with
  // pre-clearance off, so it issues a one-time token and sets no cf_clearance
  // cookie — that is what keeps the no-consent-banner position intact. Do not
  // enable pre-clearance without also building consent.
  "frame-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  // Bottle images are served from the public Supabase Storage bucket.
  `img-src 'self' data: blob:${
    supabase.imgSrc.length ? ` ${supabase.imgSrc.join(" ")}` : ""
  }`,
  "font-src 'self' data:",
  // ws: is the Next dev-server hot-reload socket; Chrome does not treat it as
  // covered by 'self'.
  `connect-src 'self' https://cloudflareinsights.com https://challenges.cloudflare.com${
    supabase.connectSrc.length ? ` ${supabase.connectSrc.join(" ")}` : ""
  }${isProd ? "" : " ws://localhost:* http://localhost:*"}`,
  // Would rewrite http://localhost to https during local development.
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

// Mirrors `allowIndexing` in src/lib/site.ts. The meta tag covers HTML; this
// header also covers sitemap.xml, images and anything else a crawler fetches.
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  ...(allowIndexing ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Bottle photography is served from the public Supabase Storage bucket.
    // Derived from the same env var as the CSP, so preview and production each
    // allow their own project rather than a hardcoded host.
    remotePatterns: supabase.origin
      ? [
          {
            protocol: "https" as const,
            hostname: new URL(supabase.origin).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

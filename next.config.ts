import type { NextConfig } from "next";
import { supabaseCspOrigins } from "./src/lib/domain/csp";

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on script-src is currently required by the pre-paint age-gate
 * bootstrap and the GA/Clarity init snippets, which must run inline for the page
 * to stay statically generated. Tighten this to a nonce- or hash-based policy
 * when the app moves to dynamic rendering in a later milestone.
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
  `script-src 'self' 'unsafe-inline'${
    isProd ? "" : " 'unsafe-eval'"
  } https://www.googletagmanager.com https://www.clarity.ms`,
  "style-src 'self' 'unsafe-inline'",
  // Bottle images are served from the public Supabase Storage bucket.
  `img-src 'self' data: blob: https://www.google-analytics.com https://c.bing.com${
    supabase.imgSrc.length ? ` ${supabase.imgSrc.join(" ")}` : ""
  }`,
  "font-src 'self' data:",
  // ws: is the Next dev-server hot-reload socket; Chrome does not treat it as
  // covered by 'self'.
  `connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.clarity.ms${
    supabase.connectSrc.length ? ` ${supabase.connectSrc.join(" ")}` : ""
  }${isProd ? "" : " ws://localhost:* http://localhost:*"}`,
  // Would rewrite http://localhost to https during local development.
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

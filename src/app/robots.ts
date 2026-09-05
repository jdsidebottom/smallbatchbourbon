import type { MetadataRoute } from "next";
import { allowIndexing, site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Deliberately still `allow` while unlaunched, rather than `disallow: "/"`.
  // A crawler that is forbidden from fetching a page never reads its noindex,
  // and Google will list a blocked URL it found via a link anyway. Letting it
  // fetch and be told "do not index" is what actually keeps us out.
  if (!allowIndexing) {
    return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/go/"] }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/go/", "/not-eligible"] }],
    sitemap: new URL("/sitemap.xml", site.url).toString(),
  };
}

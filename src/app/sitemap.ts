import type { MetadataRoute } from "next";
import { listPublishedSlugs } from "@/lib/data/public-bottles";
import { site } from "@/lib/site";

export const revalidate = 3600;

const STATIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/bourbon", priority: 0.9 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.4 },
  { path: "/editorial-policy", priority: 0.4 },
  { path: "/affiliate-disclosure", priority: 0.3 },
  { path: "/advertising-policy", priority: 0.3 },
  { path: "/responsible-drinking", priority: 0.3 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map(({ path, priority }) => ({
    url: new URL(path, site.url).toString(),
    lastModified: now,
    priority,
  }));

  // Only published bottles come back — RLS decides, not this query.
  const bottles = await listPublishedSlugs();

  const bottleEntries = bottles.map(({ slug, updated_at }) => ({
    url: new URL(`/bourbon/${slug}`, site.url).toString(),
    lastModified: new Date(updated_at),
    priority: 0.8,
  }));

  return [...staticEntries, ...bottleEntries];
}

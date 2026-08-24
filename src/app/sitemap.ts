import type { MetadataRoute } from "next";
import { listPublishedSlugs } from "@/lib/data/public-bottles";
import { listPublishedArticleSlugs } from "@/lib/data/public-articles";
import { articlePath } from "@/lib/domain/article";
import { site } from "@/lib/site";

export const revalidate = 3600;

const STATIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/bourbon", priority: 0.9 },
  { path: "/what-wed-pay", priority: 0.9 },
  { path: "/at-the-store", priority: 0.7 },
  { path: "/best", priority: 0.9 },
  { path: "/alternatives", priority: 0.8 },
  { path: "/learn", priority: 0.7 },
  { path: "/gear", priority: 0.6 },
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

  // Only published records come back — RLS decides, not these queries.
  const [bottles, articles] = await Promise.all([
    listPublishedSlugs(),
    listPublishedArticleSlugs(),
  ]);

  const bottleEntries = bottles.map(({ slug, updated_at }) => ({
    url: new URL(`/bourbon/${slug}`, site.url).toString(),
    lastModified: new Date(updated_at),
    priority: 0.8,
  }));

  // Buying guides carry the highest commercial intent, so they outrank the
  // evergreen types here.
  const ARTICLE_PRIORITY: Record<string, number> = {
    buying_guide: 0.9,
    alternatives: 0.8,
    learn: 0.6,
    gear: 0.6,
    news: 0.5,
  };

  const articleEntries = articles.map(({ slug, article_type, updated_at }) => ({
    url: new URL(articlePath(article_type, slug), site.url).toString(),
    lastModified: new Date(updated_at),
    priority: ARTICLE_PRIORITY[article_type] ?? 0.5,
  }));

  return [...staticEntries, ...bottleEntries, ...articleEntries];
}

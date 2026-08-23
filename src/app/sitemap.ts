import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const ROUTES = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.4 },
  { path: "/editorial-policy", priority: 0.4 },
  { path: "/affiliate-disclosure", priority: 0.3 },
  { path: "/advertising-policy", priority: 0.3 },
  { path: "/responsible-drinking", priority: 0.3 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority }) => ({
    url: new URL(path, site.url).toString(),
    lastModified,
    priority,
  }));
}

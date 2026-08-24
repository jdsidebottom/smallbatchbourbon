import { site } from "@/lib/site";
import { ARTICLE_TYPE_LABELS, articlePath, type ArticleType } from "@/lib/domain/article";

/**
 * Structured data (PRD §20).
 *
 * The governing rule is the second half of that requirement: implement schema
 * "only where schema requirements are actually met; do not fabricate
 * offers/reviews/ratings". Two tempting types are therefore deliberately
 * absent, and should stay absent:
 *
 *  - **Product / Offer.** An Offer asserts a price and availability. We publish
 *    an editorial value ceiling and a reference price we verified on some past
 *    date — not what a shop is charging tonight. Emitting Offer would put a
 *    price claim in search results that the page itself refuses to make.
 *  - **Review / AggregateRating.** Both require a rating value. We publish
 *    verdicts and prose, not scores, and inventing a number to satisfy a schema
 *    is exactly the fabrication the PRD forbids.
 *
 * What is left is what we can state truthfully: who publishes the site, what an
 * article is, and where a page sits in the hierarchy.
 */

type JsonLd = Record<string, unknown>;

const organization = (): JsonLd => ({
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  description: site.description,
});

/** Site-level identity. Rendered once, on the home page. */
export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization(),
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        url: site.url,
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.path, site.url).toString(),
    })),
  };
}

/**
 * An editorial article. `dateModified` reflects the real last-reviewed date
 * where the editor has set one, falling back to the row's updated_at — never a
 * synthesised "freshness" date, which PRD §20 rules out explicitly.
 */
export function articleJsonLd(article: {
  slug: string;
  title: string;
  article_type: ArticleType;
  excerpt: string | null;
  published_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
}): JsonLd {
  const url = new URL(articlePath(article.article_type, article.slug), site.url).toString();

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    ...(article.excerpt ? { description: article.excerpt } : {}),
    url,
    mainEntityOfPage: url,
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    dateModified: article.reviewed_at ?? article.updated_at,
    articleSection: ARTICLE_TYPE_LABELS[article.article_type],
    author: { "@id": `${site.url}/#organization` },
    publisher: { "@id": `${site.url}/#organization` },
    isAccessibleForFree: true,
  };
}

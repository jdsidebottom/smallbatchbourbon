import { describe, expect, it } from "vitest";
import { articleJsonLd, breadcrumbJsonLd, websiteJsonLd } from "./structured-data";

const article = {
  slug: "bourbon-under-50",
  title: "Best Bourbon Under $50",
  article_type: "buying_guide" as const,
  excerpt: "Ten bottles worth the money.",
  published_at: "2026-08-01T00:00:00.000Z",
  reviewed_at: "2026-08-20",
  updated_at: "2026-08-23T10:00:00.000Z",
};

/**
 * The point of these tests is the absence, not the presence: PRD §20 forbids
 * fabricated offers, reviews and ratings, and a schema block is exactly where
 * one would get added by accident to win a rich result.
 */
const FORBIDDEN = ["Offer", "offers", "price", "priceCurrency", "availability", "Review", "reviewRating", "AggregateRating", "aggregateRating", "ratingValue", "Product"];

function assertNoCommerceClaims(payload: unknown) {
  const json = JSON.stringify(payload);
  for (const term of FORBIDDEN) {
    expect(json).not.toContain(`"${term}"`);
  }
}

describe("websiteJsonLd", () => {
  it("describes the publisher and the site", () => {
    const data = websiteJsonLd();
    const graph = data["@graph"] as Record<string, unknown>[];
    expect(graph.map((n) => n["@type"])).toEqual(["Organization", "WebSite"]);
  });

  it("claims no prices, offers or ratings", () => {
    assertNoCommerceClaims(websiteJsonLd());
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers positions from 1 and resolves absolute URLs", () => {
    const data = breadcrumbJsonLd([
      { name: "Bourbon", path: "/bourbon" },
      { name: "Eagle Rare", path: "/bourbon/eagle-rare" },
    ]);
    const items = data.itemListElement as Record<string, unknown>[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(String(items[1].item)).toMatch(/^https?:\/\/.+\/bourbon\/eagle-rare$/);
  });

  it("claims no prices, offers or ratings", () => {
    assertNoCommerceClaims(
      breadcrumbJsonLd([{ name: "Bourbon", path: "/bourbon" }]),
    );
  });
});

describe("articleJsonLd", () => {
  it("marks it up as an Article, not a Product", () => {
    const data = articleJsonLd(article);
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("Best Bourbon Under $50");
    expect(String(data.url)).toContain("/best/bourbon-under-50");
  });

  it("prefers the real last-reviewed date over updated_at", () => {
    // PRD §20: last-reviewed dates represent real editorial review, never
    // synthesised freshness.
    expect(articleJsonLd(article).dateModified).toBe("2026-08-20");
  });

  it("falls back to updated_at only when no review date was recorded", () => {
    expect(articleJsonLd({ ...article, reviewed_at: null }).dateModified).toBe(
      "2026-08-23T10:00:00.000Z",
    );
  });

  it("omits datePublished rather than inventing one", () => {
    const data = articleJsonLd({ ...article, published_at: null });
    expect(data).not.toHaveProperty("datePublished");
  });

  it("omits description rather than emitting an empty one", () => {
    const data = articleJsonLd({ ...article, excerpt: null });
    expect(data).not.toHaveProperty("description");
  });

  it("claims no prices, offers or ratings", () => {
    assertNoCommerceClaims(articleJsonLd(article));
  });
});

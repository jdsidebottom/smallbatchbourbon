import { describe, expect, it } from "vitest";
import {
  articlePath,
  articleSchema,
  guideItemSchema,
  isGuideType,
  scoreArticleCompleteness,
  type ArticleCompletenessInput,
} from "./article";

describe("articlePath", () => {
  it("uses the SEO route prefix required by the PRD", () => {
    expect(articlePath("buying_guide", "bourbon-under-50")).toBe("/best/bourbon-under-50");
    expect(articlePath("alternatives", "blantons")).toBe("/alternatives/blantons");
    expect(articlePath("learn", "what-is-bottled-in-bond")).toBe(
      "/learn/what-is-bottled-in-bond",
    );
    expect(articlePath("gear", "best-glencairn")).toBe("/gear/best-glencairn");
  });
});

describe("isGuideType", () => {
  it("treats only bottle-recommending types as guides", () => {
    expect(isGuideType("buying_guide")).toBe(true);
    expect(isGuideType("alternatives")).toBe(true);
    expect(isGuideType("learn")).toBe(false);
    expect(isGuideType("gear")).toBe(false);
    expect(isGuideType("news")).toBe(false);
  });
});

describe("articleSchema", () => {
  const valid = {
    slug: "bourbon-under-50",
    title: "Best Bourbon Under $50",
    articleType: "buying_guide" as const,
    excerpt: "Ten bottles worth the money.",
    reviewedAt: "2026-08-23",
  };

  it("accepts a well-formed guide", () => {
    expect(articleSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a slug containing a slash", () => {
    // The route prefix comes from article_type, so a slug is one path segment.
    const result = articleSchema.safeParse({ ...valid, slug: "best/bourbon-under-50" });
    expect(result.success).toBe(false);
  });

  it("rejects a meta description that will be truncated in results", () => {
    const result = articleSchema.safeParse({ ...valid, excerpt: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("requires alt text alongside a hero image", () => {
    const result = articleSchema.safeParse({ ...valid, heroImagePath: "guides/a.jpg" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["heroImageAlt"]);
    }
  });

  it("rejects a malformed review date", () => {
    expect(articleSchema.safeParse({ ...valid, reviewedAt: "23/08/2026" }).success).toBe(false);
  });

  it("normalises blank optional fields to null", () => {
    const result = articleSchema.parse({ ...valid, intro: "  ", methodology: "" });
    expect(result.intro).toBeNull();
    expect(result.methodology).toBeNull();
  });
});

describe("guideItemSchema", () => {
  const bottleId = "00000000-0000-4000-8000-000000000001";

  it("accepts a pick", () => {
    expect(guideItemSchema.safeParse({ bottleId, label: "Best overall" }).success).toBe(true);
  });

  it("requires a real bottle id rather than a typed-in name", () => {
    expect(guideItemSchema.safeParse({ bottleId: "eagle-rare" }).success).toBe(false);
  });

  it("rejects a label too long to render as a badge", () => {
    expect(guideItemSchema.safeParse({ bottleId, label: "x".repeat(61) }).success).toBe(false);
  });

  it("normalises a blank rationale to null", () => {
    expect(guideItemSchema.parse({ bottleId, rationale: "   " }).rationale).toBeNull();
  });
});

describe("scoreArticleCompleteness", () => {
  const guide: ArticleCompletenessInput = {
    article: {
      title: "Best Bourbon Under $50",
      slug: "bourbon-under-50",
      articleType: "buying_guide",
      excerpt: "Ten bottles worth the money.",
      intro: "Here is what we would actually buy.",
      methodology: "We weighted taste, value, availability and consistency.",
      reviewedAt: "2026-08-23",
    },
    publishedItemCount: 5,
    unpublishedItemCount: 0,
    itemsMissingRationale: 0,
  };

  it("clears a complete guide for publication", () => {
    const report = scoreArticleCompleteness(guide);
    expect(report.canPublish).toBe(true);
    expect(report.missingRequired).toEqual([]);
  });

  it("blocks a guide with no picks", () => {
    const report = scoreArticleCompleteness({ ...guide, publishedItemCount: 0 });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("picks");
  });

  it("blocks a guide whose pick points at an unpublished bottle", () => {
    // RLS would return nothing for that bottle, so the pick renders as a hole.
    const report = scoreArticleCompleteness({ ...guide, unpublishedItemCount: 1 });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("picks_live");
  });

  it("blocks a guide with an unexplained pick", () => {
    const report = scoreArticleCompleteness({ ...guide, itemsMissingRationale: 1 });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("rationales");
  });

  it("blocks a guide that states no methodology", () => {
    const report = scoreArticleCompleteness({
      ...guide,
      article: { ...guide.article, methodology: null },
    });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("methodology");
  });

  it("requires a real last-reviewed date", () => {
    const report = scoreArticleCompleteness({
      ...guide,
      article: { ...guide.article, reviewedAt: null },
    });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("reviewed_at");
  });

  it("asks a Learn page for body copy and sources, not picks or methodology", () => {
    const learn: ArticleCompletenessInput = {
      article: {
        title: "What bottled-in-bond means",
        slug: "what-is-bottled-in-bond",
        articleType: "learn",
        excerpt: "Four legal requirements, plainly explained.",
        intro: "The label is a legal claim, not marketing.",
        body: "The Bottled-in-Bond Act sets four conditions.",
        reviewedAt: "2026-08-23",
      },
      sourceCount: 2,
    };

    const report = scoreArticleCompleteness(learn);
    expect(report.canPublish).toBe(true);
    expect(report.fields.map((f) => f.key)).not.toContain("picks");
    expect(report.fields.find((f) => f.key === "methodology")?.requiredToPublish).toBe(false);
    expect(report.fields.find((f) => f.key === "body")?.requiredToPublish).toBe(true);
  });

  it("blocks a Learn page with no cited sources", () => {
    const report = scoreArticleCompleteness({
      article: {
        title: "What bottled-in-bond means",
        slug: "what-is-bottled-in-bond",
        articleType: "learn",
        excerpt: "Four legal requirements.",
        intro: "The label is a legal claim.",
        body: "Four conditions apply.",
        reviewedAt: "2026-08-23",
      },
      sourceCount: 0,
    });

    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("sources");
  });

  it("scores a bare draft low without throwing", () => {
    const report = scoreArticleCompleteness({ article: { articleType: "learn" } });
    expect(report.score).toBe(0);
    expect(report.canPublish).toBe(false);
  });
});

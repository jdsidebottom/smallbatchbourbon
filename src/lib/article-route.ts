import "server-only";

import type { Metadata } from "next";
import {
  getPublishedArticle,
  listPublishedArticleSlugs,
  type PublicArticle,
} from "@/lib/data/public-articles";
import { ARTICLE_TYPE_LABELS, articlePath, type ArticleType } from "@/lib/domain/article";
import { richTextToPlain } from "@/lib/domain/richtext";
import { site } from "@/lib/site";

/**
 * Shared plumbing for the four editorial route groups (/best, /alternatives,
 * /learn, /gear). The routes differ only in which article_type they serve, so
 * the static params, metadata and lookup live here rather than being copied
 * four times and drifting.
 */

export async function articleStaticParams(type: ArticleType) {
  const articles = await listPublishedArticleSlugs();
  return articles.filter((a) => a.article_type === type).map(({ slug }) => ({ slug }));
}

export async function articleMetadata(type: ArticleType, slug: string): Promise<Metadata> {
  const article = await getPublishedArticle(type, slug);
  if (!article) return { title: "Not found" };

  // Fall back to the intro rather than shipping no description at all — the
  // completeness gate requires an excerpt to publish, so this is belt and
  // braces for anything published before that gate existed.
  const description =
    article.excerpt ?? richTextToPlain(article.intro ?? article.body, 155) ?? undefined;

  const url = `${site.url}${articlePath(type, slug)}`;

  return {
    title: article.title,
    description,
    alternates: { canonical: articlePath(type, slug) },
    openGraph: {
      type: "article",
      title: `${article.title} — ${site.name}`,
      description,
      url,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
    },
  };
}

export async function loadArticle(
  type: ArticleType,
  slug: string,
): Promise<PublicArticle | null> {
  return getPublishedArticle(type, slug);
}

export const ARTICLE_INDEX_COPY: Record<
  ArticleType,
  { eyebrow: string; title: string; intro: string; empty: string }
> = {
  buying_guide: {
    eyebrow: "Buying guides",
    title: "What's actually worth buying.",
    intro:
      "Shortlists built from the same bottle records as every review on this site — so when a bottle changes, the guide changes with it.",
    empty: "No buying guides are published yet.",
  },
  alternatives: {
    eyebrow: "Alternatives",
    title: "Don't chase the hype.",
    intro:
      "When a bottle is impossible to find at a sane price, these are the ones we'd buy instead — and why.",
    empty: "No alternatives guides are published yet.",
  },
  learn: {
    eyebrow: "Learn",
    title: "Bourbon, explained plainly.",
    intro:
      "What the words on the label actually mean, without the folklore. Everything here cites its sources.",
    empty: "No Learn pages are published yet.",
  },
  gear: {
    eyebrow: "Gear",
    title: "Glassware and kit worth owning.",
    intro: "A short list of things that genuinely improve how you drink bourbon at home.",
    empty: "No Gear pages are published yet.",
  },
  news: {
    eyebrow: "News",
    title: "What changed this week.",
    intro: "Releases, price moves and label changes that affect what a bottle is worth.",
    empty: "No news is published yet.",
  },
};

export const articleTypeLabel = (type: ArticleType) => ARTICLE_TYPE_LABELS[type];

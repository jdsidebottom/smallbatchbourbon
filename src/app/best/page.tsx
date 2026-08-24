import type { Metadata } from "next";
import { ArticleIndex } from "@/components/article/ArticleIndex";
import { ARTICLE_INDEX_COPY } from "@/lib/article-route";
import { listPublishedArticles } from "@/lib/data/public-articles";

const TYPE = "buying_guide" as const;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: ARTICLE_INDEX_COPY[TYPE].eyebrow,
  description: ARTICLE_INDEX_COPY[TYPE].intro,
  alternates: { canonical: "/best" },
};

export default async function Page() {
  const articles = await listPublishedArticles(TYPE);
  return <ArticleIndex type={TYPE} articles={articles} />;
}

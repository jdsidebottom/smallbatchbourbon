import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article/ArticleView";
import { articleMetadata, articleStaticParams, loadArticle } from "@/lib/article-route";

const TYPE = "buying_guide" as const;

// Editorial pages are statically generated and revalidated, like bottle pages.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return articleStaticParams(TYPE);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata(TYPE, slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadArticle(TYPE, slug);
  if (!article) notFound();

  return <ArticleView article={article} />;
}

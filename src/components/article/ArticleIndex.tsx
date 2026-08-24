import Link from "next/link";
import { articlePath, type ArticleType } from "@/lib/domain/article";
import { ARTICLE_INDEX_COPY } from "@/lib/article-route";
import type { PublicArticleSummary } from "@/lib/data/public-articles";

/**
 * Index for one editorial type. Shared by /best, /alternatives, /learn and
 * /gear — they differ only in copy and in which articles they list.
 */
export function ArticleIndex({
  type,
  articles,
}: {
  type: ArticleType;
  articles: PublicArticleSummary[];
}) {
  const copy = ARTICLE_INDEX_COPY[type];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">{copy.title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream-dim">{copy.intro}</p>

      {articles.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-ink-line p-10 text-center">
          <p className="text-cream-dim">{copy.empty}</p>
          <p className="mt-3 text-sm text-cream-muted">
            We&apos;d rather publish nothing than pad this page out.{" "}
            <Link href="/#weekly-pour" className="text-amber underline underline-offset-4">
              Get The Weekly Pour
            </Link>{" "}
            and you&apos;ll hear when the first ones land.
          </p>
        </div>
      ) : (
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                href={articlePath(article.article_type, article.slug)}
                className="flex h-full flex-col rounded-2xl border border-ink-line bg-ink-card p-5 transition hover:border-amber/50"
              >
                <span className="font-display text-lg text-cream">{article.title}</span>
                {article.excerpt && (
                  <span className="mt-2 text-sm leading-relaxed text-cream-dim">
                    {article.excerpt}
                  </span>
                )}
                {article.reviewed_at && (
                  <span className="mt-auto pt-4 text-xs tracking-[0.12em] text-cream-muted uppercase">
                    Reviewed{" "}
                    {new Date(article.reviewed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

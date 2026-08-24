import Link from "next/link";
import { GuidePickCard } from "@/components/article/GuidePickCard";
import { RichText } from "@/components/article/RichText";
import { JsonLd } from "@/components/JsonLd";
import {
  ARTICLE_TYPE_LABELS,
  ARTICLE_ROUTE_PREFIX,
  TOP_PICK_COUNT,
  articlePath,
  isGuideType,
} from "@/lib/domain/article";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import type { PublicArticle } from "@/lib/data/public-articles";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

/**
 * One renderer for every editorial type. A buying guide and a Learn page differ
 * in what they contain, not in how they are laid out, so they share this rather
 * than drifting apart across four near-identical route files.
 */
export function ArticleView({ article }: { article: PublicArticle }) {
  const guide = isGuideType(article.article_type);
  const topPicks = article.picks.slice(0, TOP_PICK_COUNT);
  const rest = article.picks.slice(TOP_PICK_COUNT);

  return (
    <article className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd
        data={breadcrumbJsonLd([
          {
            name: ARTICLE_TYPE_LABELS[article.article_type],
            path: ARTICLE_ROUTE_PREFIX[article.article_type],
          },
          { name: article.title, path: articlePath(article.article_type, article.slug) },
        ])}
      />

      <header className="mx-auto max-w-3xl">
        <p className="eyebrow">{ARTICLE_TYPE_LABELS[article.article_type]}</p>
        <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">{article.title}</h1>

        {article.intro && <RichText source={article.intro} className="mt-6 text-lg" />}

        {article.reviewed_at && (
          <p className="mt-6 text-xs tracking-[0.14em] text-cream-muted uppercase">
            Last reviewed {formatDate(article.reviewed_at)}
          </p>
        )}
      </header>

      {guide && article.picks.length > 0 && (
        <>
          {/* Top picks first, so a reader who came for a recommendation gets one
              without scrolling past the methodology. */}
          <section aria-labelledby="top-picks" className="mt-14">
            <h2 id="top-picks" className="font-display text-2xl text-cream">
              {topPicks.length === article.picks.length ? "Our picks" : "Start here"}
            </h2>
            <ul className="mt-6 grid gap-4 lg:grid-cols-3">
              {topPicks.map((pick) => (
                <li key={pick.id}>
                  <GuidePickCard pick={pick} guideSlug={article.slug} featured />
                </li>
              ))}
            </ul>
          </section>

          {rest.length > 0 && (
            <section aria-labelledby="also-worth-it" className="mt-14">
              <h2 id="also-worth-it" className="font-display text-2xl text-cream">
                Also worth your money
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {rest.map((pick) => (
                  <li key={pick.id}>
                    <GuidePickCard pick={pick} guideSlug={article.slug} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {article.body && (
        <div className="mx-auto mt-16 max-w-3xl">
          <RichText source={article.body} />
        </div>
      )}

      {article.methodology && (
        <section
          aria-labelledby="methodology"
          className="mx-auto mt-16 max-w-3xl rounded-2xl border border-ink-line bg-ink-raised p-6 sm:p-8"
        >
          <h2 id="methodology" className="font-display text-xl text-cream">
            How we judged these
          </h2>
          <RichText source={article.methodology} className="mt-4 text-base" />
          <p className="mt-6 text-sm leading-relaxed text-cream-muted">
            Prices shown are our editorial value thresholds and the last reference price we
            verified — not live retail pricing. Check the shelf price against them with{" "}
            <Link href="/at-the-store" className="text-amber underline underline-offset-4">
              Liquor Store Mode
            </Link>
            .
          </p>
        </section>
      )}
    </article>
  );
}

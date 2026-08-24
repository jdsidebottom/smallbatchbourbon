import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listArticles } from "@/lib/data/articles";
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_LABELS,
  articlePath,
  isGuideType,
} from "@/lib/domain/article";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-ink-line text-cream-muted",
  review: "border-verdict-fair/50 text-verdict-fair",
  published: "border-verdict-steal/50 text-verdict-steal",
  archived: "border-ink-line text-cream-muted",
};

export default async function ContentPage() {
  await requireAdmin();
  const articles = await listArticles();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cream">Content</h1>
          <p className="mt-1 text-sm text-cream-muted">
            {articles.length} article{articles.length === 1 ? "" : "s"} — buying guides,
            alternatives, Learn and Gear.
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex min-h-11 items-center rounded-full bg-amber px-6 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
        >
          New article
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-ink-line p-10 text-center text-cream-muted">
          Nothing written yet. A buying guide is the fastest way to put existing bottle records to
          work.
        </p>
      ) : (
        // Grouped by type so an editor sees the shape of the content set rather
        // than one undifferentiated list.
        <div className="mt-10 space-y-10">
          {ARTICLE_TYPES.map((type) => {
            const group = articles.filter((article) => article.article_type === type);
            if (group.length === 0) return null;

            return (
              <section key={type}>
                <h2 className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">
                  {ARTICLE_TYPE_LABELS[type]}
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.map((article) => (
                    <li key={article.id}>
                      <Link
                        href={`/admin/content/${article.id}`}
                        className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-ink-line bg-ink-raised p-4 transition hover:border-amber/50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-cream">{article.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-cream-muted">
                            {articlePath(article.article_type, article.slug)}
                            {isGuideType(article.article_type) && (
                              <> · {article.itemCount} pick{article.itemCount === 1 ? "" : "s"}</>
                            )}
                          </span>
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-[0.65rem] tracking-[0.14em] uppercase ${
                            STATUS_STYLES[article.status] ?? STATUS_STYLES.draft
                          }`}
                        >
                          {article.status}
                        </span>

                        <span className="w-28 text-right text-xs text-cream-muted">
                          {article.completenessScore}% complete
                          {article.missingRequired > 0 && (
                            <span className="mt-0.5 block text-verdict-maybe">
                              {article.missingRequired} required missing
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

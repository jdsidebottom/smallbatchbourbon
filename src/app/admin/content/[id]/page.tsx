import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getArticle, listBottleOptions } from "@/lib/data/articles";
import {
  addArticleSource,
  addGuideItem,
  deleteArticleSource,
  deleteGuideItem,
  moveGuideItem,
  saveArticle,
  setArticleStatus,
  updateGuideItem,
} from "@/app/admin/content/actions";
import { ArticleIdentityForm, ArticleSourceForm } from "@/components/admin/ArticleForms";
import { GuideBuilder } from "@/components/admin/GuideBuilder";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PublishPanel } from "@/components/admin/PublishPanel";
import { articlePath, isGuideType } from "@/lib/domain/article";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const detail = await getArticle(id);
  if (!detail) notFound();

  const { article, items, sources, completeness } = detail;
  const guide = isGuideType(article.article_type);
  const bottles = guide ? await listBottleOptions() : [];
  const path = articlePath(article.article_type, article.slug);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin/content" className="text-sm text-cream-muted hover:text-cream">
        ← Content
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-cream">{article.title}</h1>
        <span className="text-sm text-cream-muted">
          {article.status === "published" ? (
            <Link href={path} className="text-amber underline underline-offset-4">
              {path}
            </Link>
          ) : (
            path
          )}{" "}
          · {article.status}
        </span>
      </div>

      <div className="mt-8 space-y-6">
        <PublishPanel
          status={article.status}
          completeness={completeness}
          setStatus={setArticleStatus.bind(null, id)}
        />

        <ArticleIdentityForm article={article} action={saveArticle.bind(null, id)} />

        {guide && (
          <GuideBuilder
            items={items}
            bottles={bottles}
            addItem={addGuideItem.bind(null, id)}
            updateItem={updateGuideItem.bind(null, id)}
            deleteItem={deleteGuideItem.bind(null, id)}
            moveItem={moveGuideItem.bind(null, id)}
          />
        )}

        {!guide && (
          <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl text-cream">Sources</h2>
              <span className="text-sm text-cream-muted">{sources.length}</span>
            </div>

            {sources.length === 0 ? (
              <p className="mt-4 text-sm text-cream-muted">
                None recorded. A Learn or Gear page cannot be published without at least one.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-ink-line">
                {sources.map((source) => (
                  <li key={source.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="min-w-0 flex-1 text-sm text-cream-dim">
                      {source.url ? (
                        <a
                          href={source.url}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                          className="text-amber underline underline-offset-4"
                        >
                          {source.title ?? source.url}
                        </a>
                      ) : (
                        (source.title ?? "Untitled source")
                      )}
                      <span className="mt-0.5 block text-xs text-cream-muted">
                        {source.source_type} · verified {source.verified_at}
                      </span>
                    </span>
                    <DeleteButton onDelete={deleteArticleSource.bind(null, id, source.id)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!guide && <ArticleSourceForm action={addArticleSource.bind(null, id)} />}
      </div>
    </div>
  );
}

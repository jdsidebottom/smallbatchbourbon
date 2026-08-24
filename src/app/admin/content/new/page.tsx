import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { saveArticle } from "@/app/admin/content/actions";
import { ArticleIdentityForm } from "@/components/admin/ArticleForms";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin/content" className="text-sm text-cream-muted hover:text-cream">
        ← Content
      </Link>
      <h1 className="mt-4 font-display text-3xl text-cream">New article</h1>
      <p className="mt-2 text-sm leading-relaxed text-cream-dim">
        Created as a draft. For a guide, the bottle picks are added on the next screen.
      </p>

      <div className="mt-8">
        <ArticleIdentityForm article={null} action={saveArticle.bind(null, null)} />
      </div>
    </div>
  );
}

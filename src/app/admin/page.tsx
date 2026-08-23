import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function counts() {
  const supabase = createAdminClient();
  const [bottles, published, drafts, brands, retailers, articles] = await Promise.all([
    supabase.from("bottles").select("id", { count: "exact", head: true }),
    supabase.from("bottles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("bottles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("retailers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("articles").select("id", { count: "exact", head: true }),
  ]);

  return {
    bottles: bottles.count ?? 0,
    published: published.count ?? 0,
    drafts: drafts.count ?? 0,
    brands: brands.count ?? 0,
    retailers: retailers.count ?? 0,
    articles: articles.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const identity = await requireAdmin();
  const stats = await counts();

  const supabase = createAdminClient();
  const { data: recent } = await supabase
    .from("audit_log")
    .select("id, entity_table, entity_id, action, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const tiles = [
    { label: "Bottles", value: stats.bottles, href: "/admin/bottles" },
    { label: "Published", value: stats.published, href: "/admin/bottles" },
    { label: "Drafts", value: stats.drafts, href: "/admin/bottles" },
    { label: "Brands", value: stats.brands, href: "/admin/brands" },
    { label: "Active retailers", value: stats.retailers, href: "/admin" },
    { label: "Articles", value: stats.articles, href: "/admin" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl text-cream">Dashboard</h1>
      <p className="mt-1 text-sm text-cream-muted">
        Signed in as {identity.displayName ?? identity.email}
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className="block rounded-xl border border-ink-line bg-ink-raised p-4 transition hover:border-amber/50"
            >
              <span className="font-display text-2xl text-cream">{tile.value}</span>
              <span className="mt-1 block text-xs tracking-[0.12em] text-cream-muted uppercase">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2 className="font-display text-xl text-cream">Recent editorial activity</h2>
        {!recent || recent.length === 0 ? (
          <p className="mt-3 text-sm text-cream-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-line">
            {recent.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <span className="w-20 text-xs tracking-[0.12em] text-amber uppercase">
                  {entry.action}
                </span>
                <span className="flex-1 text-cream-dim">{entry.entity_table}</span>
                <time className="text-xs text-cream-muted" dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

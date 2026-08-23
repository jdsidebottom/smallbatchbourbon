import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listBottles } from "@/lib/data/bottles";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-ink-line text-cream-muted",
  review: "border-verdict-fair/50 text-verdict-fair",
  published: "border-verdict-steal/50 text-verdict-steal",
  archived: "border-ink-line text-cream-muted",
};

export default async function BottlesPage() {
  await requireAdmin();
  const bottles = await listBottles();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cream">Bottles</h1>
          <p className="mt-1 text-sm text-cream-muted">
            {bottles.length} record{bottles.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/bottles/new"
          className="inline-flex min-h-11 items-center rounded-full bg-amber px-6 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
        >
          New bottle
        </Link>
      </div>

      {bottles.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-ink-line p-10 text-center text-cream-muted">
          No bottles yet. Create the first record to get started.
        </p>
      ) : (
        <ul className="mt-8 space-y-2">
          {bottles.map((bottle) => (
            <li key={bottle.id}>
              <Link
                href={`/admin/bottles/${bottle.id}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-ink-line bg-ink-raised p-4 transition hover:border-amber/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-cream">{bottle.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-cream-muted">
                    {bottle.brands?.name ?? "—"} · /bourbon/{bottle.slug}
                  </span>
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-[0.65rem] tracking-[0.14em] uppercase ${
                    STATUS_STYLES[bottle.status] ?? STATUS_STYLES.draft
                  }`}
                >
                  {bottle.status}
                </span>

                <span className="w-28 text-right text-xs text-cream-muted">
                  {bottle.completenessScore}% complete
                  {bottle.missingRequired > 0 && (
                    <span className="mt-0.5 block text-verdict-maybe">
                      {bottle.missingRequired} required missing
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

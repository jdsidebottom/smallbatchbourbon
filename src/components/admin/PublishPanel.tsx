"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/bottles/actions";
import type { CompletenessReport } from "@/lib/domain/completeness";

export function PublishPanel({
  status,
  completeness,
  setStatus,
}: {
  status: string;
  completeness: CompletenessReport;
  setStatus: (status: "draft" | "review" | "published" | "archived") => Promise<ActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = (next: "draft" | "review" | "published" | "archived") => {
    startTransition(async () => {
      setResult(await setStatus(next));
    });
  };

  return (
    <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl text-cream">Publication</h2>
        <span className="text-sm text-cream-muted">{completeness.score}% complete</span>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-card"
        role="progressbar"
        aria-valuenow={completeness.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Record completeness"
      >
        <div
          className="h-full rounded-full bg-amber transition-all"
          style={{ width: `${completeness.score}%` }}
        />
      </div>

      {completeness.missingRequired.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-cream-dim">Required before publishing:</p>
          <ul className="mt-2 space-y-1">
            {completeness.missingRequired.map((field) => (
              <li key={field.key} className="text-sm text-verdict-maybe">
                · {field.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {status !== "published" ? (
          <button
            type="button"
            onClick={() => run("published")}
            disabled={pending || !completeness.canPublish}
            title={completeness.canPublish ? undefined : "Fill in the required fields first."}
            className="min-h-11 rounded-full bg-amber px-6 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Working…" : "Publish"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run("draft")}
            disabled={pending}
            className="min-h-11 rounded-full border border-ink-line px-6 text-sm font-semibold tracking-[0.12em] text-cream uppercase transition hover:border-amber hover:text-amber disabled:opacity-50"
          >
            {pending ? "Working…" : "Unpublish"}
          </button>
        )}

        {status !== "archived" && (
          <button
            type="button"
            onClick={() => run("archived")}
            disabled={pending}
            className="min-h-11 rounded-full border border-ink-line px-5 text-sm text-cream-muted transition hover:border-cream-muted hover:text-cream disabled:opacity-50"
          >
            Archive
          </button>
        )}
      </div>

      {result && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-4 text-sm ${result.ok ? "text-verdict-steal" : "text-verdict-walk"}`}
        >
          {result.message}
        </p>
      )}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/bottles/actions";

/**
 * Removal of a linked record. Surfaces the failure rather than swallowing it,
 * which a bare `<form action={…}>` would do.
 */
export function DeleteButton({
  onDelete,
  label = "Remove",
}: {
  onDelete: () => Promise<ActionResult>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await onDelete();
            setError(result.ok ? null : result.message);
          })
        }
        className="min-h-9 rounded-full border border-ink-line px-4 text-xs text-cream-muted transition hover:border-verdict-walk hover:text-verdict-walk disabled:opacity-50"
      >
        {pending ? "Removing…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-verdict-walk">
          {error}
        </p>
      )}
    </div>
  );
}

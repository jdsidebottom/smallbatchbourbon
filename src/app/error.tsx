"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col justify-center px-5 py-20">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
        We spilled something.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-cream-dim">
        An unexpected error stopped this page from loading. Try again — and if it keeps
        happening, we&apos;d like to know.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-amber px-7 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-ink-line px-7 text-sm font-semibold tracking-[0.12em] text-cream uppercase transition hover:border-amber hover:text-amber"
        >
          Back home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs text-cream-muted">Reference: {error.digest}</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/domain/bottle";
import { track } from "@/lib/analytics";

type Result = {
  slug: string;
  name: string;
  brand: string | null;
  classification: string | null;
  proof: number | null;
  buyMaxCents: number | null;
};

/**
 * Bottle autocomplete, built as a WAI-ARIA combobox so it is usable from the
 * keyboard and announced correctly by a screen reader.
 */
export function BottleSearch({
  placeholder = "Search a bottle…",
  autoFocus = false,
  event = "bottle_search",
}: {
  placeholder?: string;
  autoFocus?: boolean;
  event?: "bottle_search" | "store_mode_search";
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  // Results for a query that is no longer current must never be shown, so the
  // visible list is derived rather than stored — clearing it from inside the
  // effect would mean an extra render pass on every keystroke.
  const visible = tooShort ? [] : results;

  useEffect(() => {
    if (tooShort) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { results?: Result[] };
        setResults(body.results ?? []);
        setOpen(true);
        setActive(-1);
        track(event, { query_length: trimmed.length, results: body.results?.length ?? 0 });
      } catch {
        // Aborted or offline — leave the previous results in place.
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed, tooShort, event]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/bourbon/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || visible.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(visible[active].slug);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={open && !tooShort}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Search bottles"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => visible.length > 0 && setOpen(true)}
        className="min-h-12 w-full rounded-full border border-ink-line bg-ink-card px-5 text-[16px] text-cream placeholder:text-cream-muted focus:border-amber"
      />

      {open && !tooShort && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-ink-line bg-ink-raised py-1 shadow-2xl"
        >
          {visible.length === 0 ? (
            <li className="px-5 py-4 text-sm text-cream-muted">
              {loading ? "Searching…" : "No bottles match that yet."}
            </li>
          ) : (
            visible.map((result, index) => (
              <li key={result.slug} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(result.slug)}
                  className={`flex min-h-12 w-full items-center justify-between gap-4 px-5 py-2 text-left transition ${
                    index === active ? "bg-ink-card text-cream" : "text-cream-dim"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{result.name}</span>
                    {result.brand && (
                      <span className="block truncate text-xs text-cream-muted">{result.brand}</span>
                    )}
                  </span>
                  {result.buyMaxCents !== null && (
                    <span className="shrink-0 text-xs text-amber">
                      {formatCents(result.buyMaxCents)}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

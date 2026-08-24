"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { VERDICT_LABELS, dollarsToCents, formatCents } from "@/lib/domain/bottle";
import { evaluateVerdict, type PriceLadder } from "@/lib/domain/verdict";
import type { VerdictBand } from "@/lib/domain/bottle";

type Hit = {
  slug: string;
  name: string;
  brand: string | null;
  classification: string | null;
  proof: number | null;
  ladder: PriceLadder | null;
  msrpCents: number | null;
  editorialNote: string | null;
};

type Alternative = {
  slug: string;
  name: string;
  brand: string | null;
  note: string | null;
  buyMaxCents: number | null;
};

const BAND_COLOR: Record<VerdictBand, string> = {
  steal: "var(--color-verdict-steal)",
  buy: "var(--color-verdict-buy)",
  fair: "var(--color-verdict-fair)",
  maybe: "var(--color-verdict-maybe)",
  walk_away: "var(--color-verdict-walk)",
};

/** One line telling the shopper what to do, not how we feel about it. */
const BAND_LINE: Record<VerdictBand, string> = {
  steal: "Buy it. That's a better price than we'd expect to find.",
  buy: "Buy it. That's a fair price for what's in the bottle.",
  fair: "Reasonable. Not a steal, but you won't feel silly.",
  maybe: "Your call. There's usually better value on the same shelf.",
  walk_away: "Walk away. That's more than this bottle is worth.",
};

/**
 * Liquor Store Mode (PRD §10). Three steps: find the bottle, type the shelf
 * price, get a verdict.
 *
 * The verdict is computed on the device from the ladder that shipped with the
 * search result, so it appears the instant the shopper stops typing — no second
 * round trip while they're standing in an aisle on one bar of signal.
 */
export function StoreMode() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [price, setPrice] = useState("");
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  useEffect(() => {
    if (tooShort || selected) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { results?: Hit[] };
        setHits(body.results ?? []);
        track("store_mode_search", {
          query_length: trimmed.length,
          results: body.results?.length ?? 0,
        });
      } catch {
        // Aborted or offline — keep whatever we already showed.
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed, tooShort, selected]);

  const choose = (hit: Hit) => {
    setSelected(hit);
    setHits([]);
    setPrice("");
    setAlternatives(null);
    // Focus the price field so the shopper can type straight away.
    setTimeout(() => priceRef.current?.focus(), 0);
  };

  const reset = () => {
    setSelected(null);
    setQuery("");
    setHits([]);
    setPrice("");
    setAlternatives(null);
  };

  const shelfCents = dollarsToCents(price);
  const ladder = selected?.ladder ?? null;
  const verdict: VerdictBand | null =
    ladder && shelfCents !== null && shelfCents > 0 ? evaluateVerdict(shelfCents, ladder) : null;

  // Alternatives are only worth the reader's attention when the answer is
  // "probably not". Once fetched they are cached, but they are only *shown*
  // while the current verdict still warrants them — otherwise lowering the
  // price to a Steal would leave "better on the same shelf" contradicting the
  // verdict directly above it.
  const wantsAlternatives =
    verdict === "fair" || verdict === "maybe" || verdict === "walk_away";

  useEffect(() => {
    if (!selected || !verdict || !wantsAlternatives) return;
    if (alternatives !== null) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/bottles/${selected.slug}/alternatives`);
        const body = (await response.json()) as { alternatives?: Alternative[] };
        if (!cancelled) setAlternatives(body.alternatives ?? []);
      } catch {
        if (!cancelled) setAlternatives([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, verdict, wantsAlternatives, alternatives]);

  const checkedRef = useRef<string>("");
  useEffect(() => {
    if (!selected || !verdict || shelfCents === null) return;
    const key = `${selected.slug}:${shelfCents}:${verdict}`;
    if (checkedRef.current === key) return;
    checkedRef.current = key;
    track("store_mode_price_checked", {
      bottle: selected.slug,
      verdict,
      shelf_price_cents: shelfCents,
    });
  }, [selected, verdict, shelfCents]);

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-2xl text-cream">At the store</h1>
        <Link href="/" className="text-xs tracking-[0.12em] text-cream-muted uppercase hover:text-cream">
          Exit
        </Link>
      </div>

      {/* ------------------------------------------------- step 1: bottle */}
      {!selected ? (
        <div className="mt-6">
          <label htmlFor="store-search" className="text-xs tracking-[0.14em] text-cream-muted uppercase">
            1 · Which bottle?
          </label>
          <input
            id="store-search"
            type="search"
            inputMode="search"
            autoFocus
            autoComplete="off"
            placeholder="Start typing a name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-3 min-h-14 w-full rounded-xl border border-ink-line bg-ink-card px-5 text-[17px] text-cream placeholder:text-cream-muted focus:border-amber"
          />

          <div className="mt-3">
            {tooShort ? (
              <p className="px-1 text-sm text-cream-muted">Two letters is enough to start.</p>
            ) : hits.length === 0 ? (
              <p className="px-1 text-sm text-cream-muted">
                {searching ? "Searching…" : "Nothing matches that yet."}
              </p>
            ) : (
              <ul className="space-y-2">
                {hits.map((hit) => (
                  <li key={hit.slug}>
                    <button
                      type="button"
                      onClick={() => choose(hit)}
                      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-ink-line bg-ink-card px-5 py-3 text-left transition hover:border-amber"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-cream">{hit.name}</span>
                        {hit.brand && (
                          <span className="block truncate text-xs text-cream-muted">{hit.brand}</span>
                        )}
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-cream-muted">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {/* ---------------------------------------- chosen bottle + reset */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-line bg-ink-card px-5 py-4">
            <span className="min-w-0">
              {selected.brand && (
                <span className="block text-[0.65rem] tracking-[0.16em] text-amber uppercase">
                  {selected.brand}
                </span>
              )}
              <span className="mt-1 block truncate text-cream">{selected.name}</span>
              {selected.proof !== null && (
                <span className="mt-0.5 block text-xs text-cream-muted">
                  {Number(selected.proof)} proof
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={reset}
              className="min-h-11 shrink-0 rounded-full border border-ink-line px-4 text-xs tracking-[0.1em] text-cream-muted uppercase transition hover:border-amber hover:text-amber"
            >
              Change
            </button>
          </div>

          {/* -------------------------------------------- step 2: the price */}
          <div className="mt-6">
            <label htmlFor="shelf-price" className="text-xs tracking-[0.14em] text-cream-muted uppercase">
              2 · What&apos;s on the tag?
            </label>
            <div className="relative mt-3">
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-5 -translate-y-1/2 text-2xl text-cream-muted"
              >
                $
              </span>
              <input
                ref={priceRef}
                id="shelf-price"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
                className="min-h-16 w-full rounded-xl border border-ink-line bg-ink-card pr-5 pl-11 text-3xl text-cream placeholder:text-cream-muted focus:border-amber"
              />
            </div>
            <p className="mt-2 px-1 text-xs text-cream-muted">Before tax. Close enough is fine.</p>
          </div>

          {/* ------------------------------------------ step 3: the verdict */}
          {!ladder ? (
            <p className="mt-8 rounded-xl border border-ink-line px-5 py-4 text-sm text-cream-dim">
              We haven&apos;t set a price ladder for this bottle yet, so we can&apos;t give you a
              verdict on it.
            </p>
          ) : verdict ? (
            <div className="mt-8">
              <div
                className="rounded-2xl border-2 px-5 py-6 text-center"
                style={{ borderColor: BAND_COLOR[verdict] }}
                role="status"
                aria-live="polite"
              >
                <p
                  className="font-display text-4xl font-semibold tracking-[0.04em] uppercase"
                  style={{ color: BAND_COLOR[verdict] }}
                >
                  {VERDICT_LABELS[verdict]}
                </p>
                <p className="mt-3 text-cream-dim">{BAND_LINE[verdict]}</p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-ink-line px-4 py-3">
                  <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                    We&apos;d pay up to
                  </dt>
                  <dd className="mt-1 text-xl text-amber">{formatCents(ladder.buyMaxCents)}</dd>
                </div>
                <div className="rounded-xl border border-ink-line px-4 py-3">
                  <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                    Reference price
                  </dt>
                  <dd className="mt-1 text-xl text-cream">{formatCents(selected.msrpCents)}</dd>
                </div>
              </dl>

              {selected.editorialNote && (
                <p className="mt-4 text-sm leading-relaxed text-cream-dim">{selected.editorialNote}</p>
              )}

              <Link
                href={`/bourbon/${selected.slug}`}
                className="mt-5 flex min-h-12 items-center justify-center rounded-full border border-ink-line text-sm font-semibold tracking-[0.12em] text-cream uppercase transition hover:border-amber hover:text-amber"
              >
                Read the full review
              </Link>

              {wantsAlternatives && alternatives && alternatives.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-display text-lg text-cream">Better on the same shelf</h2>
                  <ul className="mt-3 space-y-2">
                    {alternatives.map((alt) => (
                      <li key={alt.slug}>
                        <Link
                          href={`/bourbon/${alt.slug}`}
                          onClick={() =>
                            track("alternative_clicked", {
                              from: selected.slug,
                              bottle: alt.slug,
                              placement: "store_mode",
                            })
                          }
                          className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-ink-line bg-ink-card px-5 py-3 transition hover:border-amber"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-cream">{alt.name}</span>
                            {alt.note && (
                              <span className="block truncate text-xs text-cream-muted">
                                {alt.note}
                              </span>
                            )}
                          </span>
                          {alt.buyMaxCents !== null && (
                            <span className="shrink-0 text-xs text-amber">
                              {formatCents(alt.buyMaxCents)}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-8 px-1 text-sm text-cream-muted">
              Type the price and we&apos;ll tell you straight away.
            </p>
          )}
        </div>
      )}

      <p className="mt-12 text-center text-xs leading-relaxed text-cream-muted">
        What We&apos;d Pay is our editorial view of what a bottle is worth. It isn&apos;t live
        market pricing, and we don&apos;t know what your store paid for it.
      </p>
    </div>
  );
}

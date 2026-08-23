"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

/**
 * Outbound retailer links. Every href is the internal /go route — the real
 * destination never reaches the browser.
 *
 * The disclosure sits immediately above the links rather than only in the
 * footer, so the material connection is disclosed at the point of exposure.
 */
export function AffiliateLinks({
  bottleSlug,
  retailers,
}: {
  bottleSlug: string;
  retailers: { id: string; retailer: { name: string; slug: string; disclosure_note: string | null } }[];
}) {
  if (retailers.length === 0) return null;

  return (
    <section className="rounded-2xl border border-ink-line bg-ink-card p-5 sm:p-6">
      <h2 className="font-display text-lg text-cream">Check the price</h2>
      <p className="mt-2 text-xs leading-relaxed text-cream-muted">
        We may earn a commission if you buy through these links, at no extra cost
        to you. It never changes our verdict —{" "}
        <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-cream-dim">
          how this works
        </Link>
        . Prices and stock change constantly; confirm at checkout.
      </p>

      <ul className="mt-5 space-y-2">
        {retailers.map(({ id, retailer }) => (
          <li key={id}>
            <a
              href={`/go/${retailer.slug}/${bottleSlug}`}
              rel="sponsored nofollow noopener"
              target="_blank"
              onClick={() =>
                track("affiliate_click", { merchant: retailer.slug, bottle: bottleSlug })
              }
              className="flex min-h-12 items-center justify-between gap-4 rounded-full border border-ink-line px-5 text-sm text-cream transition hover:border-amber hover:text-amber"
            >
              <span>{retailer.name}</span>
              <span aria-hidden="true">→</span>
            </a>
            {retailer.disclosure_note && (
              <p className="mt-1 px-5 text-xs text-cream-muted">{retailer.disclosure_note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import Link from "next/link";
import { formatCents } from "@/lib/domain/bottle";
import { track } from "@/lib/analytics";
import type { PublicBottleSummary } from "@/lib/data/public-bottles";
import type { BusinessEvent } from "@/lib/analytics";

export function BottleCard({
  bottle,
  note,
  event,
  eventParams,
}: {
  bottle: PublicBottleSummary;
  note?: string | null;
  event?: BusinessEvent;
  eventParams?: Record<string, string>;
}) {
  return (
    <Link
      href={`/bourbon/${bottle.slug}`}
      onClick={() => event && track(event, { bottle: bottle.slug, ...eventParams })}
      className="flex h-full flex-col rounded-2xl border border-ink-line bg-ink-card p-5 transition hover:border-amber/50"
    >
      {bottle.brand && (
        <span className="text-[0.65rem] font-semibold tracking-[0.16em] text-amber uppercase">
          {bottle.brand.name}
        </span>
      )}
      <span className="mt-2 font-display text-lg text-cream">{bottle.name}</span>

      {bottle.classification && (
        <span className="mt-1 text-xs text-cream-muted">{bottle.classification}</span>
      )}

      {note && <span className="mt-3 text-sm leading-relaxed text-cream-dim">{note}</span>}

      <span className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4 text-sm">
        {bottle.price && (
          <span className="text-cream">
            <span className="text-cream-muted">We&apos;d pay up to </span>
            <span className="font-semibold text-amber">
              {formatCents(bottle.price.buy_max_cents)}
            </span>
          </span>
        )}
        {bottle.proof !== null && (
          <span className="text-cream-muted">{Number(bottle.proof)} proof</span>
        )}
      </span>
    </Link>
  );
}

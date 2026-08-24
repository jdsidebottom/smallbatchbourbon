import Link from "next/link";
import { formatCents } from "@/lib/domain/bottle";
import { TrackedLink } from "@/components/TrackedLink";
import { BottleImage } from "@/components/bottle/BottleImage";
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
    <Card slug={bottle.slug} event={event} eventParams={eventParams}>
      {/* div, not span: BottleImage renders a block element, and <a> may
          contain flow content in HTML5 while <span> may not. */}
      <div className="flex items-start gap-4">
        <BottleImage
          path={bottle.image_path}
          alt={bottle.image_alt}
          sizes="5rem"
          className="w-20 shrink-0"
        />
        <div className="min-w-0 flex-1">
          {bottle.brand && (
            <span className="block text-[0.65rem] font-semibold tracking-[0.16em] text-amber uppercase">
              {bottle.brand.name}
            </span>
          )}
          <span className="mt-1 block font-display text-lg text-cream">{bottle.name}</span>

          {bottle.classification && (
            <span className="mt-1 block text-xs text-cream-muted">{bottle.classification}</span>
          )}
        </div>
      </div>

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
    </Card>
  );
}

/**
 * Only the anchor needs to be a client component when an event is being
 * recorded; without one the card stays entirely server-rendered.
 */
function Card({
  slug,
  event,
  eventParams,
  children,
}: {
  slug: string;
  event?: BusinessEvent;
  eventParams?: Record<string, string>;
  children: React.ReactNode;
}) {
  const className =
    "flex h-full flex-col rounded-2xl border border-ink-line bg-ink-card p-5 transition hover:border-amber/50";

  if (!event) {
    return (
      <Link href={`/bourbon/${slug}`} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <TrackedLink
      href={`/bourbon/${slug}`}
      event={event}
      params={{ bottle: slug, ...eventParams }}
      className={className}
    >
      {children}
    </TrackedLink>
  );
}

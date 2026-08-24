import { TrackedLink } from "@/components/TrackedLink";
import { formatCents, TASTING_AXES } from "@/lib/domain/bottle";
import { evaluateVerdict } from "@/lib/domain/verdict";
import { VerdictPill } from "@/components/bottle/VerdictLadder";
import { BottleImage } from "@/components/bottle/BottleImage";
import type { GuidePick } from "@/lib/data/public-articles";

/**
 * One recommendation in a guide (PRD §11).
 *
 * Everything factual on this card — proof, reference price, the price ladder,
 * the verdict, the flavour profile, Best for / Skip if — is read from the
 * canonical bottle record. The only guide-specific content is the label and the
 * rationale. That is the whole point: correcting a bottle corrects every guide
 * it appears in, with no editorial follow-up.
 */
export function GuidePickCard({
  pick,
  guideSlug,
  featured = false,
}: {
  pick: GuidePick;
  guideSlug: string;
  featured?: boolean;
}) {
  const { bottle } = pick;
  const ladder = bottle.price;

  // A verdict needs a price to judge. We have no live shelf price here, so the
  // only honest verdict is the one for the verified reference price — and only
  // when that price has actually been verified.
  const referenceVerdict =
    ladder && bottle.msrp_cents !== null && bottle.msrp_verified_at !== null
      ? evaluateVerdict(bottle.msrp_cents, {
          stealMaxCents: ladder.steal_max_cents,
          buyMaxCents: ladder.buy_max_cents,
          fairMaxCents: ladder.fair_max_cents,
          maybeMaxCents: ladder.maybe_max_cents,
        })
      : null;

  const profile = topFlavours(bottle.tasting);

  const clickParams = { guide: guideSlug, bottle: bottle.slug, rank: pick.rank };

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-ink-card p-5 sm:p-6 ${
        featured ? "border-amber/40" : "border-ink-line"
      }`}
    >
      <div className="flex items-start gap-4">
        <BottleImage
          path={bottle.image_path}
          alt={bottle.image_alt}
          sizes="4.5rem"
          className="w-18 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {pick.label && (
            <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-amber uppercase">
              {pick.label}
            </p>
          )}
          {bottle.brand && (
            <p className="mt-1 text-xs text-cream-muted">{bottle.brand.name}</p>
          )}
          <h3 className="mt-1 font-display text-xl text-cream">
            <TrackedLink
              href={`/bourbon/${bottle.slug}`}
              event="buying_guide_bottle_clicked"
              params={clickParams}
              className="transition hover:text-amber"
            >
              {bottle.name}
            </TrackedLink>
          </h3>
        </div>

        {referenceVerdict && <VerdictPill band={referenceVerdict} size="sm" />}
        </div>
      </div>

      {pick.rationale && (
        <p className="mt-4 text-[0.95rem] leading-relaxed text-cream-dim">{pick.rationale}</p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Fact
          label="We'd pay up to"
          value={ladder ? <span className="text-amber">{formatCents(ladder.buy_max_cents)}</span> : "—"}
        />
        <Fact
          label="Reference price"
          value={
            bottle.msrp_cents !== null && bottle.msrp_verified_at !== null
              ? formatCents(bottle.msrp_cents)
              : "Not verified"
          }
        />
        <Fact
          label="Proof"
          value={bottle.proof !== null ? `${Number(bottle.proof)}` : "Not stated"}
        />
        <Fact label="Style" value={bottle.classification ?? "Not stated"} />
      </dl>

      {profile && (
        <p className="mt-4 text-xs text-cream-muted">
          <span className="tracking-[0.12em] uppercase">Profile</span> · {profile}
        </p>
      )}

      {(bottle.review?.best_for || bottle.review?.skip_if) && (
        <div className="mt-5 space-y-2 border-t border-ink-line pt-4 text-sm">
          {bottle.review.best_for && (
            <p className="text-cream-dim">
              <span className="text-verdict-steal">Buy it if</span> — {bottle.review.best_for}
            </p>
          )}
          {bottle.review.skip_if && (
            <p className="text-cream-dim">
              <span className="text-verdict-maybe">Skip it if</span> — {bottle.review.skip_if}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto pt-5">
        <TrackedLink
          href={`/bourbon/${bottle.slug}`}
          event="buying_guide_bottle_clicked"
          params={clickParams}
          className="inline-flex min-h-11 items-center text-sm font-semibold tracking-[0.1em] text-amber uppercase transition hover:text-amber-glow"
        >
          Full review →
        </TrackedLink>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-cream">{value}</dd>
    </div>
  );
}

/**
 * The three strongest flavour axes, named and scored. Deliberately not turned
 * into prose adjectives — that would be inventing a description the tasting
 * profile does not contain.
 */
function topFlavours(tasting: Record<string, number | null> | null): string | null {
  if (!tasting) return null;

  // flatMap rather than map().filter(): a type predicate cannot narrow the
  // element type here, so filtering would leave `value` typed as possibly null.
  const scored = TASTING_AXES.flatMap((axis) => {
    const value = tasting[axis];
    return typeof value === "number" ? [{ axis: axis as string, value }] : [];
  });

  if (scored.length === 0) return null;

  return scored
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((entry) => `${entry.axis[0].toUpperCase()}${entry.axis.slice(1)} ${entry.value}`)
    .join(" · ");
}

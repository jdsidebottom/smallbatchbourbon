import { VERDICT_LABELS, formatCents, type VerdictBand } from "@/lib/domain/bottle";

const BAND_COLOR: Record<VerdictBand, string> = {
  steal: "var(--color-verdict-steal)",
  buy: "var(--color-verdict-buy)",
  fair: "var(--color-verdict-fair)",
  maybe: "var(--color-verdict-maybe)",
  walk_away: "var(--color-verdict-walk)",
};

export function VerdictPill({
  band,
  size = "md",
}: {
  band: VerdictBand;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "px-4 py-1.5 text-base"
      : size === "sm"
        ? "px-2.5 py-0.5 text-[0.65rem]"
        : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-[0.1em] uppercase ${sizing}`}
      style={{ color: BAND_COLOR[band], borderColor: BAND_COLOR[band] }}
    >
      {VERDICT_LABELS[band]}
    </span>
  );
}

/**
 * The full price ladder for a bottle. Shows where each band ends so a reader can
 * judge a shelf price themselves, rather than only being told a single number.
 */
export function VerdictLadder({
  ladder,
}: {
  ladder: {
    steal_max_cents: number;
    buy_max_cents: number;
    fair_max_cents: number;
    maybe_max_cents: number;
  };
}) {
  const rows: { band: VerdictBand; ceiling: number | null }[] = [
    { band: "steal", ceiling: ladder.steal_max_cents },
    { band: "buy", ceiling: ladder.buy_max_cents },
    { band: "fair", ceiling: ladder.fair_max_cents },
    { band: "maybe", ceiling: ladder.maybe_max_cents },
    { band: "walk_away", ceiling: null },
  ];

  return (
    <ul className="divide-y divide-ink-line">
      {rows.map(({ band, ceiling }) => (
        <li key={band} className="flex items-center justify-between gap-4 py-3">
          <VerdictPill band={band} size="sm" />
          <span className="text-sm text-cream-dim">
            {ceiling === null ? (
              <>above {formatCents(ladder.maybe_max_cents)}</>
            ) : (
              <>up to {formatCents(ceiling)}</>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

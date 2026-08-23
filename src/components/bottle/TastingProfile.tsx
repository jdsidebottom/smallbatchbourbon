import { TASTING_AXES } from "@/lib/domain/bottle";

/**
 * Flavour profile bars. Axes an editor left blank are omitted rather than shown
 * as zero, so an unrated axis never reads as "none of this".
 */
export function TastingProfile({ profile }: { profile: Record<string, number | null> }) {
  const axes = TASTING_AXES.flatMap((axis) => {
    const value = profile[axis];
    return typeof value === "number" && Number.isFinite(value) ? [{ axis, value }] : [];
  });

  if (axes.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-2xl text-cream">Flavour profile</h2>
      <ul className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {axes.map(({ axis, value }) => (
          <li key={axis} className="flex items-center gap-4">
            <span className="w-20 shrink-0 text-xs tracking-[0.12em] text-cream-muted uppercase">
              {axis}
            </span>
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-card"
              role="img"
              aria-label={`${axis}: ${value} out of 10`}
            >
              <span
                className="block h-full rounded-full bg-amber"
                style={{ width: `${(value / 10) * 100}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-xs text-cream-dim">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

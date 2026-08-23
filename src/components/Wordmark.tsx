/**
 * Typographic wordmark. The final logo is an open decision (PRD §29) — this is
 * a deliberate placeholder built from brand type, not invented iconography, and
 * is the single place to swap in the finished mark.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className="font-display text-[0.95em] font-semibold tracking-[0.02em]">
        SMALL <span className="text-amber">BATCH</span>
      </span>
      <span className="mt-[0.35em] text-[0.42em] font-semibold tracking-[0.42em] text-cream-dim">
        BOURBON
      </span>
    </span>
  );
}

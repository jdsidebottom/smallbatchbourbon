/**
 * The hero eyebrow, with "theatrics" struck out in red pen and corrected to
 * something blunter.
 *
 * The strike is a hand-drawn SVG path rather than `text-decoration: line-through`
 * — a perfectly straight, perfectly centred rule reads as a typographic effect,
 * which is the opposite of the intent. The path wobbles and overshoots slightly
 * at both ends, the way a real pen does.
 *
 * Semantics: `<s>` marks text that is no longer accurate, which is exactly the
 * joke. A screen reader reads the line straight through as "Bourbon, without the
 * theatrics bullshit" — the gag survives without sight, and the SVG is hidden
 * from assistive tech because it carries no information the text does not.
 */
export function HeroEyebrow() {
  return (
    // Plain inline flow rather than flex: inline elements already align on the
    // baseline, and real spaces between the words mean the accessible name is
    // unambiguous. A flex `gap` looks identical but leaves the text nodes
    // touching, so assistive tech can run the words together.
    //
    // min-height reserves the line box so the handwriting swapping in cannot
    // nudge the headline below it.
    <p className="eyebrow min-h-8">
      Bourbon, without the{" "}
      <span className="relative inline-block">
        <s className="no-underline">theatrics</s>

        <svg
          aria-hidden="true"
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-[-6%] top-1/2 h-[0.7em] w-[112%] -translate-y-1/2 overflow-visible"
        >
          <path
            d="M1.5,6.4 C 14,3.8 26,7.3 38,5.1 C 50,3.2 62,7.8 74,4.9 C 84,2.7 92,6.6 98.5,4.2"
            fill="none"
            stroke="var(--color-marker)"
            strokeWidth="2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>{" "}
      <span
        className="font-hand relative top-[0.12em] inline-block text-[1.9em] leading-none font-semibold text-marker normal-case tracking-normal"
        style={{ transform: "rotate(-3deg)" }}
      >
        bullshit.
      </span>
    </p>
  );
}

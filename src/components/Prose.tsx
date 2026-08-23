export function PageHeader({
  eyebrow,
  title,
  intro,
  updated,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  updated?: string;
}) {
  return (
    <header className="border-b border-ink-line">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 text-lg leading-relaxed text-cream-dim">{intro}</p>}
        {updated && (
          <p className="mt-6 text-xs tracking-[0.14em] text-cream-muted uppercase">
            Last updated {updated}
          </p>
        )}
      </div>
    </header>
  );
}

/**
 * Long-form body copy. Styles are applied here rather than per page so every
 * policy and editorial page reads identically.
 */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:py-16">
      <div
        className={[
          "space-y-5 text-[1.0625rem] leading-relaxed text-cream-dim",
          "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:text-cream",
          "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:text-cream",
          "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
          "[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
          "[&_strong]:text-cream",
          "[&_a]:text-amber [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-amber-glow",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

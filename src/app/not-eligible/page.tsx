import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Come back another time",
  robots: { index: false, follow: false },
};

/**
 * Neutral exit for visitors who indicate they are under 21. It deliberately
 * contains no alcohol-focused content, imagery or navigation back into the site.
 */
export default function NotEligiblePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-5 py-20 text-center">
      <h1 className="text-4xl leading-tight text-cream sm:text-5xl">
        Come back another time.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-cream-dim">
        You must be 21 or older to view this site. Thanks for being honest — we&apos;ll be
        here when you&apos;re of legal drinking age.
      </p>
      <p className="mt-10 text-sm text-cream-muted">
        If you need support with alcohol use, the SAMHSA National Helpline is free,
        confidential, and available 24/7 at{" "}
        <a
          href="tel:18006624357"
          className="text-amber underline underline-offset-4 hover:text-amber-glow"
        >
          1-800-662-4357
        </a>
        .
      </p>
    </div>
  );
}

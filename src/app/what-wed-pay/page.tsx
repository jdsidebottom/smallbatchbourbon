import type { Metadata } from "next";
import Link from "next/link";
import { BottleSearch } from "@/components/bottle/BottleSearch";
import { VerdictLadder } from "@/components/bottle/VerdictLadder";
import { listPublishedBottles } from "@/lib/data/public-bottles";
import { BottleCard } from "@/components/bottle/BottleCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What We'd Pay",
  description:
    "One number for every bottle: the most we'd pay for it. Search a bourbon and see where a shelf price lands.",
  alternates: { canonical: "/what-wed-pay" },
};

export default async function WhatWedPayPage() {
  const bottles = await listPublishedBottles();

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="eyebrow">What We&apos;d Pay</p>
      <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
        A ceiling, not a cheerleader.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream-dim">
        Every bottle we cover gets one number: the most we&apos;d pay for it. Compare
        that against the shelf price and you have your answer.
      </p>

      <div className="mt-8 max-w-xl">
        <BottleSearch placeholder="Search a bottle…" />
      </div>

      <div className="mt-6">
        <Link
          href="/at-the-store"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber px-7 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
        >
          At the store? Check a price
        </Link>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-2xl text-cream">How the bands work</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-muted">
          Each bottle carries four ceilings. Where the shelf price falls decides the
          verdict. The numbers below are an illustration of the shape — every bottle has
          its own.
        </p>
        <div className="mt-6 rounded-2xl border border-ink-line bg-ink-card px-5 sm:px-6">
          <VerdictLadder
            ladder={{
              steal_max_cents: 3000,
              buy_max_cents: 4000,
              fair_max_cents: 5000,
              maybe_max_cents: 6000,
            }}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-cream-muted">
          This is an editorial value framework, not a live market price feed. We set the
          thresholds independently of a bottle&apos;s suggested retail price, and we
          don&apos;t claim to know what any particular store is charging tonight. See our{" "}
          <Link href="/editorial-policy" className="text-amber underline underline-offset-4">
            Editorial Policy
          </Link>
          .
        </p>
      </section>

      {bottles.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl text-cream">Every bottle we&apos;ve priced</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bottles.map((bottle) => (
              <li key={bottle.id}>
                <BottleCard bottle={bottle} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { HeroCta } from "@/components/HeroCta";
import { InterestButton } from "@/components/InterestButton";
import { NewsletterForm } from "@/components/NewsletterForm";
import { VERDICT_LADDER, site } from "@/lib/site";

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: "/" },
};

/**
 * Illustrative example only. Deliberately not a real bottle: the site must
 * never publish an invented MSRP, threshold or verdict for a real product
 * (PRD §7.2, §28). Replace this preview with a published canonical bottle
 * record once Milestone 3 ships.
 */
const DEMO_BOTTLE = {
  name: "Example Bourbon",
  classification: "Kentucky Straight Bourbon · Small Batch",
  proof: "100 proof / 50% ABV",
  age: "No age statement",
  reference: "$44",
  wouldPay: "$52",
  shelfPrice: "$49",
  verdict: "Buy",
  verdictColor: "var(--color-verdict-buy)",
  line: "Under our ceiling and comfortably better than the shelf around it. Grab it.",
};

const GUIDE_PREVIEWS = [
  {
    kicker: "Alternatives",
    title: "Blanton's Alternatives",
    blurb: "Bottles that scratch the same itch without the secondary-market tax.",
  },
  {
    kicker: "Alternatives",
    title: "Weller Alternatives",
    blurb: "Wheated bourbon you can actually find, at prices that still make sense.",
  },
  {
    kicker: "Buying guide",
    title: "Best Bourbon Under $50",
    blurb: "The everyday shelf, ranked by what it delivers per dollar.",
  },
];

const STORE_MODE_STEPS = [
  { step: "01", title: "Search the bottle", body: "Type a few letters. We'll find it." },
  { step: "02", title: "Enter the shelf price", body: "Whatever the tag says, tax aside." },
  { step: "03", title: "Get the verdict", body: "Plus better alternatives when they exist." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% -10%, rgba(224,163,60,0.22) 0%, rgba(224,163,60,0.06) 38%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="eyebrow">Bourbon, without the theatrics</p>
          <h1 className="mt-5 max-w-3xl text-[2.6rem] leading-[1.05] text-cream sm:text-6xl lg:text-7xl">
            Drink smarter.
            <br />
            <span className="text-amber">Ignore the noise.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-dim">
            Straightforward bourbon recommendations, real-world value, and better
            alternatives — without the hype. Know what a bottle is actually worth before
            you hand over your card.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <HeroCta />
            <InterestButton feature="Liquor Store Mode" placement="hero" targetId="liquor-aisle">
              At the store?
            </InterestButton>
          </div>

          <ul className="mt-14 grid gap-x-8 gap-y-4 border-t border-ink-line pt-8 text-sm text-cream-muted sm:grid-cols-3">
            <li>No hype premiums. No paid verdicts.</li>
            <li>Every bottle fact sourced and dated.</li>
            <li>Built for the phone in your hand at the shelf.</li>
          </ul>
        </div>
      </section>

      {/* What We'd Pay preview */}
      <section id="what-wed-pay" className="scroll-mt-20 border-b border-ink-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">What We&apos;d Pay</p>
              <h2 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
                A ceiling, not a cheerleader.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-cream-dim">
                Every bottle we cover gets one number: the most we&apos;d pay for it. Not
                what a store is asking, and not what a flipper wants — what the liquid is
                worth. Compare the shelf price against that ceiling and you get a plain
                verdict in about two seconds.
              </p>
              <p className="mt-5 text-sm leading-relaxed text-cream-muted">
                What We&apos;d Pay is an editorial value framework. It is not a live market
                price feed, and we don&apos;t claim to know what your local store is
                charging tonight.
              </p>
              <div className="mt-8">
                <InterestButton feature="What We'd Pay search" placement="what_wed_pay_section">
                  Tell me when it&apos;s live
                </InterestButton>
              </div>
            </div>

            {/* Clearly labeled demo result — never presented as live data. */}
            <div className="rounded-2xl border border-ink-line bg-ink-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-amber uppercase">
                  Example only
                </span>
                <span className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                  Not live data
                </span>
              </div>

              <h3 className="mt-6 text-2xl text-cream">{DEMO_BOTTLE.name}</h3>
              <p className="mt-1 text-sm text-cream-muted">{DEMO_BOTTLE.classification}</p>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-ink-line py-6">
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                    Reference price
                  </dt>
                  <dd className="mt-1 text-xl text-cream">{DEMO_BOTTLE.reference}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                    What we&apos;d pay
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-amber">
                    up to {DEMO_BOTTLE.wouldPay}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                    Proof
                  </dt>
                  <dd className="mt-1 text-sm text-cream-dim">{DEMO_BOTTLE.proof}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                    Age
                  </dt>
                  <dd className="mt-1 text-sm text-cream-dim">{DEMO_BOTTLE.age}</dd>
                </div>
              </dl>

              <div className="mt-6 flex items-baseline justify-between gap-4">
                <span className="text-sm text-cream-muted">
                  Shelf price {DEMO_BOTTLE.shelfPrice}
                </span>
                <span
                  className="text-2xl font-semibold tracking-[0.06em] uppercase"
                  style={{ color: DEMO_BOTTLE.verdictColor }}
                >
                  {DEMO_BOTTLE.verdict}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">{DEMO_BOTTLE.line}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Don't Chase the Hype */}
      <section
        id="dont-chase-the-hype"
        className="scroll-mt-20 border-b border-ink-line bg-ink-raised"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <p className="eyebrow">Don&apos;t chase the hype</p>
          <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-cream sm:text-5xl">
            The bottle you can&apos;t find usually has a twin you can.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream-dim">
            Allocation turns good bourbon into a scavenger hunt and a markup. Our guides do
            the boring work: what the unicorn actually tastes like, what drinks close to
            it, and what that costs on a normal shelf.
          </p>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE_PREVIEWS.map((guide) => (
              <li
                key={guide.title}
                className="flex flex-col rounded-2xl border border-ink-line bg-ink-card p-6"
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-amber uppercase">
                  {guide.kicker}
                </p>
                <h3 className="mt-3 text-xl text-cream">{guide.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-cream-dim">
                  {guide.blurb}
                </p>
                <p className="mt-5 text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                  In the works
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <InterestButton
              feature="Buying guides"
              placement="dont_chase_the_hype"
              variant="solid"
            >
              Get the guides first
            </InterestButton>
          </div>
        </div>
      </section>

      {/* The Weekly Pour — primary conversion block */}
      <section id="weekly-pour" className="scroll-mt-20 border-b border-ink-line">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
          <p className="eyebrow">The Weekly Pour</p>
          <h2 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
            One useful bourbon email. Once a week.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-cream-dim">
            What&apos;s worth buying, what&apos;s overpriced, and what just got interesting
            — in the time it takes to finish a pour. No press releases, no breathless
            release-hunting.
          </p>

          <div className="mx-auto mt-9 max-w-xl text-left">
            <NewsletterForm source="landing_weekly_pour" />
          </div>
        </div>
      </section>

      {/* Find My Next Pour teaser */}
      <section
        id="find-my-next-pour"
        className="scroll-mt-20 border-b border-ink-line bg-ink-raised"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Coming soon · Find My Next Pour</p>
              <h2 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
                Tell us the bottle you love. We&apos;ll tell you what&apos;s next.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-cream-dim">
                Answer a few questions about what you already drink, what you&apos;ll spend,
                and how you drink it — neat, on a rock, or in an Old Fashioned — and get a
                short list worth your money. We&apos;re building it now.
              </p>
            </div>

            <div className="rounded-2xl border border-ink-line bg-ink-card p-6 sm:p-8">
              <h3 className="text-lg text-cream">Get early access</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-dim">
                We&apos;ll email you once, when it&apos;s ready to use.
              </p>
              <div className="mt-6">
                <NewsletterForm
                  source="find_my_next_pour"
                  cta="Notify me"
                  successMessage="You're on the early-access list."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built for the Liquor Aisle */}
      <section id="liquor-aisle" className="scroll-mt-20 border-b border-ink-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <p className="eyebrow">Coming soon · Liquor Store Mode</p>
          <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-cream sm:text-5xl">
            Built for the liquor aisle.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream-dim">
            You&apos;re standing in front of the shelf with a bottle in one hand and your
            phone in the other. Search it, type the price on the tag, and get a verdict
            before the employee asks if you need help.
          </p>

          <ol className="mt-12 grid gap-4 sm:grid-cols-3">
            {STORE_MODE_STEPS.map((item) => (
              <li key={item.step} className="rounded-2xl border border-ink-line bg-ink-card p-6">
                <span className="font-display text-2xl text-amber">{item.step}</span>
                <h3 className="mt-3 text-lg text-cream">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream-dim">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-2xl border border-ink-line bg-ink-card p-6 sm:p-8">
            <h3 className="text-lg text-cream">The verdict ladder</h3>
            <p className="mt-2 text-sm text-cream-muted">
              Five answers. No stars, no 94-point scores.
            </p>
            <ul className="mt-6 divide-y divide-ink-line">
              {VERDICT_LADDER.map((band) => (
                <li
                  key={band.key}
                  className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span
                    className="w-32 shrink-0 text-sm font-semibold tracking-[0.14em] uppercase"
                    style={{ color: band.color }}
                  >
                    {band.label}
                  </span>
                  <span className="text-sm leading-relaxed text-cream-dim">{band.meaning}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10">
            <InterestButton
              feature="Liquor Store Mode"
              placement="liquor_aisle_section"
              variant="solid"
            >
              Tell me when it&apos;s live
            </InterestButton>
          </div>
        </div>
      </section>

      {/* Brand philosophy */}
      <section id="philosophy" className="scroll-mt-20 bg-ink-raised">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
          <p className="eyebrow">Our philosophy</p>
          <h2 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
            We like bourbon. We don&apos;t worship it.
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-cream-dim">
            <p>
              Somewhere along the way, buying a bottle of whiskey turned into a status
              exam. Allocation lists. Secondary prices. People describing a $200 pour in
              language you&apos;d need a thesaurus to defend.
            </p>
            <p>
              We think most of that is noise. A good bourbon is one you&apos;re happy to
              open on a Tuesday. So we tell you what a bottle actually costs to enjoy, what
              it&apos;s genuinely worth, and what to buy instead when the answer is
              &ldquo;not that.&rdquo;
            </p>
            <p className="text-cream">
              Nobody buys a verdict here. Not advertisers, not brands, not affiliate
              partners. If we recommend a bottle, it&apos;s because we&apos;d spend our own
              money on it.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

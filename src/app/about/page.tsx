import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "About",
  description:
    "Small Batch Bourbon is a value-first bourbon publication. We tell you what a bottle is worth, what to buy instead, and what to skip.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="We like bourbon. We don't worship it."
        intro="Small Batch Bourbon exists to answer three questions well: is this bottle worth the money, what should I buy instead, and what should I drink next?"
      />
      <Prose>
        <p>
          Bourbon got complicated. Allocation lists, secondary markets, and a whole
          vocabulary built to make ordinary people feel like they&apos;re buying wrong. We
          think most of that is noise, and noise is expensive.
        </p>
        <p>
          So we do the unglamorous work instead. We record what a bottle actually is —
          producer, proof, age, mash bill, reference price — and where each of those facts
          came from. Then we say the most we&apos;d pay for it, and why.
        </p>

        <h2>What we publish</h2>
        <ul>
          <li>
            <strong>Bottle pages.</strong> The facts, a short verdict, and honest tasting
            notes without the thesaurus.
          </li>
          <li>
            <strong>What We&apos;d Pay.</strong> A price ceiling for every bottle we cover
            — an editorial judgment, not a market feed.
          </li>
          <li>
            <strong>Buying guides and alternatives.</strong> What to buy when the bottle
            everyone wants isn&apos;t on the shelf, or isn&apos;t worth the ask.
          </li>
          <li>
            <strong>The Weekly Pour.</strong> One useful email a week.
          </li>
        </ul>

        <h2>How we pay for it</h2>
        <p>
          Some links on this site earn a commission when you buy through them, at no extra
          cost to you. That funding never buys a verdict or a placement. The details are in
          our{" "}
          <Link href="/affiliate-disclosure">Affiliate Disclosure</Link> and our{" "}
          <Link href="/editorial-policy">Editorial Policy</Link>.
        </p>

        <h2>What we don&apos;t do</h2>
        <ul>
          <li>We don&apos;t sell or ship alcohol.</li>
          <li>We don&apos;t publish scores we were paid for.</li>
          <li>
            We don&apos;t invent facts. If a distillery won&apos;t disclose a mash bill, the
            page says undisclosed.
          </li>
          <li>We don&apos;t pretend a price is current when we haven&apos;t verified it.</li>
        </ul>

        <p>
          Questions, corrections, or a bottle you want covered?{" "}
          <Link href="/contact">Get in touch</Link>.
        </p>
      </Prose>
    </>
  );
}

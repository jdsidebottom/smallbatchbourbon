import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/Prose";
import { VERDICT_LADDER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description:
    "How Small Batch Bourbon sources facts, sets What We'd Pay thresholds, and keeps verdicts independent.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Standards"
        title="Editorial Policy"
        intro="Independence isn't a slogan here — it's the product. This is how we work."
        updated="August 2026"
      />
      <Prose>
        <h2>Independence</h2>
        <p>
          Advertising, sponsorship, samples, and affiliate relationships never purchase a
          score, a verdict, a ranking, or a What We&apos;d Pay threshold. Commercial staff
          do not review or approve editorial judgments before publication.
        </p>

        <h2>Facts and sourcing</h2>
        <ul>
          <li>
            Every bottle record stores where its facts came from and when they were last
            verified.
          </li>
          <li>
            We don&apos;t guess. When a producer won&apos;t disclose a mash bill, distiller,
            or age, the page says <strong>undisclosed</strong> — it does not say what we
            suspect.
          </li>
          <li>
            Reference prices are labeled with their source and verification date. We do not
            present them as live retail pricing.
          </li>
          <li>
            Corrections are made promptly and, when material, noted on the page. Email us
            anything we got wrong.
          </li>
        </ul>

        <h2>What We&apos;d Pay</h2>
        <p>
          What We&apos;d Pay is an editorial value judgment: the most we would spend on a
          bottle, set independently of its suggested retail price. It answers &ldquo;is
          this worth it,&rdquo; not &ldquo;what does it cost today.&rdquo; Each bottle
          carries thresholds that map a shelf price onto one of five verdicts:
        </p>
        <ul>
          {VERDICT_LADDER.map((band) => (
            <li key={band.key}>
              <strong>{band.label}</strong> — {band.meaning}
            </li>
          ))}
        </ul>
        <p>
          Thresholds are reviewed as prices, availability, and the bottles around them
          change. Changes are logged internally so a verdict can always be explained.
        </p>

        <h2>Reviews and samples</h2>
        <p>
          We buy most of what we review. We do accept samples, and a sample buys nothing —
          not coverage, not a timeline, not a favorable review. Where a bottle was provided
          to us, the page says so.
        </p>

        <h2>Tasting notes</h2>
        <p>
          Notes are the honest impressions of the person who drank it, written in plain
          language. We aim to be useful rather than lyrical, and we don&apos;t pretend
          precision we don&apos;t have.
        </p>

        <h2>Responsible coverage</h2>
        <p>
          We do not suggest that drinking improves health, social standing, or performance,
          and we don&apos;t encourage excess. See{" "}
          <Link href="/responsible-drinking">Responsible Drinking</Link>.
        </p>

        <p>
          Related: <Link href="/affiliate-disclosure">Affiliate Disclosure</Link> and{" "}
          <Link href="/advertising-policy">Advertising &amp; Sponsorship Policy</Link>.
        </p>
      </Prose>
    </>
  );
}

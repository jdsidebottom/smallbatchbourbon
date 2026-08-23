import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "How Small Batch Bourbon makes money from links, and what that does and does not buy.",
  alternates: { canonical: "/affiliate-disclosure" },
};

export default function AffiliateDisclosurePage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Affiliate Disclosure"
        intro="Some links here earn us a commission. None of them earn a better verdict."
        updated="August 2026"
      />
      <Prose>
        <h2>The disclosure</h2>
        <p>
          Small Batch Bourbon participates in affiliate programs. When you follow certain
          links to a retailer and make a purchase, we may earn a commission at no
          additional cost to you. Links that can earn us a commission are labeled near the
          recommendation itself, not just on this page.
        </p>

        <h2>What a commission does not buy</h2>
        <ul>
          <li>It doesn&apos;t change a verdict.</li>
          <li>It doesn&apos;t change a What We&apos;d Pay threshold.</li>
          <li>It doesn&apos;t buy a spot in a buying guide or a higher rank in one.</li>
          <li>
            It doesn&apos;t decide which bottles we cover. We regularly recommend bottles
            we earn nothing on, and regularly tell you to walk away from ones we would.
          </li>
        </ul>

        <h2>How we choose retailers</h2>
        <p>
          We link to licensed retailers we would use ourselves. If a merchant relationship
          ends or a partner stops meeting our standards, we turn off their links across the
          site rather than leaving stale ones behind.
        </p>

        <h2>Prices and availability</h2>
        <p>
          Retailer prices and stock change without notice. We don&apos;t claim a link
          reflects live pricing or current availability unless the page says the figure was
          verified and when. Always confirm at checkout.
        </p>

        <h2>Alcohol sales</h2>
        <p>
          We don&apos;t sell alcohol. Retailers we link to are independently responsible
          for age verification, shipping legality, and fulfillment.
        </p>

        <p>
          Related: our <Link href="/editorial-policy">Editorial Policy</Link> and{" "}
          <Link href="/advertising-policy">Advertising &amp; Sponsorship Policy</Link>.
        </p>
      </Prose>
    </>
  );
}

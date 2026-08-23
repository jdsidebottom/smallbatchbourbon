import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Advertising & Sponsorship Policy",
  description:
    "What Small Batch Bourbon will and will not sell to advertisers and sponsors.",
  alternates: { canonical: "/advertising-policy" },
};

export default function AdvertisingPolicyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Standards"
        title="Advertising & Sponsorship Policy"
        intro="Attention is for sale. Judgment isn't."
        updated="August 2026"
      />
      <Prose>
        <h2>What&apos;s available</h2>
        <ul>
          <li>Clearly labeled display and newsletter placements.</li>
          <li>
            Clearly labeled sponsored content, written to the same factual standard as
            everything else and marked as sponsored wherever it appears.
          </li>
          <li>Affiliate relationships with licensed retailers.</li>
        </ul>

        <h2>What is never available</h2>
        <ul>
          <li>Scores, verdicts, and What We&apos;d Pay thresholds.</li>
          <li>Placement or rank inside a buying guide.</li>
          <li>Inclusion in an alternatives list.</li>
          <li>Removal or softening of an unfavorable review.</li>
          <li>Advance approval of editorial copy by an advertiser.</li>
        </ul>

        <h2>Labeling</h2>
        <p>
          Paid placements are visually distinct from editorial content and labeled at the
          point of exposure — not only in a policy page. Material connections are disclosed
          clearly and conspicuously, consistent with FTC endorsement guidance.
        </p>

        <h2>Standards for partners</h2>
        <p>
          We decline advertising that targets people under 21, associates alcohol with
          health, safety, or professional success, encourages excessive consumption, or
          promotes drinking and driving.
        </p>

        <h2>Inquiries</h2>
        <p>
          Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. Related:{" "}
          <Link href="/editorial-policy">Editorial Policy</Link> and{" "}
          <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.
        </p>
      </Prose>
    </>
  );
}

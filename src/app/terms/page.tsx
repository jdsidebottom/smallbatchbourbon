import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern your use of smallbatchbourbon.com.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Use"
        intro="The short version: this is a publication, not a store, and it's for adults."
        updated="August 2026"
      />
      <Prose>
        <h2>Acceptance</h2>
        <p>
          By using {site.domain} you agree to these terms. If you don&apos;t, please
          don&apos;t use the site.
        </p>

        <h2>Age requirement</h2>
        <p>
          This site is intended solely for adults of legal drinking age in their
          jurisdiction — 21 or older in the United States. Confirming your age at the
          prompt is a representation that this is true.
        </p>

        <h2>No sale of alcohol</h2>
        <p>
          We do not sell, ship, or fulfill alcoholic beverages. Purchase links direct you
          to independent, licensed third-party retailers. Those retailers are solely
          responsible for age verification, pricing, availability, shipping, taxes, and
          compliance with the laws that apply where you live.
        </p>

        <h2>Editorial content and pricing</h2>
        <p>
          Reviews, verdicts, and What We&apos;d Pay thresholds are opinions. Reference
          prices reflect the source and verification date shown on the page and are not a
          representation of what any retailer is charging now. Availability and price
          change constantly; confirm both with the retailer before you buy.
        </p>

        <h2>No warranty</h2>
        <p>
          The site is provided &ldquo;as is.&rdquo; We work hard to be accurate but make no
          warranty that content is complete, current, or error-free. To the fullest extent
          permitted by law, we are not liable for any loss arising from your use of the
          site or reliance on its content.
        </p>

        <h2>Third-party links</h2>
        <p>
          We link to retailers and other sites we don&apos;t control and aren&apos;t
          responsible for. Their terms and privacy practices are their own.
        </p>

        <h2>Intellectual property</h2>
        <p>
          Content on this site is ours or used with permission. You may quote and link to
          it with attribution; you may not republish it wholesale or use it to train
          commercial models without written permission.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don&apos;t scrape at volume, attempt to break the site, submit other
          people&apos;s email addresses, or use the site for anything unlawful.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date above reflects the last change. Questions go
          to <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. See also our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Prose>
    </>
  );
}

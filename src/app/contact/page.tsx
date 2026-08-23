import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach Small Batch Bourbon about corrections, coverage, or partnerships.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        intro="Corrections, coverage requests, and partnership questions all land in the same inbox."
      />
      <Prose>
        <p>
          Email us at{" "}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. We read
          everything and reply to most of it.
        </p>

        <h2>Corrections</h2>
        <p>
          If a bottle fact on this site is wrong, tell us and point us at the source.
          Getting the record right matters more to us than being right the first time.
          Corrections to published pages are made promptly and noted where the change is
          material.
        </p>

        <h2>Samples and review requests</h2>
        <p>
          We accept samples, and accepting one guarantees nothing — not coverage, not a
          timeline, and certainly not a favorable verdict. Anything sent to us is disclosed
          on the page where it appears.
        </p>

        <h2>Advertising and partnerships</h2>
        <p>
          We&apos;re open to sponsorship and affiliate relationships that fit the audience.
          What isn&apos;t for sale: scores, verdicts, ranking positions, and What We&apos;d
          Pay thresholds.
        </p>
      </Prose>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/Prose";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Small Batch Bourbon collects, why, and how to get it removed.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        intro="We collect as little as we can get away with, and we tell you what it's for."
        updated="August 2026"
      />
      <Prose>
        <h2>Who we are</h2>
        <p>
          {site.name} operates {site.domain}. You can reach us at{" "}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Age acknowledgement.</strong> When you confirm you are 21 or older we
            store a first-party cookie on your device so you aren&apos;t asked again. It
            records only that the confirmation happened — not your age or date of birth.
          </li>
          <li>
            <strong>Email address.</strong> If you subscribe to Proof and Perspective, we send
            your email address and the part of the site you signed up from to our email
            provider so they can deliver the newsletter.
          </li>
          <li>
            <strong>Usage analytics.</strong> Aggregate, cookieless measurement of pages
            viewed, features used, and links clicked, so we know which content is worth
            writing more of. Our analytics providers do not set cookies, do not store
            identifiers on your device, and do not build a profile of you across sites or
            over time. We cannot tell who you are from this data, and neither can they.
          </li>
          <li>
            <strong>Server logs.</strong> Standard request data, including IP address,
            retained briefly for security and abuse prevention.
          </li>
        </ul>
        <p>
          We do not ask for accounts, payment details, date of birth, or precise location.
        </p>

        <h2>Service providers</h2>
        <p>
          We rely on third parties to host the site, deliver email, and measure usage.
          Those providers process data on our behalf under their own terms. We do not sell
          your personal information, and we do not share it for cross-context behavioral
          advertising.
        </p>

        <h2>Cookies and similar technologies</h2>
        <p>
          This site sets <strong>one cookie</strong>. It records that you confirmed you are
          21 or older, so you are not asked again on every page. It is strictly necessary
          for the site to work as intended and contains nothing but that acknowledgement.
        </p>
        <p>
          We deliberately chose analytics that set no cookies and no device identifiers.
          That is why you are not asked to accept anything before reading: there is
          nothing to accept. If we ever adopt a tool that tracks you, we will ask first
          rather than assume.
        </p>
        <p>
          You can block or clear cookies in your browser at any time. Clearing the age
          cookie simply means you&apos;ll see the 21+ prompt again.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>Unsubscribe from any Proof and Perspective email using the link in its footer.</li>
          <li>
            Ask us to access, correct, or delete the personal information we hold by
            emailing <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
          </li>
          <li>
            Depending on where you live, you may have additional rights under laws such as
            the GDPR or the CCPA/CPRA. We honor valid requests regardless of where you
            live.
          </li>
        </ul>

        <h2>Children</h2>
        <p>
          This site is intended only for adults of legal drinking age. We do not knowingly
          collect information from anyone under 21. If you believe a minor has provided us
          information, contact us and we will delete it.
        </p>

        <h2>Retention</h2>
        <p>
          Subscriber email addresses are kept until you unsubscribe or ask for deletion.
          Analytics data is retained in aggregate. Server logs are kept for a short period.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes materially we&apos;ll update the date at the top of this
          page. See also our <Link href="/terms">Terms of Use</Link> and{" "}
          <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.
        </p>
      </Prose>
    </>
  );
}

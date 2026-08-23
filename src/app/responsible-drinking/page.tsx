import type { Metadata } from "next";
import { PageHeader, Prose } from "@/components/Prose";

export const metadata: Metadata = {
  title: "Responsible Drinking",
  description:
    "Drinking well means drinking less, and knowing where to get help if you need it.",
  alternates: { canonical: "/responsible-drinking" },
};

export default function ResponsibleDrinkingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Standards"
        title="Responsible Drinking"
        intro="We write about buying bourbon well. Drinking it well is the part that actually matters."
        updated="August 2026"
      />
      <Prose>
        <h2>The basics</h2>
        <ul>
          <li>This site is for adults 21 and older.</li>
          <li>Never drink and drive. Arrange the ride before the first pour.</li>
          <li>
            Don&apos;t drink if you&apos;re pregnant, trying to become pregnant, or taking
            medication that interacts with alcohol.
          </li>
          <li>
            Bourbon is typically 40–65% ABV. A standard drink is about 1.5 oz of
            80-proof spirit — a generous pour is often two.
          </li>
        </ul>

        <h2>Our stance</h2>
        <p>
          A better bottle is not an excuse for more of it. Nothing we publish claims that
          drinking improves health, relationships, or success, and we&apos;re not
          interested in the kind of collecting culture that treats volume as achievement.
          If a bottle is worth the money, it&apos;s worth taking your time with.
        </p>

        <h2>Getting help</h2>
        <p>
          If drinking has become something you or someone close to you worries about, help
          is free and confidential.
        </p>
        <ul>
          <li>
            <strong>SAMHSA National Helpline (US):</strong>{" "}
            <a href="tel:18006624357">1-800-662-4357</a> — 24/7, 365 days a year, free and
            confidential treatment referral and information.
          </li>
          <li>
            <strong>988 Suicide &amp; Crisis Lifeline (US):</strong>{" "}
            <a href="tel:988">call or text 988</a>.
          </li>
          <li>
            <strong>Alcoholics Anonymous:</strong>{" "}
            <a href="https://www.aa.org" rel="noopener noreferrer" target="_blank">
              aa.org
            </a>
          </li>
        </ul>
        <p>
          Outside the United States, contact your national health service for local support
          lines.
        </p>
      </Prose>
    </>
  );
}

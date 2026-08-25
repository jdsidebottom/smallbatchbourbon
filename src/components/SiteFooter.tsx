import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";
import { site } from "@/lib/site";

const COLUMNS = [
  {
    heading: "Site",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "The Weekly Pour", href: "/#weekly-pour" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
    ],
  },
  {
    heading: "Standards",
    links: [
      { label: "Editorial Policy", href: "/editorial-policy" },
      { label: "Advertising & Sponsorship", href: "/advertising-policy" },
      { label: "Responsible Drinking", href: "/responsible-drinking" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-line bg-ink-raised">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="flex items-center gap-2.5">
              <BrandMark size={40} />
              <Wordmark className="text-lg text-cream" />
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-muted">
              {site.tagline} Practical bourbon buying guidance, real-world value, and
              better alternatives.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-xs font-semibold tracking-[0.16em] text-cream uppercase">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-[2.75rem] items-center text-sm text-cream-muted transition hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-ink-line pt-8">
          <p className="text-xs leading-relaxed text-cream-muted">
            <strong className="font-semibold text-cream-dim">21+ only.</strong> This site is
            intended for adults of legal drinking age. Please enjoy responsibly, and never
            drink and drive.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-cream-muted">
            Small Batch Bourbon does not sell or ship alcohol. Purchase links direct you to
            licensed third-party retailers, who are responsible for age verification and
            fulfillment. Some links may earn us a commission at no additional cost to you —
            see our{" "}
            <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-cream-dim">
              Affiliate Disclosure
            </Link>
            .
          </p>
          <p className="mt-6 text-xs text-cream-muted">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

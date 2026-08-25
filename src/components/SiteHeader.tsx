"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";
import { track } from "@/lib/analytics";

/**
 * Launch navigation (PRD §6). Sections that are not built yet link to the
 * landing-page previews rather than posing as finished destinations — no dead
 * navigation links.
 */
const NAV = [
  { label: "Bourbon", href: "/bourbon" },
  { label: "What We'd Pay", href: "/what-wed-pay" },
  { label: "At the Store", href: "/at-the-store" },
  { label: "Gear", href: "/gear" },
  { label: "Learn", href: "/learn" },
  { label: "Find My Next Pour", href: "/#find-my-next-pour", note: "Coming soon" },
  { label: "The Weekly Pour", href: "/#weekly-pour" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 py-2 text-cream"
          aria-label="Small Batch Bourbon — home"
        >
          {/* priority: the mark is in the header of every page, so it should not
              wait behind lazy loading. */}
          <BrandMark size={40} priority />
          <Wordmark className="text-lg" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-cream-dim transition hover:text-cream"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-cream lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            {open ? (
              <>
                <path d="M5 5l12 12" />
                <path d="M17 5L5 17" />
              </>
            ) : (
              <>
                <path d="M3 6h16" />
                <path d="M3 11h16" />
                <path d="M3 16h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t border-ink-line bg-ink-raised lg:hidden"
        >
          <ul className="mx-auto max-w-6xl px-5 py-2">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-ink-line last:border-b-0">
                <Link
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    if (item.note) track("feature_interest_clicked", { feature: item.label, placement: "mobile_nav" });
                  }}
                  className="flex min-h-[3rem] items-center justify-between gap-4 py-3 text-cream"
                >
                  <span>{item.label}</span>
                  {item.note && (
                    <span className="rounded-full border border-ink-line px-2 py-0.5 text-[0.65rem] tracking-[0.12em] text-cream-muted uppercase">
                      {item.note}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

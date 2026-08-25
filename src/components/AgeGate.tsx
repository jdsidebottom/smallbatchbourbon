"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGE_GATE_COOKIE, AGE_GATE_MAX_AGE_DAYS } from "@/lib/age-gate";
import { track } from "@/lib/analytics";
import { BrandMark } from "@/components/BrandMark";
import { Wordmark } from "@/components/Wordmark";

/**
 * Site-wide 21+ gate (PRD §7.1). The markup is server-rendered and dismissed
 * before paint by the inline bootstrap script when the acknowledgement cookie
 * is present, so returning visitors are not repeatedly challenged.
 *
 * This is audience screening only — licensed retail partners remain
 * responsible for transactional age verification.
 */
export function AgeGate() {
  const pathname = usePathname();
  const enterRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.documentElement.getAttribute("data-age-gate") !== "pending") return;

    enterRef.current?.focus();

    // Keep focus inside the gate while it is up.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The under-21 exit must not sit behind the gate it just routed away from.
  if (pathname === "/not-eligible") return null;

  const enter = () => {
    const maxAge = AGE_GATE_MAX_AGE_DAYS * 24 * 60 * 60;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AGE_GATE_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
    document.documentElement.setAttribute("data-age-gate", "ok");
    track("age_gate_entered");
  };

  return (
    <div
      id="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink px-6 py-10"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md text-center"
      >
        <BrandMark size={88} priority className="mx-auto mb-6" />
        <Wordmark className="mx-auto mb-10 h-auto w-52 text-cream" />

        {/* Not an <h1>: the gate ships in the DOM on every page, so its title
            must not compete with the page's own heading. */}
        <p
          id="age-gate-title"
          className="font-display text-3xl leading-tight font-semibold text-cream sm:text-4xl"
        >
          Are you 21 or older?
        </p>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-cream-dim">
          You must be of legal drinking age to enter Small Batch Bourbon.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            ref={enterRef}
            type="button"
            onClick={enter}
            className="min-h-[3rem] w-full rounded-full bg-amber px-6 text-sm font-semibold tracking-[0.14em] text-ink uppercase transition hover:bg-amber-glow"
          >
            Enter — I&apos;m 21+
          </button>
          <Link
            href="/not-eligible"
            className="flex min-h-[3rem] w-full items-center justify-center rounded-full border border-ink-line px-6 text-sm font-semibold tracking-[0.14em] text-cream-dim uppercase transition hover:border-cream-muted hover:text-cream"
          >
            I&apos;m under 21
          </Link>
        </div>

        <p className="mt-8 text-xs tracking-[0.14em] text-cream-muted uppercase">
          Please enjoy responsibly
        </p>
        <p className="mt-4 text-xs text-cream-muted">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-cream-dim">
            Privacy
          </Link>
          <span aria-hidden="true" className="px-2">·</span>
          <Link href="/terms" className="underline underline-offset-4 hover:text-cream-dim">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}

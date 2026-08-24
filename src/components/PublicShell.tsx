"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { shouldInertShell } from "@/lib/age-gate";

/**
 * The public site chrome — header, footer and 21+ gate — wraps everything
 * except the admin, which has its own shell and is never age-gated or indexed.
 */

/**
 * Tracks the gate state that the pre-paint bootstrap script writes onto <html>.
 *
 * A MutationObserver rather than an event, so this stays correct no matter who
 * flips the attribute — the bootstrap before hydration, or the gate itself when
 * a visitor enters.
 */
function subscribeToGate(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-age-gate"],
  });
  return () => observer.disconnect();
}

const gateIsPending = () =>
  document.documentElement.getAttribute("data-age-gate") === "pending";

// The server always renders the gate up; the bootstrap dismisses it before
// paint for visitors who have already acknowledged.
const gateIsPendingOnServer = () => true;

export function PublicShell({
  header,
  footer,
  gate,
  skipLink,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  gate: React.ReactNode;
  skipLink: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  const pending = useSyncExternalStore(
    subscribeToGate,
    gateIsPending,
    gateIsPendingOnServer,
  );

  if (isAdmin) return <>{children}</>;

  const inert = shouldInertShell(pending, pathname);

  return (
    <>
      {/*
        `inert` is what actually keeps a keyboard user out of the site behind
        the gate. The gate's own Tab handler only wraps at its first and last
        control, so focus arriving from the browser chrome — Ctrl+L, then Tab —
        would otherwise land on the skip link and walk the whole page while the
        gate was still up. That matters more than ordinary focus hygiene here:
        the gate is a compliance control, and `aria-modal="true"` was telling
        screen readers the rest of the page was unreachable when it was not.
      */}
      <div inert={inert || undefined} suppressHydrationWarning>
        {skipLink}
        {header}
        <main id="main">{children}</main>
        {footer}
      </div>
      {gate}
    </>
  );
}

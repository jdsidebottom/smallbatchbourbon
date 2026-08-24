"use client";

import Link from "next/link";
import { track, type BusinessEvent } from "@/lib/analytics";

/**
 * A link that records a business event when it is followed.
 *
 * This exists so that firing an analytics event does not force a whole card or
 * section to become a client component. Anything passed as `children` is
 * rendered on the server and arrives here already built, so only this wrapper —
 * a few lines — ships to the browser and hydrates, rather than the markup of
 * every card in a list (PRD §22: avoid unnecessary client-side hydration).
 *
 * `external` swaps next/link for a plain anchor, which is what outbound
 * affiliate links need: they leave the site, so client-side routing is wrong
 * and the rel/target attributes matter.
 */
export function TrackedLink({
  href,
  event,
  params,
  className,
  external = false,
  rel,
  target,
  children,
}: {
  href: string;
  event: BusinessEvent;
  params?: Record<string, string | number | boolean | undefined>;
  className?: string;
  external?: boolean;
  rel?: string;
  target?: string;
  children: React.ReactNode;
}) {
  const onClick = () => track(event, params);

  if (external) {
    return (
      <a href={href} onClick={onClick} className={className} rel={rel} target={target}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

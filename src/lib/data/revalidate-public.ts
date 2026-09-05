import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Invalidates every public surface that renders bottle or guide data.
 *
 * Editorial writes used to refresh only the admin screens they came from, so an
 * unpublished bottle or a corrected price ladder stayed visible in already
 * generated HTML until the hourly ISR window came round. RLS stops the *next*
 * read; it cannot retract a page that has already been rendered and cached.
 *
 * Deliberately coarse. These surfaces share bottles, prices and guide
 * membership in ways a per-entity tag would have to model exactly, and getting
 * that wrong fails silently — a stale page nobody notices. Regenerating a
 * handful of routes after an editorial write is the cheaper mistake.
 *
 * This does not reach browser or CDN copies of the search and alternatives API
 * responses; those obey the TTLs they were served with.
 */
export function revalidatePublicContent() {
  for (const route of ["/bourbon", "/what-wed-pay", "/best", "/alternatives", "/learn", "/gear"]) {
    revalidatePath(route);
  }

  // Every detail page of each type, since a rename or unpublish changes pages
  // beyond the one that was edited — a guide that features it, for instance.
  for (const route of [
    "/bourbon/[slug]",
    "/best/[slug]",
    "/alternatives/[slug]",
    "/learn/[slug]",
    "/gear/[slug]",
  ]) {
    revalidatePath(route, "page");
  }

  revalidatePath("/sitemap.xml");
}

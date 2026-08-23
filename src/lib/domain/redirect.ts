/**
 * Where the admin sign-in form sends you after a successful login.
 *
 * Only same-site admin paths are honoured, so `?next=` cannot be used to bounce
 * a freshly authenticated editor off to an attacker's page. Anything else falls
 * back to the admin home.
 */
export function safeAdminRedirect(next: string | null | undefined): string {
  if (!next) return "/admin";

  // Reject protocol-relative ("//evil.com") and absolute URLs outright, and
  // anything containing a backslash, which some browsers normalise to "/".
  if (next.includes("\\") || next.startsWith("//")) return "/admin";

  return /^\/admin(\/|$)/.test(next) ? next : "/admin";
}

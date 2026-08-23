"use client";

import { usePathname } from "next/navigation";

/**
 * The public site chrome — header, footer and 21+ gate — wraps everything
 * except the admin, which has its own shell and is never age-gated or indexed.
 */
export function PublicShell({
  header,
  footer,
  gate,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  gate: React.ReactNode;
  children: React.ReactNode;
}) {
  const isAdmin = usePathname()?.startsWith("/admin") ?? false;

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {header}
      <main id="main">{children}</main>
      {footer}
      {gate}
    </>
  );
}

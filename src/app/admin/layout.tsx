import type { Metadata } from "next";
import Link from "next/link";
import { getAdminIdentity } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Bottles", href: "/admin/bottles" },
  { label: "Brands", href: "/admin/brands" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const identity = await getAdminIdentity();

  return (
    <div className="min-h-dvh bg-ink">
      {identity && (
        <header className="border-b border-ink-line bg-ink-raised">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
            <Link href="/admin" className="font-display text-sm font-semibold text-cream">
              SBB <span className="text-amber">Admin</span>
            </Link>

            <nav aria-label="Admin" className="flex flex-1 flex-wrap items-center gap-5">
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

            <span className="text-xs text-cream-muted">
              {identity.displayName ?? identity.email}
              <span className="ml-2 rounded-full border border-ink-line px-2 py-0.5 tracking-[0.1em] uppercase">
                {identity.role}
              </span>
            </span>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-h-9 rounded-full border border-ink-line px-4 text-xs text-cream-dim transition hover:border-amber hover:text-amber"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
      )}

      <main id="main">{children}</main>
    </div>
  );
}

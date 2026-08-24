import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Inter } from "next/font/google";
import { AgeGate } from "@/components/AgeGate";
import { Analytics } from "@/components/Analytics";
import { SiteFooter } from "@/components/SiteFooter";
import { PublicShell } from "@/components/PublicShell";
import { SiteHeader } from "@/components/SiteHeader";
import { AGE_GATE_BOOTSTRAP } from "@/lib/age-gate";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  variable: "--font-fraunces",
});

/**
 * Handwriting, used only for the struck-through annotation in the hero. Loaded
 * as a variable so nothing else can reach for it by accident.
 */
const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  weight: ["600"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  // Search Console verification. A DNS TXT record is preferable where DNS is
  // managed at Cloudflare; this is the fallback and is omitted when unset.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  other: { rating: "adult" },
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The bootstrap script below rewrites data-age-gate before React hydrates,
    // which is the point of it — so the mismatch on <html> is expected.
    <html
      lang="en"
      data-age-gate="pending"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${caveat.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: AGE_GATE_BOOTSTRAP }} />
      </head>
      <body className="min-h-dvh antialiased">
        <PublicShell
          header={<SiteHeader />}
          footer={<SiteFooter />}
          gate={<AgeGate />}
          skipLink={
            // Inside the shell so it is inert along with everything else while
            // the age gate is up.
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:rounded-full focus:bg-amber focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink"
            >
              Skip to content
            </a>
          }
        >
          {children}
        </PublicShell>
        <Analytics />
      </body>
    </html>
  );
}

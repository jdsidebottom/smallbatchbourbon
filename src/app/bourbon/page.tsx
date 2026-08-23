import type { Metadata } from "next";
import Link from "next/link";
import { BottleCard } from "@/components/bottle/BottleCard";
import { BottleSearch } from "@/components/bottle/BottleSearch";
import { listPublishedBottles } from "@/lib/data/public-bottles";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bourbon",
  description:
    "Every bourbon we've reviewed, with the most we'd pay for each one. No hype premiums, no invented scores.",
  alternates: { canonical: "/bourbon" },
};

export default async function BourbonIndexPage() {
  const bottles = await listPublishedBottles();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Bourbon</p>
      <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
        Every bottle we&apos;ve put a number on.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream-dim">
        The facts, an honest verdict, and the most we&apos;d pay — for each one.
      </p>

      <div className="mt-8 max-w-xl">
        <BottleSearch />
      </div>

      {bottles.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-ink-line p-10 text-center">
          <p className="text-cream-dim">No bottle reviews are published yet.</p>
          <p className="mt-3 text-sm text-cream-muted">
            We&apos;d rather publish nothing than pad this page out.{" "}
            <Link href="/#weekly-pour" className="text-amber underline underline-offset-4">
              Get The Weekly Pour
            </Link>{" "}
            and you&apos;ll hear when the first reviews land.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-12 text-sm text-cream-muted">
            {bottles.length} bottle{bottles.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bottles.map((bottle) => (
              <li key={bottle.id}>
                <BottleCard bottle={bottle} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

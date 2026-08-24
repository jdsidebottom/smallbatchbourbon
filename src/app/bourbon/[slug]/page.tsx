import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateLinks } from "@/components/bottle/AffiliateLinks";
import { BottleCard } from "@/components/bottle/BottleCard";
import { BottleImage } from "@/components/bottle/BottleImage";
import { VerdictLadder } from "@/components/bottle/VerdictLadder";
import { TastingProfile } from "@/components/bottle/TastingProfile";
import { getPublishedBottle, listPublishedSlugs } from "@/lib/data/public-bottles";
import { getGuidesFeaturingBottle } from "@/lib/data/public-articles";
import { articlePath } from "@/lib/domain/article";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { formatCents } from "@/lib/domain/bottle";
import { site } from "@/lib/site";

// Public pages are statically generated and revalidated, so ordinary traffic
// does not hit the database on every request (PRD §16).
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bottle = await getPublishedBottle(slug);
  if (!bottle) return { title: "Bottle not found" };

  const wouldPay = bottle.price ? formatCents(bottle.price.buy_max_cents) : null;
  const description = bottle.review?.quick_take
    ? bottle.review.quick_take.slice(0, 155)
    : `${bottle.name}${bottle.classification ? ` — ${bottle.classification}` : ""}.${
        wouldPay ? ` What we'd pay: up to ${wouldPay}.` : ""
      }`;

  return {
    title: bottle.name,
    description,
    alternates: { canonical: `/bourbon/${bottle.slug}` },
    openGraph: {
      type: "article",
      title: `${bottle.name} — ${site.name}`,
      description,
      url: `${site.url}/bourbon/${bottle.slug}`,
    },
  };
}

const MASH_BILL_LABEL: Record<string, string> = {
  disclosed: "",
  partial: "Partially disclosed",
  undisclosed: "Undisclosed",
};

export default async function BottlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bottle = await getPublishedBottle(slug);
  if (!bottle) notFound();

  // Closes the loop between the canonical record and the commercial content
  // that recommends it (PRD §20 internal linking).
  const guides = await getGuidesFeaturingBottle(bottle.id);

  const { price, review, brand } = bottle;

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Producer", value: bottle.producer ?? "Undisclosed" },
    { label: "Actual distiller", value: bottle.actual_distiller ?? "Undisclosed" },
    { label: "Classification", value: bottle.classification ?? "Not stated" },
    {
      label: "Proof",
      value: bottle.proof !== null ? `${Number(bottle.proof)} proof` : "Not stated",
    },
    { label: "ABV", value: bottle.abv !== null ? `${Number(bottle.abv)}%` : "Not stated" },
    {
      label: "Age",
      value: bottle.has_age_statement
        ? bottle.age_years !== null
          ? `${Number(bottle.age_years)} years`
          : "Age stated"
        : "No age statement",
    },
    {
      label: "Mash bill",
      value:
        bottle.mash_bill_status === "disclosed" || bottle.mash_bill_status === "partial"
          ? (bottle.mash_bill_details ?? MASH_BILL_LABEL[bottle.mash_bill_status])
          : "Undisclosed",
    },
  ];

  return (
    <article className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Bourbon", path: "/bourbon" },
          { name: bottle.name, path: `/bourbon/${bottle.slug}` },
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-cream-muted">
        <Link href="/bourbon" className="hover:text-cream">
          Bourbon
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-cream-dim">{bottle.name}</span>
      </nav>

      {/* Above the fold, in PRD §8.1 order: name, classification, reference
          price, What We'd Pay, proof and age, then the verdict. */}
      <header className="mt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          {/* priority: this is the largest above-the-fold element, so it is the
              LCP candidate on a bottle page and must not wait for lazy loading. */}
          <BottleImage
            path={bottle.image_path}
            alt={bottle.image_alt}
            sizes="(min-width: 640px) 12rem, 40vw"
            priority
            className="w-32 shrink-0 sm:w-48"
          />

          <div className="min-w-0 flex-1">
            {brand && (
              <p className="text-xs font-semibold tracking-[0.16em] text-amber uppercase">
                {brand.name}
              </p>
            )}
            <h1 className="mt-3 text-4xl leading-tight text-cream sm:text-5xl">{bottle.name}</h1>
            {bottle.classification && (
              <p className="mt-2 text-cream-dim">{bottle.classification}</p>
            )}
          </div>
        </div>

        {price && (
          <div className="mt-8 grid gap-4 rounded-2xl border border-ink-line bg-ink-card p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <p className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                Reference price
              </p>
              <p className="mt-1 text-2xl text-cream">{formatCents(price.msrp_cents)}</p>
              {price.msrp_verified_at ? (
                <p className="mt-1 text-xs text-cream-muted">
                  Verified {price.msrp_verified_at}
                  {price.msrp_source_url && (
                    <>
                      {" · "}
                      <a
                        href={price.msrp_source_url}
                        rel="nofollow noopener"
                        target="_blank"
                        className="underline underline-offset-4 hover:text-cream-dim"
                      >
                        source
                      </a>
                    </>
                  )}
                </p>
              ) : (
                <p className="mt-1 text-xs text-cream-muted">Not verified</p>
              )}
            </div>

            <div className="sm:border-l sm:border-ink-line sm:pl-6">
              <p className="text-[0.65rem] tracking-[0.14em] text-cream-muted uppercase">
                What we&apos;d pay
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber">
                up to {formatCents(price.buy_max_cents)}
              </p>
              <p className="mt-1 text-xs text-cream-muted">
                Editorial value judgment, not live pricing.
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-cream-dim">
          {bottle.proof !== null && <span>{Number(bottle.proof)} proof</span>}
          {bottle.abv !== null && <span>{Number(bottle.abv)}% ABV</span>}
          <span>
            {bottle.has_age_statement && bottle.age_years !== null
              ? `${Number(bottle.age_years)} years`
              : "No age statement"}
          </span>
        </p>

        {review?.quick_take && (
          <p className="mt-6 text-lg leading-relaxed text-cream">{review.quick_take}</p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#check-price"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber px-7 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
          >
            Check price
          </a>
          {bottle.alternatives.length > 0 && (
            <a
              href="#alternatives"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink-line px-7 text-sm font-semibold tracking-[0.12em] text-cream uppercase transition hover:border-amber hover:text-amber"
            >
              Find similar bourbons
            </a>
          )}
        </div>
      </header>

      <div className="mt-14 space-y-12">
        {price && (
          <section>
            <h2 className="font-display text-2xl text-cream">The price ladder</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream-muted">
              What a shelf price means for this bottle. These are our editorial
              thresholds — we don&apos;t know what your store is charging tonight.
            </p>
            <div className="mt-5 rounded-2xl border border-ink-line bg-ink-card px-5 sm:px-6">
              <VerdictLadder ladder={price} />
            </div>
            {price.editorial_note && (
              <p className="mt-4 text-sm leading-relaxed text-cream-dim">{price.editorial_note}</p>
            )}
          </section>
        )}

        <section id="check-price" className="scroll-mt-20">
          <AffiliateLinks bottleSlug={bottle.slug} retailers={bottle.retailers} />
        </section>

        {bottle.tasting && <TastingProfile profile={bottle.tasting} />}

        {(review?.best_for || review?.skip_if) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {review.best_for && (
              <div className="rounded-2xl border border-ink-line bg-ink-card p-5">
                <h2 className="font-display text-lg text-verdict-steal">Best for</h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-dim">{review.best_for}</p>
              </div>
            )}
            {review.skip_if && (
              <div className="rounded-2xl border border-ink-line bg-ink-card p-5">
                <h2 className="font-display text-lg text-verdict-maybe">Skip if</h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-dim">{review.skip_if}</p>
              </div>
            )}
          </section>
        )}

        {review && (review.nose || review.palate || review.finish || review.overall) && (
          <section>
            <h2 className="font-display text-2xl text-cream">The review</h2>
            <dl className="mt-5 divide-y divide-ink-line">
              {(
                [
                  ["Nose", review.nose],
                  ["Palate", review.palate],
                  ["Finish", review.finish],
                  ["Overall", review.overall],
                ] as const
              )
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="py-4 sm:flex sm:gap-8">
                    <dt className="w-24 shrink-0 text-xs font-semibold tracking-[0.14em] text-amber uppercase">
                      {label}
                    </dt>
                    <dd className="mt-1 flex-1 leading-relaxed text-cream-dim sm:mt-0">{value}</dd>
                  </div>
                ))}
            </dl>

            {review.sample_provided && (
              <p className="mt-4 rounded-xl border border-ink-line px-4 py-3 text-xs leading-relaxed text-cream-muted">
                This bottle was provided to us as a sample. That buys no coverage and no
                favourable verdict — see our{" "}
                <Link href="/editorial-policy" className="underline underline-offset-4">
                  Editorial Policy
                </Link>
                .
              </p>
            )}
          </section>
        )}

        {bottle.description && (
          <section>
            <h2 className="font-display text-2xl text-cream">About this bottle</h2>
            <p className="mt-4 leading-relaxed text-cream-dim">{bottle.description}</p>
          </section>
        )}

        <section>
          <h2 className="font-display text-2xl text-cream">The facts</h2>
          <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-4 border-b border-ink-line py-3">
                <dt className="text-sm text-cream-muted">{fact.label}</dt>
                <dd className="text-right text-sm text-cream-dim">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-cream-muted">
            Anything a producer won&apos;t confirm is listed as undisclosed rather than
            guessed at. Spotted something wrong?{" "}
            <Link href="/contact" className="underline underline-offset-4 hover:text-cream-dim">
              Tell us
            </Link>
            .
          </p>
        </section>

        {bottle.alternatives.length > 0 && (
          <section id="alternatives" className="scroll-mt-20">
            <h2 className="font-display text-2xl text-cream">If you can&apos;t find it</h2>
            <p className="mt-2 text-sm text-cream-muted">
              Bottles we&apos;d reach for instead, drawn from our own records.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {bottle.alternatives.map((alt) => (
                <li key={alt.bottle.id}>
                  <BottleCard
                    bottle={alt.bottle}
                    note={alt.note}
                    event="alternative_clicked"
                    eventParams={{ from: bottle.slug, relationship: alt.relationship_type }}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {guides.length > 0 && (
          <section aria-labelledby="featured-in">
            <h2 id="featured-in" className="font-display text-2xl text-cream">
              Featured in
            </h2>
            <ul className="mt-5 space-y-2">
              {guides.map((guide) => (
                <li key={guide.id}>
                  <Link
                    href={articlePath(guide.article_type, guide.slug)}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-ink-line bg-ink-card p-4 transition hover:border-amber/50"
                  >
                    <span className="min-w-0 flex-1 text-cream">{guide.title}</span>
                    <span className="shrink-0 text-xs tracking-[0.12em] text-amber uppercase">
                      {guide.label ?? `Pick #${guide.rank}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="border-t border-ink-line pt-6 text-xs text-cream-muted">
          Last updated{" "}
          <time dateTime={bottle.updated_at}>
            {new Date(bottle.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          . Please enjoy responsibly.
        </footer>
      </div>
    </article>
  );
}

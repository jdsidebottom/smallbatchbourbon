import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getBottle, listBrands } from "@/lib/data/bottles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addAlternative,
  addRetailerDestination,
  addSource,
  deleteAlternative,
  deleteRetailerDestination,
  deleteSource,
  savePriceLadder,
  saveReview,
  saveTastingProfile,
  saveBottle,
  setPublicationStatus,
} from "@/app/admin/bottles/actions";
import { BottleIdentityForm } from "@/components/admin/BottleIdentityForm";
import {
  AddAlternativeForm,
  AddRetailerForm,
  AddSourceForm,
  PriceLadderForm,
  ReviewForm,
  TastingProfileForm,
} from "@/components/admin/BottleValueForms";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PublishPanel } from "@/components/admin/PublishPanel";
import { formatCents } from "@/lib/domain/bottle";

export const dynamic = "force-dynamic";

export default async function EditBottlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const detail = await getBottle(id);
  if (!detail) notFound();

  const supabase = createAdminClient();
  const [brands, otherBottles, retailers] = await Promise.all([
    listBrands(),
    supabase.from("bottles").select("id, name").neq("id", id).order("name"),
    supabase.from("retailers").select("id, name").order("name"),
  ]);

  const { bottle, price, review, tasting, completeness } = detail;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin/bottles" className="text-sm text-cream-muted hover:text-cream">
        ← Bottles
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-cream">{bottle.name}</h1>
        <span className="text-sm text-cream-muted">
          /bourbon/{bottle.slug} · {bottle.status}
        </span>
      </div>

      <div className="mt-8 space-y-6">
        <PublishPanel
          status={bottle.status}
          completeness={completeness}
          setStatus={async (next) => {
            "use server";
            return setPublicationStatus(id, next);
          }}
        />

        <BottleIdentityForm
          action={saveBottle.bind(null, id)}
          brands={brands}
          defaults={{
            slug: bottle.slug,
            brandId: bottle.brand_id,
            name: bottle.name,
            classification: bottle.classification,
            proof: bottle.proof,
            abv: bottle.abv,
            hasAgeStatement: bottle.has_age_statement,
            ageYears: bottle.age_years,
            mashBillStatus: bottle.mash_bill_status,
            mashBillDetails: bottle.mash_bill_details,
            producer: bottle.producer,
            actualDistiller: bottle.actual_distiller,
            description: bottle.description,
            imagePath: bottle.image_path,
            imageAlt: bottle.image_alt,
          }}
        />

        <PriceLadderForm action={savePriceLadder.bind(null, id)} price={price} />

        <ReviewForm action={saveReview.bind(null, id)} review={review} />

        <TastingProfileForm action={saveTastingProfile.bind(null, id)} tasting={tasting} />

        {/* ------------------------------------------------- alternatives */}
        <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
          <h2 className="font-display text-xl text-cream">Alternatives</h2>
          {detail.alternatives.length === 0 ? (
            <p className="mt-3 text-sm text-cream-muted">None linked yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-line">
              {detail.alternatives.map((alt) => (
                <li key={alt.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex-1 text-sm text-cream">
                    {alt.target?.name ?? "Unknown bottle"}
                    <span className="ml-2 text-xs text-cream-muted">
                      {alt.relationship_type} · rank {alt.rank}
                      {alt.target?.status !== "published" && " · target not published"}
                    </span>
                  </span>
                  <DeleteButton
                    onDelete={async () => {
                      "use server";
                      return deleteAlternative(id, alt.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <AddAlternativeForm
          action={addAlternative.bind(null, id)}
          bottles={(otherBottles.data ?? []) as { id: string; name: string }[]}
        />

        {/* ---------------------------------------------------- retailers */}
        <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
          <h2 className="font-display text-xl text-cream">Retailer destinations</h2>
          {detail.retailers.length === 0 ? (
            <p className="mt-3 text-sm text-cream-muted">None linked yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-line">
              {detail.retailers.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 text-sm text-cream">
                    {row.retailer?.name ?? "Unknown retailer"}
                    <span className="mt-0.5 block truncate text-xs text-cream-muted">
                      {row.destination_url}
                    </span>
                    {row.retailer && !row.retailer.is_active && (
                      <span className="text-xs text-verdict-maybe">
                        Merchant is inactive — links are suppressed site-wide.
                      </span>
                    )}
                  </span>
                  <DeleteButton
                    onDelete={async () => {
                      "use server";
                      return deleteRetailerDestination(id, row.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <AddRetailerForm
          action={addRetailerDestination.bind(null, id)}
          retailers={(retailers.data ?? []) as { id: string; name: string }[]}
        />

        {/* ------------------------------------------------------ sources */}
        <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
          <h2 className="font-display text-xl text-cream">Sources</h2>
          <p className="mt-1.5 text-sm text-cream-muted">
            Editorial-internal. Never exposed to readers.
          </p>
          {detail.sources.length === 0 ? (
            <p className="mt-3 text-sm text-cream-muted">No sources recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-line">
              {detail.sources.map((source) => (
                <li key={source.id} className="flex flex-wrap items-start gap-3 py-3">
                  <span className="min-w-0 flex-1 text-sm text-cream">
                    {source.title ?? source.url ?? "Untitled source"}
                    <span className="mt-0.5 block text-xs text-cream-muted">
                      {source.field_name ? `${source.field_name} · ` : ""}
                      {source.source_type} · verified {source.verified_at}
                    </span>
                  </span>
                  <DeleteButton
                    onDelete={async () => {
                      "use server";
                      return deleteSource(id, source.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <AddSourceForm action={addSource.bind(null, id)} />

        {price && (
          <p className="pb-4 text-center text-xs text-cream-muted">
            Current ladder — Steal ≤ {formatCents(price.steal_max_cents)} · Buy ≤{" "}
            {formatCents(price.buy_max_cents)} · Fair ≤ {formatCents(price.fair_max_cents)} ·
            Maybe ≤ {formatCents(price.maybe_max_cents)} · above that, Walk Away
          </p>
        )}
      </div>
    </div>
  );
}

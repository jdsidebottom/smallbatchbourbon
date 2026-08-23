import { requireAdmin } from "@/lib/auth";
import { listBrands } from "@/lib/data/bottles";
import { saveBrand } from "@/app/admin/brands/actions";
import { BrandForm } from "@/components/admin/BrandForm";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  await requireAdmin();
  const brands = await listBrands();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-display text-3xl text-cream">Brands</h1>
      <p className="mt-1 text-sm text-cream-muted">
        Every bottle belongs to a brand. Brands are shared across bottles, guides and
        alternatives.
      </p>

      <div className="mt-8">
        <BrandForm action={saveBrand} />
      </div>

      <section className="mt-8 rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
        <h2 className="font-display text-xl text-cream">Existing brands</h2>
        {brands.length === 0 ? (
          <p className="mt-3 text-sm text-cream-muted">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-line">
            {brands.map((brand) => (
              <li key={brand.id} className="py-3">
                <span className="text-sm text-cream">{brand.name}</span>
                <span className="mt-0.5 block text-xs text-cream-muted">
                  {brand.slug}
                  {brand.parent_company ? ` · ${brand.parent_company}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

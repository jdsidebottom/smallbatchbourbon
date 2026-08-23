import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listBrands } from "@/lib/data/bottles";
import { saveBottle } from "@/app/admin/bottles/actions";
import { BottleIdentityForm } from "@/components/admin/BottleIdentityForm";

export const dynamic = "force-dynamic";

export default async function NewBottlePage() {
  await requireAdmin();
  const brands = await listBrands();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin/bottles" className="text-sm text-cream-muted hover:text-cream">
        ← Bottles
      </Link>
      <h1 className="mt-4 font-display text-3xl text-cream">New bottle</h1>
      <p className="mt-2 text-sm leading-relaxed text-cream-dim">
        Start with the label facts. The record is created as a draft — value
        thresholds, review and sources are added on the next screen.
      </p>

      {brands.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-ink-line p-8 text-center text-sm text-cream-muted">
          Add a brand first — every bottle belongs to one.{" "}
          <Link href="/admin/brands" className="text-amber underline underline-offset-4">
            Go to brands
          </Link>
        </p>
      ) : (
        <div className="mt-8">
          <BottleIdentityForm
            action={saveBottle.bind(null, null)}
            brands={brands}
            submitLabel="Create draft"
            isNew
          />
        </div>
      )}
    </div>
  );
}

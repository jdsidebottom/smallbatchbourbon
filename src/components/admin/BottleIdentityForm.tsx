"use client";

import type { ActionResult } from "@/app/admin/bottles/actions";
import {
  ActionSection,
  CheckboxField,
  SelectField,
  TextArea,
  TextField,
} from "@/components/admin/fields";
import { MASH_BILL_STATUSES } from "@/lib/domain/bottle";

type Defaults = {
  slug?: string;
  brandId?: string;
  name?: string;
  classification?: string | null;
  proof?: number | null;
  abv?: number | null;
  hasAgeStatement?: boolean;
  ageYears?: number | null;
  mashBillStatus?: string | null;
  mashBillDetails?: string | null;
  producer?: string | null;
  actualDistiller?: string | null;
  description?: string | null;
};

export function BottleIdentityForm({
  action,
  brands,
  defaults = {},
  submitLabel,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  brands: { id: string; name: string }[];
  defaults?: Defaults;
  submitLabel?: string;
}) {
  return (
    <ActionSection
      title="Identity and production facts"
      description="What the label actually says. Anything a producer will not disclose stays undisclosed — never inferred."
      action={action}
      submitLabel={submitLabel}
    >
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="name"
              label="Bottle name"
              required
              defaultValue={defaults.name}
              error={errors.name}
            />
            <TextField
              name="slug"
              label="URL slug"
              hint="Becomes /bourbon/{slug}"
              required
              defaultValue={defaults.slug}
              error={errors.slug}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="brandId"
              label="Brand"
              defaultValue={defaults.brandId}
              placeholder="Choose a brand…"
              options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
              error={errors.brandId}
            />
            <TextField
              name="classification"
              label="Classification"
              hint="e.g. Kentucky Straight Bourbon · Small Batch"
              defaultValue={defaults.classification}
              error={errors.classification}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="proof"
              label="Proof"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={defaults.proof}
              error={errors.proof}
            />
            <TextField
              name="abv"
              label="ABV %"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={defaults.abv}
              error={errors.abv}
            />
          </div>

          <div className="rounded-xl border border-ink-line p-4">
            <CheckboxField
              name="hasAgeStatement"
              label="Carries an age statement"
              hint="Leave unchecked for NAS. This records what the label says, not a guess."
              defaultChecked={defaults.hasAgeStatement}
            />
            <div className="mt-3">
              <TextField
                name="ageYears"
                label="Age (years)"
                type="number"
                step="0.5"
                inputMode="decimal"
                defaultValue={defaults.ageYears}
                error={errors.ageYears}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="producer"
              label="Producer"
              defaultValue={defaults.producer}
              error={errors.producer}
            />
            <TextField
              name="actualDistiller"
              label="Actual distiller"
              hint="Leave blank when undisclosed."
              defaultValue={defaults.actualDistiller}
              error={errors.actualDistiller}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="mashBillStatus"
              label="Mash bill status"
              defaultValue={defaults.mashBillStatus ?? "undisclosed"}
              options={MASH_BILL_STATUSES.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1),
              }))}
              error={errors.mashBillStatus}
            />
            <TextField
              name="mashBillDetails"
              label="Mash bill details"
              hint="e.g. 75% corn, 13% rye, 12% malted barley"
              defaultValue={defaults.mashBillDetails}
              error={errors.mashBillDetails}
            />
          </div>

          <TextArea
            name="description"
            label="Description"
            defaultValue={defaults.description}
            error={errors.description}
          />

        </>
      )}
    </ActionSection>
  );
}

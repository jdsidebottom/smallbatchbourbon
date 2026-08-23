"use client";

import type { ActionResult } from "@/app/admin/bottles/actions";
import {
  ActionSection,
  CheckboxField,
  SelectField,
  TextArea,
  TextField,
} from "@/components/admin/fields";
import { TASTING_AXES, centsToDollars } from "@/lib/domain/bottle";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export function PriceLadderForm({
  action,
  price,
}: {
  action: Action;
  price: {
    msrp_cents: number | null;
    msrp_source_url: string | null;
    msrp_source_note: string | null;
    msrp_verified_at: string | null;
    steal_max_cents: number;
    buy_max_cents: number;
    fair_max_cents: number;
    maybe_max_cents: number;
    editorial_note: string | null;
  } | null;
}) {
  return (
    <ActionSection
      title="What We'd Pay"
      description="Band ceilings are inclusive and must ascend. A shelf price above the Maybe ceiling is a Walk Away. These are editorial judgments, set independently of MSRP."
      action={action}
      submitLabel="Save thresholds"
    >
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              name="msrp"
              label="Reference price"
              hint="Dollars. Leave blank if unverified."
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={centsToDollars(price?.msrp_cents)}
              error={errors.msrpCents}
            />
            <TextField
              name="msrpVerifiedAt"
              label="Verified on"
              type="date"
              defaultValue={price?.msrp_verified_at ?? ""}
              error={errors.msrpVerifiedAt}
            />
            <TextField
              name="msrpSourceUrl"
              label="Source URL"
              defaultValue={price?.msrp_source_url}
              error={errors.msrpSourceUrl}
            />
          </div>

          <TextField
            name="msrpSourceNote"
            label="Source note"
            hint="Used when there is no linkable source."
            defaultValue={price?.msrp_source_note}
            error={errors.msrpSourceNote}
          />

          <fieldset className="rounded-xl border border-ink-line p-4">
            <legend className="px-2 text-xs font-semibold tracking-[0.14em] text-cream-muted uppercase">
              Band ceilings
            </legend>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                name="stealMax"
                label="Steal up to"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={centsToDollars(price?.steal_max_cents)}
                error={errors.stealMaxCents}
              />
              <TextField
                name="buyMax"
                label="Buy up to"
                hint="This is the headline What We'd Pay figure."
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={centsToDollars(price?.buy_max_cents)}
                error={errors.buyMaxCents}
              />
              <TextField
                name="fairMax"
                label="Fair up to"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={centsToDollars(price?.fair_max_cents)}
                error={errors.fairMaxCents}
              />
              <TextField
                name="maybeMax"
                label="Maybe up to"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={centsToDollars(price?.maybe_max_cents)}
                error={errors.maybeMaxCents}
              />
            </div>
          </fieldset>

          <TextArea
            name="editorialNote"
            label="Verdict explanation"
            hint="Why these numbers. Shown to readers."
            defaultValue={price?.editorial_note}
            error={errors.editorialNote}
          />
        </>
      )}
    </ActionSection>
  );
}

export function ReviewForm({
  action,
  review,
}: {
  action: Action;
  review: {
    quick_take: string | null;
    nose: string | null;
    palate: string | null;
    finish: string | null;
    overall: string | null;
    best_for: string | null;
    skip_if: string | null;
    sample_provided: boolean;
    reviewed_at: string | null;
  } | null;
}) {
  return (
    <ActionSection
      title="Review"
      description="The 30-second take carries the page. The long form is for readers who want it."
      action={action}
      submitLabel="Save review"
    >
      {(errors) => (
        <>
          <TextArea
            name="quickTake"
            label="30-second review"
            rows={3}
            defaultValue={review?.quick_take}
            error={errors.quickTake}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextArea name="nose" label="Nose" rows={3} defaultValue={review?.nose} error={errors.nose} />
            <TextArea name="palate" label="Palate" rows={3} defaultValue={review?.palate} error={errors.palate} />
            <TextArea name="finish" label="Finish" rows={3} defaultValue={review?.finish} error={errors.finish} />
            <TextArea name="overall" label="Overall" rows={3} defaultValue={review?.overall} error={errors.overall} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextArea name="bestFor" label="Best for" rows={2} defaultValue={review?.best_for} error={errors.bestFor} />
            <TextArea name="skipIf" label="Skip if" rows={2} defaultValue={review?.skip_if} error={errors.skipIf} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="reviewedAt"
              label="Reviewed on"
              type="date"
              defaultValue={review?.reviewed_at ?? ""}
              error={errors.reviewedAt}
            />
            <div className="flex items-end pb-1">
              <CheckboxField
                name="sampleProvided"
                label="Sample was provided"
                hint="Disclosed on the published page."
                defaultChecked={review?.sample_provided}
              />
            </div>
          </div>
        </>
      )}
    </ActionSection>
  );
}

export function TastingProfileForm({
  action,
  tasting,
}: {
  action: Action;
  tasting: Record<string, number | null> | null;
}) {
  return (
    <ActionSection
      title="Flavour profile"
      description="0–10 on each axis. Leave an axis blank rather than guessing at it."
      action={action}
      submitLabel="Save profile"
    >
      {(errors) => (
        <div className="grid gap-5 sm:grid-cols-3">
          {TASTING_AXES.map((axis) => (
            <TextField
              key={axis}
              name={axis}
              label={axis.charAt(0).toUpperCase() + axis.slice(1)}
              type="number"
              step="1"
              inputMode="numeric"
              defaultValue={tasting?.[axis] ?? ""}
              error={errors[axis]}
            />
          ))}
        </div>
      )}
    </ActionSection>
  );
}

export function AddSourceForm({ action }: { action: Action }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ActionSection
      title="Add a source"
      description="Every published fact needs provenance. Notes here stay internal."
      action={action}
      submitLabel="Record source"
    >
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="fieldName"
              label="Field"
              hint="Which fact this backs, e.g. proof or msrp."
              defaultValue=""
              error={errors.fieldName}
            />
            <SelectField
              name="sourceType"
              label="Source type"
              defaultValue="producer"
              options={[
                { value: "producer", label: "Producer" },
                { value: "ttb_label", label: "TTB label" },
                { value: "retailer", label: "Retailer" },
                { value: "press", label: "Press" },
                { value: "distillery_visit", label: "Distillery visit" },
                { value: "first_party_tasting", label: "First-party tasting" },
                { value: "other", label: "Other" },
              ]}
              error={errors.sourceType}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="url" label="URL" defaultValue="" error={errors.url} />
            <TextField name="title" label="Title" defaultValue="" error={errors.title} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="verifiedAt"
              label="Verified on"
              type="date"
              defaultValue={today}
              error={errors.verifiedAt}
            />
          </div>

          <TextArea name="internalNotes" label="Internal notes" rows={2} defaultValue="" error={errors.internalNotes} />
        </>
      )}
    </ActionSection>
  );
}

export function AddAlternativeForm({
  action,
  bottles,
}: {
  action: Action;
  bottles: { id: string; name: string }[];
}) {
  return (
    <ActionSection
      title="Add an alternative"
      description="Chosen from canonical bottle records, so facts are never duplicated."
      action={action}
      submitLabel="Link bottle"
    >
      {(errors) => (
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="targetBottleId"
            label="Bottle"
            placeholder="Choose a bottle…"
            defaultValue=""
            options={bottles.map((b) => ({ value: b.id, label: b.name }))}
            error={errors.targetBottleId}
          />
          <SelectField
            name="relationshipType"
            label="Relationship"
            defaultValue="alternative"
            options={[
              { value: "alternative", label: "Alternative" },
              { value: "similar", label: "Similar" },
              { value: "upgrade", label: "Upgrade" },
              { value: "budget_pick", label: "Budget pick" },
            ]}
            error={errors.relationshipType}
          />
          <TextField name="rank" label="Rank" type="number" step="1" defaultValue={1} error={errors.rank} />
          <TextField name="note" label="Note" defaultValue="" error={errors.note} />
        </div>
      )}
    </ActionSection>
  );
}

export function AddRetailerForm({
  action,
  retailers,
}: {
  action: Action;
  retailers: { id: string; name: string }[];
}) {
  return (
    <ActionSection
      title="Add a retailer destination"
      description="Destinations are resolved server-side at redirect time. The URL is never exposed to the browser."
      action={action}
      submitLabel="Add destination"
    >
      {(errors) => (
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="retailerId"
            label="Retailer"
            placeholder="Choose a retailer…"
            defaultValue=""
            options={retailers.map((r) => ({ value: r.id, label: r.name }))}
            error={errors.retailerId}
          />
          <TextField
            name="destinationUrl"
            label="Destination URL"
            hint="Must be https."
            defaultValue=""
            error={errors.destinationUrl}
          />
        </div>
      )}
    </ActionSection>
  );
}

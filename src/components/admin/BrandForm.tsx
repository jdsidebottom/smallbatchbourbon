"use client";

import type { ActionResult } from "@/app/admin/bottles/actions";
import { ActionSection, TextArea, TextField } from "@/components/admin/fields";

export function BrandForm({
  action,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
}) {
  return (
    <ActionSection title="Add a brand" action={action} submitLabel="Add brand">
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="name" label="Name" required defaultValue="" error={errors.name} />
            <TextField name="slug" label="Slug" required defaultValue="" error={errors.slug} />
          </div>
          <TextField
            name="parentCompany"
            label="Parent company"
            defaultValue=""
            error={errors.parentCompany}
          />
          <TextArea name="notes" label="Internal notes" rows={2} defaultValue="" error={errors.notes} />
        </>
      )}
    </ActionSection>
  );
}

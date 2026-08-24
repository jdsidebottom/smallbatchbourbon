"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/bottles/actions";
import { FieldError, Label, SubmitButton } from "@/components/admin/fields";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/domain/media";

/**
 * Bottle photography.
 *
 * Replaces the free-text "path within the bottle-media bucket" field, which
 * required an editor to upload through the Supabase dashboard first and then
 * copy a path by hand — not something a non-technical editor can be expected to
 * do, and an easy way to publish a broken image.
 */
export function BottleImageForm({
  imageUrl,
  imageAlt,
  upload,
  remove,
}: {
  imageUrl: string | null;
  imageAlt: string | null;
  upload: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState(upload, null);
  const [pending, startTransition] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
      <h2 className="font-display text-xl text-cream">Bottle image</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-cream-muted">
        JPEG, PNG, WebP or AVIF, up to 5 MB. A bottle cannot be published without an
        image and alt text.
      </p>

      {imageUrl && (
        <div className="mt-6 flex flex-wrap items-start gap-5">
          <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-xl border border-ink-line bg-ink-card">
            <Image
              src={imageUrl}
              alt={imageAlt ?? ""}
              fill
              sizes="128px"
              className="object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-[0.14em] text-cream-muted uppercase">Current alt text</p>
            <p className="mt-1.5 text-sm text-cream-dim">{imageAlt ?? "—"}</p>

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await remove();
                  setRemoveError(result.ok ? null : result.message);
                })
              }
              className="mt-4 min-h-9 rounded-full border border-ink-line px-4 text-xs text-cream-muted transition hover:border-verdict-walk hover:text-verdict-walk disabled:opacity-50"
            >
              {pending ? "Removing…" : "Remove image"}
            </button>
            {removeError && (
              <p role="alert" className="mt-2 text-xs text-verdict-walk">
                {removeError}
              </p>
            )}
          </div>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-5">
        <div>
          <Label htmlFor="image" hint={imageUrl ? "Uploading replaces the image above." : undefined}>
            {imageUrl ? "Replace image" : "Image file"}
          </Label>
          <input
            id="image"
            name="image"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setChosen(
                file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : null,
              );
            }}
            aria-invalid={Boolean(errors.image)}
            aria-describedby="image-limits"
            className="mt-2 w-full rounded-lg border border-ink-line bg-ink-card px-3 py-2.5 text-sm text-cream-dim file:mr-4 file:rounded-full file:border-0 file:bg-amber file:px-4 file:py-2 file:text-xs file:font-semibold file:tracking-[0.1em] file:text-ink file:uppercase hover:file:bg-amber-glow"
          />
          <p id="image-limits" className="mt-1.5 text-xs text-cream-muted">
            {chosen ?? `Max ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)} MB.`}
          </p>
          <FieldError message={errors.image} />
        </div>

        <div>
          <Label
            htmlFor="imageAlt"
            hint="Describe the bottle for someone who cannot see it. Not “bottle photo”."
          >
            Alt text
          </Label>
          <input
            id="imageAlt"
            name="imageAlt"
            type="text"
            required
            defaultValue={imageAlt ?? ""}
            aria-invalid={Boolean(errors.imageAlt)}
            className="mt-2 w-full rounded-lg border border-ink-line bg-ink-card px-3 py-2.5 text-[16px] text-cream focus:border-amber"
          />
          <FieldError message={errors.imageAlt} />
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <SubmitButton>{imageUrl ? "Replace" : "Upload"}</SubmitButton>
          {state && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${state.ok ? "text-verdict-steal" : "text-verdict-walk"}`}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

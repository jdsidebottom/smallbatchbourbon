"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBottle } from "@/lib/data/bottles";
import {
  MEDIA_BUCKET,
  buildMediaPath,
  validateImage,
} from "@/lib/domain/media";
import {
  MASH_BILL_STATUSES,
  PUBLICATION_STATUSES,
  TASTING_AXES,
  bottleSchema,
  dollarsToCents,
  priceLadderSchema,
  reviewSchema,
} from "@/lib/domain/bottle";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string, fieldErrors?: Record<string, string>): ActionResult => ({
  ok: false,
  message,
  fieldErrors,
});

function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const text = (form: FormData, key: string): string | undefined => {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
};

const num = (form: FormData, key: string): number | null => {
  const raw = text(form, key);
  if (raw === undefined || raw.trim() === "") return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const bool = (form: FormData, key: string): boolean => form.get(key) === "on" || form.get(key) === "true";

const uuid = z.string().uuid();

// ------------------------------------------------------------- identity ----

export async function saveBottle(
  bottleId: string | null,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");

  const parsed = bottleSchema.safeParse({
    slug: text(form, "slug") ?? "",
    brandId: text(form, "brandId") ?? "",
    name: text(form, "name") ?? "",
    classification: text(form, "classification"),
    proof: num(form, "proof"),
    abv: num(form, "abv"),
    hasAgeStatement: bool(form, "hasAgeStatement"),
    ageYears: num(form, "ageYears"),
    mashBillStatus: (text(form, "mashBillStatus") ?? "undisclosed") as (typeof MASH_BILL_STATUSES)[number],
    mashBillDetails: text(form, "mashBillDetails"),
    producer: text(form, "producer"),
    actualDistiller: text(form, "actualDistiller"),
    description: text(form, "description"),
    status: (text(form, "status") ?? "draft") as (typeof PUBLICATION_STATUSES)[number],
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const v = parsed.data;
  const supabase = createAdminClient();

  const row = {
    updated_by: identity.userId,
    slug: v.slug,
    brand_id: v.brandId,
    name: v.name,
    classification: v.classification,
    proof: v.proof,
    abv: v.abv,
    has_age_statement: v.hasAgeStatement,
    age_years: v.ageYears,
    mash_bill_status: v.mashBillStatus,
    mash_bill_details: v.mashBillDetails,
    producer: v.producer,
    actual_distiller: v.actualDistiller,
    description: v.description,
    // image_path / image_alt are written only by uploadBottleImage, so saving
    // the identity form can never blank out an uploaded image.
  };

  if (bottleId) {
    if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");
    const { error } = await supabase.from("bottles").update(row).eq("id", bottleId);
    if (error) return fail(friendly(error.message));
    revalidatePath(`/admin/bottles/${bottleId}`);
    revalidatePath("/admin/bottles");
    return ok("Saved.");
  }

  // New bottles always start as drafts, whatever the form said.
  const { data, error } = await supabase
    .from("bottles")
    .insert({ ...row, status: "draft", created_by: identity.userId })
    .select("id")
    .single();

  if (error) return fail(friendly(error.message));

  revalidatePath("/admin/bottles");
  redirect(`/admin/bottles/${data.id}`);
}

// ----------------------------------------------------------------- media ----

/**
 * Bottle photography.
 *
 * The upload never trusts the browser: the MIME type and size are re-checked
 * server-side (the bucket enforces both again), and the stored filename is
 * generated from the bottle slug plus a random suffix rather than taken from
 * the uploaded file, so a crafted name cannot escape its prefix or collide.
 *
 * Alt text is saved in the same action as the image, because an image without
 * alt text is exactly the state the publish gate refuses — making them separate
 * saves would let an editor create it by accident.
 */
export async function uploadBottleImage(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  const file = form.get("image");
  const alt = (text(form, "imageAlt") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return fail("Choose an image to upload.", { image: "No file selected." });
  }

  const check = validateImage({ type: file.type, size: file.size, name: file.name });
  if (!check.ok) return fail(check.message, { image: check.message });

  if (!alt) {
    return fail("Describe the image for screen readers.", {
      imageAlt: "Alt text is required.",
    });
  }

  const supabase = createAdminClient();

  const { data: bottle } = await supabase
    .from("bottles")
    .select("slug, image_path")
    .eq("id", bottleId)
    .maybeSingle();

  if (!bottle) return fail("Unknown bottle.");

  const path = buildMediaPath(bottle.slug as string, check.extension);

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return fail(uploadError.message, { image: uploadError.message });

  const { error } = await supabase
    .from("bottles")
    .update({ image_path: path, image_alt: alt, updated_by: identity.userId })
    .eq("id", bottleId);

  if (error) {
    // The row did not take the new path, so the object just uploaded is
    // unreferenced. Remove it rather than leaving the bucket to accumulate
    // orphans no screen will ever show.
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail(friendly(error.message));
  }

  // Only once the row points at the new object is the old one safe to drop.
  const previous = bottle.image_path as string | null;
  if (previous && previous !== path && !/^https?:\/\//i.test(previous)) {
    await supabase.storage.from(MEDIA_BUCKET).remove([previous]);
  }

  revalidatePath(`/admin/bottles/${bottleId}`);
  revalidatePath(`/bourbon/${bottle.slug}`);
  return ok("Image uploaded.");
}

export async function removeBottleImage(bottleId: string): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  const supabase = createAdminClient();
  const { data: bottle } = await supabase
    .from("bottles")
    .select("slug, image_path")
    .eq("id", bottleId)
    .maybeSingle();

  if (!bottle) return fail("Unknown bottle.");

  const { error } = await supabase
    .from("bottles")
    .update({ image_path: null, image_alt: null, updated_by: identity.userId })
    .eq("id", bottleId);

  if (error) return fail(friendly(error.message));

  const previous = bottle.image_path as string | null;
  if (previous && !/^https?:\/\//i.test(previous)) {
    await supabase.storage.from(MEDIA_BUCKET).remove([previous]);
  }

  revalidatePath(`/admin/bottles/${bottleId}`);
  revalidatePath(`/bourbon/${bottle.slug}`);
  return ok("Image removed.");
}

// ---------------------------------------------------------- price ladder ----

export async function savePriceLadder(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  const parsed = priceLadderSchema.safeParse({
    msrpCents: dollarsToCents(text(form, "msrp")),
    msrpSourceUrl: text(form, "msrpSourceUrl") ?? "",
    msrpSourceNote: text(form, "msrpSourceNote"),
    msrpVerifiedAt: text(form, "msrpVerifiedAt") ?? "",
    stealMaxCents: dollarsToCents(text(form, "stealMax")) ?? Number.NaN,
    buyMaxCents: dollarsToCents(text(form, "buyMax")) ?? Number.NaN,
    fairMaxCents: dollarsToCents(text(form, "fairMax")) ?? Number.NaN,
    maybeMaxCents: dollarsToCents(text(form, "maybeMax")) ?? Number.NaN,
    editorialNote: text(form, "editorialNote"),
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const v = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase.from("bottle_prices").upsert(
    {
      bottle_id: bottleId,
      updated_by: identity.userId,
      msrp_cents: v.msrpCents,
      msrp_source_url: v.msrpSourceUrl,
      msrp_source_note: v.msrpSourceNote,
      msrp_verified_at: v.msrpVerifiedAt,
      steal_max_cents: v.stealMaxCents,
      buy_max_cents: v.buyMaxCents,
      fair_max_cents: v.fairMaxCents,
      maybe_max_cents: v.maybeMaxCents,
      editorial_note: v.editorialNote,
    },
    { onConflict: "bottle_id" },
  );

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Value thresholds saved.");
}

// --------------------------------------------------------------- review ----

export async function saveReview(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin("contributor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  const parsed = reviewSchema.safeParse({
    quickTake: text(form, "quickTake"),
    nose: text(form, "nose"),
    palate: text(form, "palate"),
    finish: text(form, "finish"),
    overall: text(form, "overall"),
    bestFor: text(form, "bestFor"),
    skipIf: text(form, "skipIf"),
    sampleProvided: bool(form, "sampleProvided"),
    reviewedAt: text(form, "reviewedAt") ?? "",
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const v = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase.from("reviews").upsert(
    {
      bottle_id: bottleId,
      quick_take: v.quickTake,
      nose: v.nose,
      palate: v.palate,
      finish: v.finish,
      overall: v.overall,
      best_for: v.bestFor,
      skip_if: v.skipIf,
      sample_provided: v.sampleProvided,
      reviewed_at: v.reviewedAt,
    },
    { onConflict: "bottle_id" },
  );

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Review saved.");
}

// ------------------------------------------------------ tasting profile ----

export async function saveTastingProfile(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin("contributor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  const row: Record<string, number | null | string> = { bottle_id: bottleId };
  for (const axis of TASTING_AXES) {
    const value = num(form, axis);
    if (value !== null && (Number.isNaN(value) || value < 0 || value > 10)) {
      return fail("Flavour values must be between 0 and 10.", { [axis]: "0–10 only." });
    }
    row[axis] = value;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tasting_profiles")
    .upsert(row, { onConflict: "bottle_id" });

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Flavour profile saved.");
}

// --------------------------------------------------------------- sources ----

export async function addSource(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  const schema = z.object({
    fieldName: z.string().trim().max(120).optional().transform((v) => v || null),
    sourceType: z.enum([
      "producer",
      "ttb_label",
      "retailer",
      "press",
      "distillery_visit",
      "first_party_tasting",
      "other",
    ]),
    url: z
      .string()
      .trim()
      .url("Enter a full URL, including https://")
      .optional()
      .or(z.literal(""))
      .transform((v) => v || null),
    title: z.string().trim().max(300).optional().transform((v) => v || null),
    verifiedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    internalNotes: z.string().trim().max(2000).optional().transform((v) => v || null),
  });

  const parsed = schema.safeParse({
    fieldName: text(form, "fieldName"),
    sourceType: text(form, "sourceType") ?? "other",
    url: text(form, "url") ?? "",
    title: text(form, "title"),
    verifiedAt: text(form, "verifiedAt") ?? "",
    internalNotes: text(form, "internalNotes"),
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));
  const v = parsed.data;

  if (!v.url && !v.title) {
    return fail("A source needs a URL or a title.", { url: "Give a URL or a title." });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("sources").insert({
    entity_table: "bottles",
    entity_id: bottleId,
    field_name: v.fieldName,
    source_type: v.sourceType,
    url: v.url,
    title: v.title,
    verified_at: v.verifiedAt,
    internal_notes: v.internalNotes,
    created_by: identity.userId,
  });

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Source recorded.");
}

export async function deleteSource(bottleId: string, sourceId: string): Promise<ActionResult> {
  await requireAdmin("editor");
  if (!uuid.safeParse(sourceId).success) return fail("Unknown source.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("sources").delete().eq("id", sourceId);
  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Source removed.");
}

// ---------------------------------------------------------- alternatives ----

export async function addAlternative(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin("contributor");

  const targetId = text(form, "targetBottleId") ?? "";
  if (!uuid.safeParse(bottleId).success || !uuid.safeParse(targetId).success) {
    return fail("Choose a bottle.");
  }
  if (targetId === bottleId) return fail("A bottle can't be its own alternative.");

  const rank = Number.parseInt(text(form, "rank") ?? "1", 10);
  const supabase = createAdminClient();

  const { error } = await supabase.from("bottle_relationships").insert({
    source_bottle_id: bottleId,
    target_bottle_id: targetId,
    relationship_type: text(form, "relationshipType") ?? "alternative",
    rank: Number.isFinite(rank) ? rank : 1,
    note: text(form, "note") || null,
  });

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Alternative added.");
}

export async function deleteAlternative(bottleId: string, relationshipId: string): Promise<ActionResult> {
  await requireAdmin("contributor");
  if (!uuid.safeParse(relationshipId).success) return fail("Unknown relationship.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("bottle_relationships").delete().eq("id", relationshipId);
  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Alternative removed.");
}

// ------------------------------------------------------------ retailers ----

export async function addRetailerDestination(
  bottleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin("editor");

  const schema = z.object({
    retailerId: z.string().uuid("Choose a retailer."),
    destinationUrl: z
      .string()
      .trim()
      .url("Enter a full URL.")
      .refine((v) => v.startsWith("https://"), "Destinations must be https."),
  });

  const parsed = schema.safeParse({
    retailerId: text(form, "retailerId") ?? "",
    destinationUrl: text(form, "destinationUrl") ?? "",
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const supabase = createAdminClient();
  const { error } = await supabase.from("bottle_retailers").insert({
    bottle_id: bottleId,
    retailer_id: parsed.data.retailerId,
    destination_url: parsed.data.destinationUrl,
  });

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Retailer destination added.");
}

export async function deleteRetailerDestination(
  bottleId: string,
  rowId: string,
): Promise<ActionResult> {
  await requireAdmin("editor");
  if (!uuid.safeParse(rowId).success) return fail("Unknown destination.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("bottle_retailers").delete().eq("id", rowId);
  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  return ok("Destination removed.");
}

// -------------------------------------------------------------- publish ----

/**
 * Publishing is gated on the completeness report, not on the editor's
 * confidence. A record that cannot be published honestly is refused here, with
 * the reason, rather than half-published and fixed later.
 */
export async function setPublicationStatus(
  bottleId: string,
  status: "draft" | "review" | "published" | "archived",
): Promise<ActionResult> {
  const identity = await requireAdmin("editor");
  if (!uuid.safeParse(bottleId).success) return fail("Unknown bottle.");

  if (status === "published") {
    const detail = await getBottle(bottleId);
    if (!detail) return fail("Unknown bottle.");
    if (!detail.completeness.canPublish) {
      const missing = detail.completeness.missingRequired.map((f) => f.label).join(", ");
      return fail(`Not ready to publish. Still missing: ${missing}.`);
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bottles")
    .update({
      status,
      updated_by: identity.userId,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", bottleId);

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/bottles/${bottleId}`);
  revalidatePath("/admin/bottles");
  return ok(status === "published" ? "Published." : `Moved to ${status}.`);
}

// --------------------------------------------------------------- helpers ----

/** Turns the handful of constraint violations an editor can actually cause into plain English. */
function friendly(message: string): string {
  if (message.includes("bottles_slug_key")) return "That slug is already used by another bottle.";
  if (message.includes("bottle_relationships_unique")) return "That alternative is already linked.";
  if (message.includes("bottle_retailers_unique")) return "That retailer is already linked to this bottle.";
  if (message.includes("bottle_prices_bands_ordered")) return "Band ceilings must ascend from Steal to Maybe.";
  if (message.includes("bottles_image_alt_present")) return "An image needs alt text.";
  if (message.includes("bottles_published_at_present")) return "A published bottle needs a publication date.";
  return message;
}

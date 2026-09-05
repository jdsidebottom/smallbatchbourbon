"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicContent } from "@/lib/data/revalidate-public";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getArticle } from "@/lib/data/articles";
import {
  articlePath,
  articleSchema,
  guideItemSchema,
  type ArticleType,
} from "@/lib/domain/article";
import type { ActionResult } from "@/app/admin/bottles/actions";

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

const uuid = z.string().uuid();

/**
 * Revalidates every surface an article change is visible on: the admin screens,
 * the article's own public route, and the index it appears in.
 */
function revalidateArticle(id: string, type: ArticleType, slug: string) {
  // A guide's membership decides what renders on the bottle pages it features,
  // so an article write is a bottle-page write too.
  revalidatePublicContent();
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${id}`);
  revalidatePath(articlePath(type, slug));
  revalidatePath(`/${articlePath(type, slug).split("/")[1]}`);
}

// --------------------------------------------------------------- article ----

export async function saveArticle(
  articleId: string | null,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");

  const parsed = articleSchema.safeParse({
    slug: text(form, "slug") ?? "",
    title: text(form, "title") ?? "",
    articleType: (text(form, "articleType") ?? "learn") as ArticleType,
    excerpt: text(form, "excerpt"),
    intro: text(form, "intro"),
    body: text(form, "body"),
    methodology: text(form, "methodology"),
    heroImagePath: text(form, "heroImagePath"),
    heroImageAlt: text(form, "heroImageAlt"),
    reviewedAt: text(form, "reviewedAt") ?? "",
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const v = parsed.data;
  const supabase = createAdminClient();

  const row = {
    updated_by: identity.userId,
    slug: v.slug,
    title: v.title,
    article_type: v.articleType,
    excerpt: v.excerpt,
    intro: v.intro,
    body: v.body,
    methodology: v.methodology,
    hero_image_path: v.heroImagePath,
    hero_image_alt: v.heroImageAlt,
    reviewed_at: v.reviewedAt,
  };

  if (articleId) {
    if (!uuid.safeParse(articleId).success) return fail("Unknown article.");

    // The old path has to be revalidated too, or a renamed article keeps
    // serving from its previous URL until the ISR window expires.
    const previous = await getArticle(articleId);

    const { error } = await supabase.from("articles").update(row).eq("id", articleId);
    if (error) return fail(friendly(error.message));

    if (previous) {
      revalidateArticle(articleId, previous.article.article_type, previous.article.slug);
    }
    revalidateArticle(articleId, v.articleType, v.slug);
    return ok("Saved.");
  }

  const { data, error } = await supabase
    .from("articles")
    .insert({ ...row, status: "draft", created_by: identity.userId })
    .select("id")
    .single();

  if (error) return fail(friendly(error.message));

  revalidatePath("/admin/content");
  redirect(`/admin/content/${data.id}`);
}

// ----------------------------------------------------------- guide picks ----

export async function addGuideItem(
  articleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(articleId).success) return fail("Unknown article.");

  const parsed = guideItemSchema.safeParse({
    bottleId: text(form, "bottleId") ?? "",
    label: text(form, "label"),
    rationale: text(form, "rationale"),
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const supabase = createAdminClient();

  // New picks append. Reordering is a separate, explicit action.
  const { data: last } = await supabase
    .from("guide_items")
    .select("rank")
    .eq("article_id", articleId)
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("guide_items").insert({
    article_id: articleId,
    bottle_id: parsed.data.bottleId,
    rank: ((last?.rank as number | undefined) ?? 0) + 1,
    label: parsed.data.label,
    rationale: parsed.data.rationale,
    updated_by: identity.userId,
  });

  if (error) return fail(friendly(error.message));

  await revalidateFromId(articleId);
  return ok("Pick added.");
}

export async function updateGuideItem(
  articleId: string,
  itemId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(articleId).success || !uuid.safeParse(itemId).success) {
    return fail("Unknown pick.");
  }

  const schema = guideItemSchema.omit({ bottleId: true });
  const parsed = schema.safeParse({
    label: text(form, "label"),
    rationale: text(form, "rationale"),
  });

  if (!parsed.success) return fail("Fix the highlighted fields.", flatten(parsed.error));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guide_items")
    .update({
      label: parsed.data.label,
      rationale: parsed.data.rationale,
      updated_by: identity.userId,
    })
    .eq("id", itemId)
    .eq("article_id", articleId);

  if (error) return fail(friendly(error.message));

  await revalidateFromId(articleId);
  return ok("Pick updated.");
}

export async function deleteGuideItem(articleId: string, itemId: string): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(itemId).success) return fail("Unknown pick.");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guide_items")
    .delete()
    .eq("id", itemId)
    .eq("article_id", articleId);

  if (error) return fail(friendly(error.message));

  // Deleting from the middle leaves a gap in the ranks. Close it, so the
  // numbering an editor sees always matches the order the guide renders in.
  await renumber(articleId, identity.userId);
  await revalidateFromId(articleId);
  return ok("Pick removed.");
}

export async function moveGuideItem(
  articleId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(articleId).success || !uuid.safeParse(itemId).success) {
    return fail("Unknown pick.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guide_items")
    .select("id")
    .eq("article_id", articleId)
    .order("rank");

  if (error) return fail(friendly(error.message));

  const ids = (data ?? []).map((row) => (row as { id: string }).id);
  const index = ids.indexOf(itemId);
  if (index === -1) return fail("Unknown pick.");

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return ok("Already there.");

  [ids[index], ids[target]] = [ids[target], ids[index]];

  const { error: rpcError } = await supabase.rpc("reorder_guide_items", {
    p_article_id: articleId,
    p_item_ids: ids,
    p_actor: identity.userId,
  });

  if (rpcError) return fail(friendly(rpcError.message));

  await revalidateFromId(articleId);
  return ok("Reordered.");
}

/** Closes gaps left by a deletion, preserving the current order. */
async function renumber(articleId: string, actorId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("guide_items")
    .select("id")
    .eq("article_id", articleId)
    .order("rank");

  const ids = (data ?? []).map((row) => (row as { id: string }).id);
  if (ids.length === 0) return;

  await supabase.rpc("reorder_guide_items", {
    p_article_id: articleId,
    p_item_ids: ids,
    p_actor: actorId,
  });
}

// -------------------------------------------------------------- sources ----

export async function addArticleSource(
  articleId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const identity = await requireAdmin("contributor");
  if (!uuid.safeParse(articleId).success) return fail("Unknown article.");

  const schema = z.object({
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
    entity_table: "articles",
    entity_id: articleId,
    source_type: v.sourceType,
    url: v.url,
    title: v.title,
    verified_at: v.verifiedAt,
    internal_notes: v.internalNotes,
    created_by: identity.userId,
  });

  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/content/${articleId}`);
  return ok("Source recorded.");
}

export async function deleteArticleSource(
  articleId: string,
  sourceId: string,
): Promise<ActionResult> {
  await requireAdmin("editor");
  if (!uuid.safeParse(sourceId).success) return fail("Unknown source.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("sources").delete().eq("id", sourceId);
  if (error) return fail(friendly(error.message));

  revalidatePath(`/admin/content/${articleId}`);
  return ok("Source removed.");
}

// -------------------------------------------------------------- publish ----

/**
 * Same rule as bottles: publication is gated on the completeness report, not on
 * the editor's confidence. A guide whose pick points at an unpublished bottle
 * is refused here rather than shipping with a hole where a card should be.
 */
export async function setArticleStatus(
  articleId: string,
  status: "draft" | "review" | "published" | "archived",
): Promise<ActionResult> {
  const identity = await requireAdmin("editor");
  if (!uuid.safeParse(articleId).success) return fail("Unknown article.");

  const detail = await getArticle(articleId);
  if (!detail) return fail("Unknown article.");

  if (status === "published" && !detail.completeness.canPublish) {
    const missing = detail.completeness.missingRequired.map((f) => f.label).join(", ");
    return fail(`Not ready to publish. Still missing: ${missing}.`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("articles")
    .update({
      status,
      updated_by: identity.userId,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", articleId);

  if (error) return fail(friendly(error.message));

  revalidateArticle(articleId, detail.article.article_type, detail.article.slug);
  return ok(status === "published" ? "Published." : `Moved to ${status}.`);
}

// --------------------------------------------------------------- helpers ----

async function revalidateFromId(articleId: string) {
  const detail = await getArticle(articleId);
  if (detail) revalidateArticle(articleId, detail.article.article_type, detail.article.slug);
  else revalidatePath(`/admin/content/${articleId}`);
}

function friendly(message: string): string {
  if (message.includes("articles_slug_key")) return "That slug is already used by another article.";
  if (message.includes("articles_slug_format")) return "Slugs are one path segment — no slashes.";
  if (message.includes("guide_items_unique")) return "That bottle is already in this guide.";
  if (message.includes("articles_hero_alt_present")) return "A hero image needs alt text.";
  if (message.includes("articles_published_at_present"))
    return "A published article needs a publication date.";
  return message;
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/app/admin/bottles/actions";

const brandSchema = z.object({
  name: z.string().trim().min(2, "Enter a brand name.").max(200),
  slug: z
    .string()
    .trim()
    .min(2, "Enter a slug.")
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
  parentCompany: z.string().trim().max(200).optional().transform((v) => v || null),
  notes: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export async function saveBrand(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin("editor");

  const parsed = brandSchema.safeParse({
    name: form.get("name"),
    slug: form.get("slug"),
    parentCompany: form.get("parentCompany"),
    notes: form.get("notes"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Fix the highlighted fields.", fieldErrors };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("brands").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    parent_company: parsed.data.parentCompany,
    notes: parsed.data.notes,
  });

  if (error) {
    return {
      ok: false,
      message: error.message.includes("brands_slug_key")
        ? "That slug is already in use."
        : error.message,
    };
  }

  revalidatePath("/admin/brands");
  revalidatePath("/admin/bottles/new");
  return { ok: true, message: "Brand added." };
}

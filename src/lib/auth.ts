import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminRole = "admin" | "editor" | "contributor";

export type AdminIdentity = {
  userId: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
};

/** Supabase is optional until Milestone 2 is deployed; the admin says so plainly. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

const ROLE_RANK: Record<AdminRole, number> = {
  contributor: 1,
  editor: 2,
  admin: 3,
};

/**
 * Authorization is enforced here, server-side, on every admin request.
 * Hiding a control in the UI is not authorization — nothing in the admin reads
 * or writes without passing through this function first.
 *
 * The role is read from the database rather than from a JWT claim, so revoking
 * someone's access takes effect immediately rather than at token expiry.
 */
export async function requireAdmin(minRole: AdminRole = "contributor"): Promise<AdminIdentity> {
  if (!isSupabaseConfigured()) redirect("/admin/setup-required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id, email, display_name, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.is_active) redirect("/admin/no-access");

  const role = data.role as AdminRole;
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) redirect("/admin/no-access");

  return {
    userId: data.user_id as string,
    email: data.email as string,
    displayName: (data.display_name as string | null) ?? null,
    role,
  };
}

/** Non-redirecting variant, for deciding what to render rather than whether to allow. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("user_id, email, display_name, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  return {
    userId: data.user_id as string,
    email: data.email as string,
    displayName: (data.display_name as string | null) ?? null,
    role: data.role as AdminRole,
  };
}

export function hasAtLeast(role: AdminRole, minRole: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

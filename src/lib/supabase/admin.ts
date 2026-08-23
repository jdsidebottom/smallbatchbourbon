import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/supabase/server";

/**
 * Service-role client. Bypasses Row Level Security, so it must only ever be
 * reached after `requireAdmin()` has authorized the request.
 *
 * The `server-only` import above makes it a build error to pull this module
 * into a client component, which is the mistake that would leak the key.
 */
export function createAdminClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

/**
 * Non-throwing variant for public request paths.
 *
 * The admin pages want a loud failure when configuration is missing, but a
 * public route must not answer a visitor with a 500 because of it. Callers
 * treat null as "this cannot be served" and respond accordingly.
 */
export function tryCreateAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createAdminClient();
}

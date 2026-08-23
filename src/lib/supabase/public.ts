import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client for public, unauthenticated reads.
 *
 * Deliberately uses the publishable key rather than the service role, so every
 * query the public site makes is subject to Row Level Security. If a policy or
 * a column GRANT is wrong, a public page breaks — it does not quietly leak an
 * unpublished draft or an affiliate destination.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

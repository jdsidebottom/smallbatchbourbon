import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Only ever holds the publishable key, and every query it makes
 * is subject to Row Level Security. Used for the admin sign-in exchange, which
 * has to happen in the browser so the session cookie is set for this origin.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

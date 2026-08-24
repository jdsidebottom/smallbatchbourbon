/**
 * Builds the connect-src / img-src additions for the configured Supabase
 * project.
 *
 * This exists because a missing entry here does not fail loudly: the server
 * keeps working (its queries never touch the browser's CSP) while every
 * browser-side call to Supabase — auth above all — dies as an opaque
 * "Failed to fetch". Worth a test.
 */
export function supabaseCspOrigins(rawUrl: string | undefined | null): {
  origin: string;
  connectSrc: string[];
  imgSrc: string[];
} {
  let origin = "";
  try {
    origin = new URL(rawUrl ?? "").origin;
  } catch {
    origin = "";
  }

  if (!origin || !origin.startsWith("https://")) {
    return { origin: "", connectSrc: [], imgSrc: [] };
  }

  return {
    origin,
    // wss:// is needed for Supabase Realtime, which later milestones will use.
    connectSrc: [origin, origin.replace("https://", "wss://")],
    imgSrc: [origin],
  };
}

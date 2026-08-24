/**
 * Bottle and article media.
 *
 * Images live in the public `bottle-media` Supabase Storage bucket. The bucket
 * itself enforces MIME type and a 5 MB ceiling (migration 0004) so a mistake in
 * this file cannot turn it into arbitrary file hosting — but the same rules are
 * checked here too, because an editor deserves a useful message rather than a
 * storage API error, and defence in depth is the point of both layers.
 */

export const MEDIA_BUCKET = "bottle-media";

/** Kept in step with the bucket's `allowed_mime_types`. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Kept in step with the bucket's `file_size_limit`. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type MediaValidationError =
  | { ok: false; message: string }
  | { ok: true; extension: string };

export function validateImage(file: {
  type: string;
  size: number;
  name: string;
}): MediaValidationError {
  if (file.size === 0) return { ok: false, message: "That file is empty." };

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, message: `That image is ${mb} MB. The limit is 5 MB.` };
  }

  const extension = EXTENSION[file.type];
  if (!extension) {
    return {
      ok: false,
      message: "Use a JPEG, PNG, WebP or AVIF image.",
    };
  }

  return { ok: true, extension };
}

/**
 * Builds the stored object path.
 *
 * The filename is generated rather than taken from the upload: a name supplied
 * by a browser can carry path separators, null bytes, a misleading double
 * extension, or simply collide with an existing object. Only the slug (which is
 * already constrained to `[a-z0-9-]`) and a random suffix reach the bucket.
 */
export function buildMediaPath(slug: string, extension: string, random = crypto.randomUUID()) {
  const safeSlug = slug.replace(/[^a-z0-9-]/g, "").slice(0, 80) || "bottle";
  return `${safeSlug}/${random}.${extension}`;
}

/**
 * Public URL for a stored object.
 *
 * Returns null when storage is unconfigured or the path is empty, so callers
 * render no image rather than a broken one.
 */
export function mediaUrl(
  path: string | null | undefined,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!path || !supabaseUrl) return null;

  // A full URL already stored in the column is passed through, so existing
  // records that point at an external asset keep working.
  if (/^https:\/\//i.test(path)) return path;
  if (/^https?:\/\//i.test(path)) return null; // never downgrade to http

  let origin: string;
  try {
    origin = new URL(supabaseUrl).origin;
  } catch {
    return null;
  }

  const clean = path.replace(/^\/+/, "");
  return `${origin}/storage/v1/object/public/${MEDIA_BUCKET}/${clean}`;
}

/**
 * Bottle photography is portrait. Fixing the ratio here means every card
 * reserves the right space before the image loads, so a slow image shifts
 * nothing (PRD §22).
 */
export const BOTTLE_ASPECT = { width: 3, height: 4 } as const;

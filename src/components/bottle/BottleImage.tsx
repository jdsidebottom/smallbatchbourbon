import Image from "next/image";
import { mediaUrl } from "@/lib/domain/media";

/**
 * Bottle photography.
 *
 * The wrapper carries a fixed 3:4 aspect ratio, so the space is reserved before
 * the image arrives and a slow load shifts nothing below it (PRD §22). AVIF and
 * WebP come from the `images.formats` setting in next.config.
 *
 * Renders nothing at all when there is no image rather than a placeholder box —
 * a bottle without a photograph is a record we have not finished, not a gap to
 * paper over.
 */
export function BottleImage({
  path,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  path: string | null;
  alt: string | null;
  /** Required: without it the browser downloads the largest candidate every time. */
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const src = mediaUrl(path);
  if (!src) return null;

  return (
    <div
      className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-ink-line bg-ink-card ${className}`}
    >
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        sizes={sizes}
        priority={priority}
        // Above-the-fold images load eagerly; everything else waits.
        loading={priority ? undefined : "lazy"}
        className="object-contain"
      />
    </div>
  );
}

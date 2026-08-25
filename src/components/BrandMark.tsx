import Image from "next/image";

/**
 * The approved circular sBb badge (Brand Guidelines §2).
 *
 * The mark is used as-is and never restyled: the guidelines rule out
 * stretching, skewing, cropping, rotating, recolouring, outlining and drop
 * shadows, so this component deliberately exposes only a size. Anything that
 * would distort it is not reachable through the API.
 *
 * The master is a raster — the guidelines note that a true vector should be
 * commissioned before large-format print — so it is served through next/image
 * to get AVIF/WebP and the right resolution per device rather than shipping a
 * 1254px PNG to a 40px slot.
 */
export function BrandMark({
  size = 40,
  priority = false,
  className = "",
}: {
  /** Rendered CSS size in pixels. Guidelines: 64–96px header/footer, 32px minimum. */
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      // Decorative: every use sits inside a link or block that is already
      // labelled "Small Batch Bourbon", so announcing the mark again would just
      // repeat the brand name to a screen reader.
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority={priority}
      // Retina without shipping a larger file to everyone else.
      sizes={`${size * 2}px`}
      className={`shrink-0 ${className}`}
    />
  );
}

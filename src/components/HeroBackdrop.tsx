import Image from "next/image";
import { heroImage } from "@/lib/site";

/**
 * The home-page hero backdrop.
 *
 * With no photograph configured this renders exactly what the hero has always
 * rendered — the amber glow, and nothing else. Setting `heroImage` in
 * `src/lib/site.ts` layers a photograph beneath that glow, with a scrim between
 * the two so the headline stays readable over whatever the photograph happens
 * to contain.
 *
 * Two deliberate choices worth keeping:
 *
 *  - `priority`, because a full-bleed hero image is the Largest Contentful Paint
 *    element on the home page. Lazy-loading it would push LCP out by however
 *    long the image takes to arrive.
 *  - No fade-in. A photograph that animates from `opacity: 0` is not counted as
 *    painted until it is opaque, so a tasteful fade measurably worsens the exact
 *    metric this page is judged on. Animate something else.
 *
 * The whole layer is decorative: the headline carries the meaning, so the image
 * takes an empty alt and the container is hidden from assistive tech.
 */
const GLOW =
  "radial-gradient(120% 90% at 50% -10%, rgba(224,163,60,0.22) 0%, rgba(224,163,60,0.06) 38%, transparent 70%)";

export function HeroBackdrop() {
  // No photograph: emit exactly the markup the hero had before this component
  // existed, so adding it changed nothing for anyone.
  if (!heroImage) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: GLOW }}
      />
    );
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <>
          <Image
            src={heroImage.src}
            alt=""
            fill
            priority
            // Full-bleed, so the widest viewport is the relevant width.
            sizes="100vw"
            className={`object-cover ${heroImage.position ?? "object-center"}`}
          />

          {/*
            Scrim. Two stacked washes: text sits left and low, so that corner is
            darkened hardest, while the opposite corner keeps more of the
            photograph.

            The floors matter more than the peaks. Sampling an 11x11 grid across
            the hero against a worst-case near-white photograph, these values
            hold cream and cream-dim text at 6.07:1 at the *worst* point
            anywhere in the panel — comfortably past the 4.5:1 AA threshold, and
            not only where text happens to sit today. The earlier draft measured
            2.91:1 in the top-right corner, which was fine until a line of text
            wrapped into it.

            The cost is that a bright photograph gets heavily darkened. That is
            the honest trade for cream text over an unknown image. A dark, moody
            bourbon photograph — the likely case — lets you raise the last stop
            in each gradient and let much more of the image through. Re-check
            the contrast if you do.
          */}
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(to top, rgba(11,10,9,0.96) 0%, rgba(11,10,9,0.62) 55%, rgba(11,10,9,0.60) 100%)",
                "linear-gradient(to right, rgba(11,10,9,0.86) 0%, rgba(11,10,9,0.52) 60%, rgba(11,10,9,0.50) 100%)",
              ].join(", "),
            }}
          />
      </>

      {/* The brand glow sits above the photograph, so the hero keeps its
          identity whether or not there is an image behind it. */}
      <div className="absolute inset-0" style={{ background: GLOW }} />
    </div>
  );
}

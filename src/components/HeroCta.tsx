import { TrackedLink } from "@/components/TrackedLink";

export function HeroCta() {
  return (
    <TrackedLink
      href="/bourbon"
      event="hero_cta_clicked"
      params={{ placement: "hero" }}
      className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-amber px-8 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
    >
      Find what&apos;s worth buying
    </TrackedLink>
  );
}

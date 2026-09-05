import { TrackedLink } from "@/components/TrackedLink";

/**
 * Used for features that are previewed but not yet live. It records interest
 * instead of navigating to a page that does not exist — no dead CTAs.
 */
export function InterestButton({
  feature,
  placement,
  children,
  targetId = "proof-and-perspective",
  variant = "outline",
}: {
  feature: string;
  placement: string;
  children: React.ReactNode;
  targetId?: string;
  variant?: "outline" | "solid";
}) {
  const base =
    "inline-flex min-h-[3rem] items-center justify-center rounded-full px-7 text-sm font-semibold tracking-[0.12em] uppercase transition";
  const styles =
    variant === "solid"
      ? "bg-amber text-ink hover:bg-amber-glow"
      : "border border-ink-line text-cream hover:border-amber hover:text-amber";

  return (
    <TrackedLink
      href={`#${targetId}`}
      event="feature_interest_clicked"
      params={{ feature, placement }}
      className={`${base} ${styles}`}
    >
      {children}
    </TrackedLink>
  );
}

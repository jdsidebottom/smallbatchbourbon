"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

export function HeroCta() {
  return (
    <Link
      href="/bourbon"
      onClick={() => track("hero_cta_clicked", { placement: "hero" })}
      className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-amber px-8 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow"
    >
      Find what&apos;s worth buying
    </Link>
  );
}

import type { Metadata } from "next";
import { StoreMode } from "@/components/store/StoreMode";

export const metadata: Metadata = {
  title: "At the store",
  description:
    "Standing in the aisle? Search the bottle, type the shelf price, get a straight verdict.",
  alternates: { canonical: "/at-the-store" },
};

export default function AtTheStorePage() {
  return <StoreMode />;
}

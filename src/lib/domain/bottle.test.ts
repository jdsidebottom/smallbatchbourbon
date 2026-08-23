import { describe, expect, it } from "vitest";
import {
  bottleSchema,
  centsToDollars,
  dollarsToCents,
  priceLadderSchema,
} from "@/lib/domain/bottle";

describe("money conversion", () => {
  it("converts dollars to integer cents without float drift", () => {
    expect(dollarsToCents("44.99")).toBe(4499);
    expect(dollarsToCents("0.1")).toBe(10);
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents("1.005")).toBe(101);
  });

  it("treats blank input as absent rather than zero", () => {
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents(null)).toBeNull();
    expect(dollarsToCents(undefined)).toBeNull();
  });

  it("round-trips back to a display string", () => {
    expect(centsToDollars(4499)).toBe("44.99");
    expect(centsToDollars(null)).toBe("");
  });
});

const validLadder = {
  msrpCents: 4400,
  msrpSourceUrl: "https://example.com/price",
  msrpSourceNote: undefined,
  msrpVerifiedAt: "2026-08-01",
  stealMaxCents: 3000,
  buyMaxCents: 4000,
  fairMaxCents: 5000,
  maybeMaxCents: 6000,
  editorialNote: "Why.",
};

describe("priceLadderSchema", () => {
  it("accepts an ascending ladder", () => {
    expect(priceLadderSchema.safeParse(validLadder).success).toBe(true);
  });

  it("rejects a ladder whose bands descend", () => {
    const result = priceLadderSchema.safeParse({ ...validLadder, stealMaxCents: 4500 });
    expect(result.success).toBe(false);
  });

  it("requires a verification date for a reference price", () => {
    const result = priceLadderSchema.safeParse({ ...validLadder, msrpVerifiedAt: "" });
    expect(result.success).toBe(false);
  });

  it("requires a source for a reference price", () => {
    const result = priceLadderSchema.safeParse({
      ...validLadder,
      msrpSourceUrl: "",
      msrpSourceNote: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("allows thresholds with no reference price at all", () => {
    const result = priceLadderSchema.safeParse({
      ...validLadder,
      msrpCents: null,
      msrpSourceUrl: "",
      msrpVerifiedAt: "",
    });
    expect(result.success).toBe(true);
  });
});

const validBottle = {
  slug: "example-bourbon",
  brandId: "0f9b2f7c-1111-4111-8111-111111111111",
  name: "Example Bourbon",
  classification: "Kentucky Straight Bourbon",
  proof: 100,
  abv: 50,
  hasAgeStatement: false,
  ageYears: null,
  mashBillStatus: "undisclosed" as const,
  mashBillDetails: undefined,
  producer: "Example Distilling Co.",
  actualDistiller: undefined,
  description: "A description.",
  imagePath: undefined,
  imageAlt: undefined,
  status: "draft" as const,
};

describe("bottleSchema", () => {
  it("accepts a valid draft", () => {
    expect(bottleSchema.safeParse(validBottle).success).toBe(true);
  });

  it("rejects a slug that is not URL safe", () => {
    expect(bottleSchema.safeParse({ ...validBottle, slug: "Example Bourbon" }).success).toBe(false);
  });

  it("rejects proof above 200", () => {
    expect(bottleSchema.safeParse({ ...validBottle, proof: 201 }).success).toBe(false);
  });

  it("rejects an age on a bottle with no age statement", () => {
    const result = bottleSchema.safeParse({ ...validBottle, ageYears: 10 });
    expect(result.success).toBe(false);
  });

  it("accepts an age when the bottle carries a statement", () => {
    const result = bottleSchema.safeParse({
      ...validBottle,
      hasAgeStatement: true,
      ageYears: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an image with no alt text", () => {
    const result = bottleSchema.safeParse({ ...validBottle, imagePath: "bottles/x.webp" });
    expect(result.success).toBe(false);
  });

  it("rejects a disclosed mash bill with no details", () => {
    const result = bottleSchema.safeParse({ ...validBottle, mashBillStatus: "disclosed" });
    expect(result.success).toBe(false);
  });
});

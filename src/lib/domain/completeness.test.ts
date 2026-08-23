import { describe, expect, it } from "vitest";
import { scoreCompleteness, type CompletenessInput } from "@/lib/domain/completeness";

const complete: CompletenessInput = {
  bottle: {
    name: "Example Bourbon",
    slug: "example-bourbon",
    brandId: "0f9b2f7c-1111-4111-8111-111111111111",
    classification: "Kentucky Straight Bourbon",
    proof: 100,
    abv: 50,
    description: "A description.",
    imagePath: "bottles/example.webp",
    imageAlt: "A bottle of Example Bourbon",
    producer: "Example Distilling Co.",
    actualDistiller: "Example Distilling Co.",
    mashBillStatus: "undisclosed",
    mashBillDetails: null,
  },
  price: {
    msrpCents: 4400,
    msrpVerifiedAt: "2026-08-01",
    stealMaxCents: 3000,
    buyMaxCents: 4000,
    fairMaxCents: 5000,
    maybeMaxCents: 6000,
    editorialNote: "Why these numbers.",
  },
  review: {
    quickTake: "Worth it.",
    nose: "n",
    palate: "p",
    finish: "f",
    overall: "o",
    bestFor: "b",
    skipIf: "s",
  },
  tastingProfileSet: true,
  alternativeCount: 2,
  retailerCount: 1,
  sourceCount: 3,
};

describe("scoreCompleteness", () => {
  it("allows publishing a fully populated record", () => {
    const report = scoreCompleteness(complete);
    expect(report.canPublish).toBe(true);
    expect(report.missingRequired).toHaveLength(0);
    expect(report.score).toBe(100);
  });

  it("blocks publishing without a price ladder", () => {
    const report = scoreCompleteness({ ...complete, price: null });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("ladder");
  });

  it("blocks publishing without any cited source", () => {
    const report = scoreCompleteness({ ...complete, sourceCount: 0 });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("sources");
  });

  it("blocks publishing an image that has no alt text", () => {
    const report = scoreCompleteness({
      ...complete,
      bottle: { ...complete.bottle, imageAlt: null },
    });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("image");
  });

  it("does not block publication on an undisclosed distiller", () => {
    const report = scoreCompleteness({
      ...complete,
      bottle: { ...complete.bottle, actualDistiller: null },
    });
    expect(report.missingRequired.map((f) => f.key)).not.toContain("distiller");
    expect(report.canPublish).toBe(true);
    // It still counts against the score, so an editor can see the gap.
    expect(report.score).toBeLessThan(100);
  });

  it("counts an undisclosed mash bill as complete, but a claimed one as incomplete", () => {
    const undisclosed = scoreCompleteness(complete);
    expect(undisclosed.fields.find((f) => f.key === "mash_bill")?.present).toBe(true);

    const claimed = scoreCompleteness({
      ...complete,
      bottle: { ...complete.bottle, mashBillStatus: "disclosed", mashBillDetails: null },
    });
    expect(claimed.fields.find((f) => f.key === "mash_bill")?.present).toBe(false);
  });

  it("blocks publishing a bottle with no verdict explanation", () => {
    const report = scoreCompleteness({
      ...complete,
      price: { ...complete.price!, editorialNote: null },
    });
    expect(report.canPublish).toBe(false);
    expect(report.missingRequired.map((f) => f.key)).toContain("verdict_note");
  });

  it("scores an empty record at zero and refuses publication", () => {
    const report = scoreCompleteness({ bottle: {} });
    expect(report.score).toBe(0);
    expect(report.canPublish).toBe(false);
  });
});

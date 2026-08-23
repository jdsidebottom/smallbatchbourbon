import { describe, expect, it } from "vitest";
import { evaluateVerdict, whatWedPayCents, type PriceLadder } from "@/lib/domain/verdict";

// $30 / $40 / $50 / $60 ceilings.
const ladder: PriceLadder = {
  stealMaxCents: 3000,
  buyMaxCents: 4000,
  fairMaxCents: 5000,
  maybeMaxCents: 6000,
};

describe("evaluateVerdict", () => {
  it("returns Steal well below the first ceiling", () => {
    expect(evaluateVerdict(1999, ladder)).toBe("steal");
  });

  it("treats every ceiling as inclusive", () => {
    expect(evaluateVerdict(3000, ladder)).toBe("steal");
    expect(evaluateVerdict(4000, ladder)).toBe("buy");
    expect(evaluateVerdict(5000, ladder)).toBe("fair");
    expect(evaluateVerdict(6000, ladder)).toBe("maybe");
  });

  it("moves to the next band one cent above a ceiling", () => {
    expect(evaluateVerdict(3001, ladder)).toBe("buy");
    expect(evaluateVerdict(4001, ladder)).toBe("fair");
    expect(evaluateVerdict(5001, ladder)).toBe("maybe");
    expect(evaluateVerdict(6001, ladder)).toBe("walk_away");
  });

  it("returns Walk Away for anything above the Maybe ceiling", () => {
    expect(evaluateVerdict(25_000, ladder)).toBe("walk_away");
  });

  it("handles a free bottle without falling through the bands", () => {
    expect(evaluateVerdict(0, ladder)).toBe("steal");
  });

  it("collapses bands correctly when ceilings are equal", () => {
    const flat: PriceLadder = {
      stealMaxCents: 4000,
      buyMaxCents: 4000,
      fairMaxCents: 4000,
      maybeMaxCents: 4000,
    };
    expect(evaluateVerdict(4000, flat)).toBe("steal");
    expect(evaluateVerdict(4001, flat)).toBe("walk_away");
  });
});

describe("whatWedPayCents", () => {
  it("is the top of the Buy band", () => {
    expect(whatWedPayCents(ladder)).toBe(4000);
  });
});

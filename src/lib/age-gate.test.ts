import { describe, expect, it } from "vitest";
import { AGE_GATE_BOOTSTRAP, AGE_GATE_COOKIE, shouldInertShell } from "./age-gate";

describe("shouldInertShell", () => {
  it("seals the site while the gate is up", () => {
    expect(shouldInertShell(true, "/")).toBe(true);
    expect(shouldInertShell(true, "/bourbon/eagle-rare")).toBe(true);
    expect(shouldInertShell(true, "/best/bourbon-under-50")).toBe(true);
  });

  it("releases it once the visitor has entered", () => {
    expect(shouldInertShell(false, "/")).toBe(false);
    expect(shouldInertShell(false, "/not-eligible")).toBe(false);
  });

  it("never seals the under-21 exit", () => {
    // The gate does not render there, so an inert page would leave a visitor
    // with nothing reachable at all.
    expect(shouldInertShell(true, "/not-eligible")).toBe(false);
  });

  it("seals when the path is not yet known", () => {
    // Fail closed: an unknown route is gated rather than exposed.
    expect(shouldInertShell(true, null)).toBe(true);
  });
});

describe("AGE_GATE_BOOTSTRAP", () => {
  it("checks the acknowledgement cookie", () => {
    expect(AGE_GATE_BOOTSTRAP).toContain(`${AGE_GATE_COOKIE}=1`);
  });

  it("only ever dismisses the gate, never raises it", () => {
    expect(AGE_GATE_BOOTSTRAP).toContain('"data-age-gate","ok"');
    expect(AGE_GATE_BOOTSTRAP).not.toContain('"pending"');
  });

  it("cannot throw and block paint", () => {
    expect(AGE_GATE_BOOTSTRAP).toContain("try");
    expect(AGE_GATE_BOOTSTRAP).toContain("catch");
  });
});

import { describe, expect, it } from "vitest";
import { safeAdminRedirect } from "@/lib/domain/redirect";

describe("safeAdminRedirect", () => {
  it("keeps a genuine admin path", () => {
    expect(safeAdminRedirect("/admin/bottles")).toBe("/admin/bottles");
    expect(safeAdminRedirect("/admin")).toBe("/admin");
  });

  it("falls back when nothing is supplied", () => {
    expect(safeAdminRedirect(null)).toBe("/admin");
    expect(safeAdminRedirect(undefined)).toBe("/admin");
    expect(safeAdminRedirect("")).toBe("/admin");
  });

  it("refuses to bounce a signed-in editor off-site", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\evil.com",
      "\\evil.com",
      "http://localhost:3100/admin",
      "/adminevil",
      "/bourbon",
      "javascript:alert(1)",
    ]) {
      expect(safeAdminRedirect(bad), bad).toBe("/admin");
    }
  });
});

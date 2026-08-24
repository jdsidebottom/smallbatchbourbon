import { describe, expect, it } from "vitest";
import { supabaseCspOrigins } from "@/lib/domain/csp";

describe("supabaseCspOrigins", () => {
  it("allows the project origin over https and wss", () => {
    const result = supabaseCspOrigins("https://abc123.supabase.co");
    expect(result.connectSrc).toEqual([
      "https://abc123.supabase.co",
      "wss://abc123.supabase.co",
    ]);
    expect(result.imgSrc).toEqual(["https://abc123.supabase.co"]);
  });

  it("strips any path, so only the origin is allowed", () => {
    expect(supabaseCspOrigins("https://abc123.supabase.co/rest/v1/").origin).toBe(
      "https://abc123.supabase.co",
    );
  });

  it("returns nothing when Supabase is not configured", () => {
    for (const value of [undefined, null, "", "not a url"]) {
      const result = supabaseCspOrigins(value);
      expect(result.connectSrc).toEqual([]);
      expect(result.imgSrc).toEqual([]);
    }
  });

  it("refuses a non-https origin rather than weakening the policy", () => {
    expect(supabaseCspOrigins("http://abc123.supabase.co").connectSrc).toEqual([]);
  });
});

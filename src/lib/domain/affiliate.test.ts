import { describe, expect, it } from "vitest";
import { buildDestination, isSafeSlug, sanitizeOriginPath } from "@/lib/domain/affiliate";

describe("isSafeSlug", () => {
  it("accepts ordinary slugs", () => {
    expect(isSafeSlug("reservebar")).toBe(true);
    expect(isSafeSlug("eagle-rare-10")).toBe(true);
  });

  it("rejects anything that could escape the lookup", () => {
    for (const bad of [
      "../../etc/passwd",
      "shop/../admin",
      "shop%2F..",
      "UPPER",
      "trailing-",
      "-leading",
      "double--hyphen".replace("--", "--"),
      "with space",
      "semi;colon",
      "",
    ]) {
      expect(isSafeSlug(bad), bad).toBe(false);
    }
  });

  it("rejects an absurdly long slug", () => {
    expect(isSafeSlug("a".repeat(121))).toBe(false);
  });
});

describe("buildDestination", () => {
  it("returns the stored https URL unchanged when there is no tracking config", () => {
    expect(buildDestination("https://shop.example.com/bourbon", null)).toBe(
      "https://shop.example.com/bourbon",
    );
  });

  it("appends the merchant's tracking parameters", () => {
    const result = buildDestination("https://shop.example.com/x?a=1", {
      utm_source: "sbb",
      aff: "123",
    });
    expect(result).toContain("a=1");
    expect(result).toContain("utm_source=sbb");
    expect(result).toContain("aff=123");
  });

  it("overwrites rather than duplicates an existing parameter", () => {
    const result = buildDestination("https://shop.example.com/x?aff=old", { aff: "new" });
    expect(result).toBe("https://shop.example.com/x?aff=new");
  });

  it("ignores non-string tracking values", () => {
    const result = buildDestination("https://shop.example.com/x", {
      good: "yes",
      bad: { nested: true },
      alsoBad: 42,
    });
    expect(result).toContain("good=yes");
    expect(result).not.toContain("bad");
    expect(result).not.toContain("42");
  });

  it("refuses any scheme other than https", () => {
    expect(buildDestination("http://shop.example.com", null)).toBeNull();
    expect(buildDestination("javascript:alert(1)", null)).toBeNull();
    expect(buildDestination("data:text/html,<script>", null)).toBeNull();
    expect(buildDestination("file:///etc/passwd", null)).toBeNull();
  });

  it("refuses a malformed URL", () => {
    expect(buildDestination("not a url", null)).toBeNull();
    expect(buildDestination("", null)).toBeNull();
  });
});

describe("sanitizeOriginPath", () => {
  const requestUrl = "https://smallbatchbourbon.com/go/shop/bottle";

  it("keeps a same-origin pathname", () => {
    expect(sanitizeOriginPath("https://smallbatchbourbon.com/bourbon/x", requestUrl)).toBe(
      "/bourbon/x",
    );
  });

  it("discards an external referrer entirely", () => {
    expect(sanitizeOriginPath("https://google.com/search?q=secret", requestUrl)).toBeNull();
  });

  it("drops the query string even on same-origin referrers", () => {
    expect(
      sanitizeOriginPath("https://smallbatchbourbon.com/bourbon/x?email=a@b.co", requestUrl),
    ).toBe("/bourbon/x");
  });

  it("handles a missing or malformed referrer", () => {
    expect(sanitizeOriginPath(null, requestUrl)).toBeNull();
    expect(sanitizeOriginPath("garbage", requestUrl)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { buildMediaPath, mediaUrl, validateImage, MAX_IMAGE_BYTES } from "./media";

const SUPABASE = "https://abc123.supabase.co";

describe("validateImage", () => {
  it("accepts each allowed type and reports its extension", () => {
    const cases: [string, string][] = [
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
      ["image/avif", "avif"],
    ];
    for (const [type, extension] of cases) {
      const result = validateImage({ type, size: 1000, name: "x" });
      expect(result).toEqual({ ok: true, extension });
    }
  });

  it("rejects a type the bucket would refuse anyway", () => {
    for (const type of ["image/svg+xml", "application/pdf", "text/html", ""]) {
      expect(validateImage({ type, size: 1000, name: "x" }).ok).toBe(false);
    }
  });

  it("rejects an empty file", () => {
    expect(validateImage({ type: "image/png", size: 0, name: "x" }).ok).toBe(false);
  });

  it("rejects a file over the bucket's ceiling and says how big it was", () => {
    const result = validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1, name: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("5 MB");
  });

  it("accepts a file exactly at the ceiling", () => {
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES, name: "x" }).ok).toBe(true);
  });
});

describe("buildMediaPath", () => {
  it("uses the slug and a random suffix, never the uploaded filename", () => {
    expect(buildMediaPath("eagle-rare", "jpg", "r1")).toBe("eagle-rare/r1.jpg");
  });

  it("strips anything that could escape the intended prefix", () => {
    expect(buildMediaPath("../../etc/passwd", "png", "r1")).toBe("etcpasswd/r1.png");
    expect(buildMediaPath("a/b", "png", "r1")).toBe("ab/r1.png");
    // Slugs are validated lowercase upstream, so anything outside [a-z0-9-]
    // is dropped rather than folded - this only runs on input that already
    // failed validation elsewhere.
    expect(buildMediaPath("Aa-Bb", "png", "r1")).toBe("a-b/r1.png");
  });

  it("falls back to a usable prefix when the slug reduces to nothing", () => {
    expect(buildMediaPath("///", "png", "r1")).toBe("bottle/r1.png");
  });

  it("caps a very long slug", () => {
    const path = buildMediaPath("a".repeat(200), "png", "r1");
    expect(path.split("/")[0]).toHaveLength(80);
  });
});

describe("mediaUrl", () => {
  it("builds the public object URL", () => {
    expect(mediaUrl("eagle-rare/x.jpg", SUPABASE)).toBe(
      `${SUPABASE}/storage/v1/object/public/bottle-media/eagle-rare/x.jpg`,
    );
  });

  it("tolerates a leading slash", () => {
    expect(mediaUrl("/eagle-rare/x.jpg", SUPABASE)).toBe(
      `${SUPABASE}/storage/v1/object/public/bottle-media/eagle-rare/x.jpg`,
    );
  });

  it("passes an https URL through untouched", () => {
    expect(mediaUrl("https://cdn.example.com/a.jpg", SUPABASE)).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });

  it("refuses to render an http URL rather than downgrading the page", () => {
    expect(mediaUrl("http://cdn.example.com/a.jpg", SUPABASE)).toBeNull();
  });

  it("returns null when there is nothing to show or nowhere to get it", () => {
    expect(mediaUrl(null, SUPABASE)).toBeNull();
    expect(mediaUrl("", SUPABASE)).toBeNull();
    expect(mediaUrl("a.jpg", undefined)).toBeNull();
    expect(mediaUrl("a.jpg", "not a url")).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const result = vi.hoisted(() => ({
  current: { data: null as unknown, error: null as unknown },
  configured: true,
}));

/**
 * A stand-in for the PostgREST builder: every modifier returns itself, and
 * awaiting it yields whatever the test staged.
 */
function fakeQuery() {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result.current).then(resolve),
  };
  for (const method of ["select", "eq", "order", "limit", "maybeSingle", "textSearch", "ilike"]) {
    builder[method] = () => builder;
  }
  return builder;
}

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: () => (result.configured ? { from: () => fakeQuery() } : null),
}));

const { getPublishedBottle, listPublishedBottles, listPublishedSlugs, searchBottles } =
  await import("./public-bottles");

const dbError = { message: "connection terminated", code: "57P01" };

describe("public bottle reads", () => {
  beforeEach(() => {
    result.configured = true;
    result.current = { data: null, error: null };
  });

  describe("when the database fails", () => {
    beforeEach(() => {
      result.current = { data: null, error: dbError };
    });

    // Returning null or [] here would be cached as a real 404 or an empty
    // catalogue. Throwing lets Next.js keep the last good page instead.
    it("throws instead of reporting a missing bottle", async () => {
      await expect(getPublishedBottle("weller-12")).rejects.toEqual(dbError);
    });

    it("throws instead of reporting an empty catalogue", async () => {
      await expect(listPublishedBottles()).rejects.toEqual(dbError);
    });

    it("throws instead of handing the sitemap an empty list", async () => {
      await expect(listPublishedSlugs()).rejects.toEqual(dbError);
    });

    it("throws instead of reporting no search results", async () => {
      await expect(searchBottles("weller")).rejects.toEqual(dbError);
    });
  });

  describe("when the query succeeds", () => {
    it("still returns null for a bottle that genuinely does not exist", async () => {
      result.current = { data: null, error: null };

      await expect(getPublishedBottle("nope")).resolves.toBeNull();
    });

    it("still returns an empty list when nothing is published", async () => {
      result.current = { data: [], error: null };

      await expect(listPublishedBottles()).resolves.toEqual([]);
    });
  });

  it("returns empty state when Supabase is not configured, without throwing", async () => {
    result.configured = false;
    result.current = { data: null, error: dbError };

    await expect(getPublishedBottle("weller-12")).resolves.toBeNull();
    await expect(listPublishedBottles()).resolves.toEqual([]);
    await expect(searchBottles("weller")).resolves.toEqual([]);
  });

  // A term of "--" used to survive punctuation stripping as ":*", which
  // Postgres rejects. Swallowed before; a visible 500 now if it recurred.
  it("drops punctuation-only terms rather than building an invalid tsquery", async () => {
    result.current = { data: [], error: null };

    await expect(searchBottles("-- weller")).resolves.toEqual([]);
  });
});

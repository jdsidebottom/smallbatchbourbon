import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const setAllOnRefresh = vi.hoisted(() => ({ current: true }));
const user = vi.hoisted(() => ({ current: null as { id: string } | null }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: {
    cookies: {
      setAll: (
        c: { name: string; value: string; options?: object }[],
        headers: Record<string, string>,
      ) => void;
    };
  }) => ({
    auth: {
      // Supabase writes refreshed tokens through `setAll` during getUser().
      getUser: async () => {
        if (setAllOnRefresh.current) {
          options.cookies.setAll(
            [{ name: "sb-access-token", value: "refreshed", options: { path: "/" } }],
            {
              "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
              Expires: "0",
              Pragma: "no-cache",
            },
          );
        }
        return { data: { user: user.current } };
      },
    },
  }),
}));

const { proxy } = await import("./proxy");

describe("proxy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    setAllOnRefresh.current = true;
    user.current = null;
  });

  it("carries a refreshed session cookie through the signed-in redirect away from /admin/login", async () => {
    user.current = { id: "admin" };

    const response = await proxy(new NextRequest("https://example.com/admin/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/admin");
    // Without this the browser keeps a refresh token the server has already
    // rotated away, and bounces straight back to the login page.
    expect(response.cookies.get("sb-access-token")?.value).toBe("refreshed");
    // A cached redirect that carries someone's session cookie would hand that
    // session to the next visitor.
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("carries cookies through the redirect that turns anonymous visitors away", async () => {
    const response = await proxy(new NextRequest("https://example.com/admin/bottles"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin/login?next=%2Fadmin%2Fbottles",
    );
    expect(response.cookies.get("sb-access-token")?.value).toBe("refreshed");
  });

  it("passes through without a redirect on a public admin route", async () => {
    setAllOnRefresh.current = false;

    const response = await proxy(new NextRequest("https://example.com/admin/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does nothing when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await proxy(new NextRequest("https://example.com/admin/bottles"));

    expect(response.status).toBe(200);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTurnstileConfigured, verifyTurnstile } from "./turnstile";

const SECRET = "0x0000000000000000000000000000000000000000";

function mockSiteverify(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn(async () =>
    ({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    }) as unknown as Response,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isTurnstileConfigured", () => {
  it("is false without a secret, so the route can skip verification", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(isTurnstileConfigured()).toBe(false);
  });

  it("is true once the secret is set", () => {
    expect(isTurnstileConfigured()).toBe(true);
  });
});

describe("verifyTurnstile", () => {
  it("reports not_configured rather than calling out with no secret", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchMock = mockSiteverify({ success: true });

    await expect(verifyTurnstile("token")).resolves.toEqual({ status: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare vouches for", async () => {
    mockSiteverify({ success: true });
    await expect(verifyTurnstile("token")).resolves.toEqual({ status: "ok" });
  });

  it("sends the secret and token as form-encoded siteverify parameters", async () => {
    const fetchMock = mockSiteverify({ success: true });
    await verifyTurnstile("tok-123", "203.0.113.7");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const sent = new URLSearchParams(init.body as string);
    expect(sent.get("secret")).toBe(SECRET);
    expect(sent.get("response")).toBe("tok-123");
    expect(sent.get("remoteip")).toBe("203.0.113.7");
  });

  it("omits remoteip when the caller could not determine one", async () => {
    // clientKey() returns the literal "unknown" when no forwarding header is
    // present; passing that through as an IP would be a lie to Cloudflare.
    const fetchMock = mockSiteverify({ success: true });
    await verifyTurnstile("tok", "unknown");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URLSearchParams(init.body as string).has("remoteip")).toBe(false);
  });

  it("rejects a missing or oversized token without an outbound call", async () => {
    const fetchMock = mockSiteverify({ success: true });

    await expect(verifyTurnstile(undefined)).resolves.toEqual({
      status: "failed",
      codes: ["missing-input-response"],
    });
    await expect(verifyTurnstile("")).resolves.toEqual({
      status: "failed",
      codes: ["missing-input-response"],
    });
    // Cloudflare caps tokens at 2048 characters.
    await expect(verifyTurnstile("x".repeat(2049))).resolves.toEqual({
      status: "failed",
      codes: ["missing-input-response"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a rejection with its error codes", async () => {
    mockSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    await expect(verifyTurnstile("tok")).resolves.toEqual({
      status: "failed",
      codes: ["invalid-input-response"],
    });
  });

  it("treats a replayed token as a rejection", async () => {
    mockSiteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    await expect(verifyTurnstile("tok")).resolves.toEqual({
      status: "failed",
      codes: ["timeout-or-duplicate"],
    });
  });

  it("treats internal-error as an outage, not as the visitor's fault", async () => {
    // The route fails open on `unavailable`. Classifying Cloudflare's own
    // failure as `failed` would turn a Cloudflare incident into a signup outage.
    mockSiteverify({ success: false, "error-codes": ["internal-error"] });
    await expect(verifyTurnstile("tok")).resolves.toEqual({
      status: "unavailable",
      detail: "internal-error",
    });
  });

  it("treats a non-2xx siteverify response as an outage", async () => {
    mockSiteverify({}, { ok: false, status: 502 });
    await expect(verifyTurnstile("tok")).resolves.toEqual({
      status: "unavailable",
      detail: "siteverify returned 502",
    });
  });

  it("treats a network failure as an outage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET"); }));
    await expect(verifyTurnstile("tok")).resolves.toEqual({
      status: "unavailable",
      detail: "ECONNRESET",
    });
  });

  it("treats an unparseable body as an outage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } }) as unknown as Response,
    ));
    await expect(verifyTurnstile("tok")).resolves.toEqual({
      status: "unavailable",
      detail: "siteverify returned a non-JSON body",
    });
  });
});

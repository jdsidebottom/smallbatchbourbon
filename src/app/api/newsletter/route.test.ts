import { describe, expect, it } from "vitest";
import { POST } from "./route";

/** Each case gets its own client key, so the in-process rate limit never fires. */
function post(body: string, ip: string) {
  return POST(
    new Request("https://example.com/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body,
    }),
  );
}

describe("POST /api/newsletter", () => {
  // `request.json()` accepts all of these. Reading `.company` off null threw,
  // so a malformed request returned 500 instead of a controlled 400.
  it.each([
    ["null", "null"],
    ["an array", "[]"],
    ["a number", "42"],
    ["a string", '"email@example.com"'],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await post(body, `10.0.0.${_label.length}`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "invalid_request" });
  });

  it("rejects a body that is not JSON at all", async () => {
    const response = await post("not json", "10.0.1.1");

    expect(response.status).toBe(400);
  });

  it("still validates the email on a well-formed object", async () => {
    const response = await post(JSON.stringify({ email: "nope" }), "10.0.2.1");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_email" });
  });

  it("still swallows honeypot submissions", async () => {
    const response = await post(
      JSON.stringify({ email: "real@example.com", company: "bot" }),
      "10.0.3.1",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ code: "subscribed" });
  });
});

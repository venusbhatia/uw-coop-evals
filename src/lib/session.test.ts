import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("session tokens", () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousIssuer = process.env.SESSION_ISSUER;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-with-32-chars-min";
    process.env.SESSION_ISSUER = "https://test.example.com";
  });

  afterEach(() => {
    process.env.SESSION_SECRET = previousSecret;
    process.env.SESSION_ISSUER = previousIssuer;
  });

  it("signs and verifies a session", async () => {
    const token = await createSessionToken("supervisor@8090.inc");
    const payload = await verifySessionToken(token);
    expect(payload?.email).toBe("supervisor@8090.inc");
  });

  it("rejects invalid emails at sign time", async () => {
    await expect(createSessionToken("bad@gmail.com")).rejects.toThrow();
  });
});

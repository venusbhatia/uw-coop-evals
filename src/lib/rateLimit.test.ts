import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/rateLimit";

describe("getClientIp", () => {
  it("reads first forwarded IP", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    expect(getClientIp(request)).toBe("198.51.100.2");
  });
});

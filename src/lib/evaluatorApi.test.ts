import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_ERROR_CONVEX_AUTH_FAILED,
  AUTH_ERROR_SESSION_EXPIRED,
  CONVEX_AUTH_FAILED_MESSAGE,
  EvaluationAuthError,
  SESSION_EXPIRED_MESSAGE,
  buildEvaluationReturnTo,
  buildOnboardingUrl,
  ensureEvaluationAuth,
  formatEvaluationError,
  isEvaluationAuthError,
} from "@/lib/evaluatorApi";

describe("evaluatorApi auth helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps session missing to SESSION_EXPIRED", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 401 }),
    );

    await expect(ensureEvaluationAuth()).rejects.toSatisfy((error: unknown) => {
      expect(isEvaluationAuthError(error)).toBe(true);
      expect((error as EvaluationAuthError).code).toBe(AUTH_ERROR_SESSION_EXPIRED);
      expect((error as EvaluationAuthError).message).toBe(SESSION_EXPIRED_MESSAGE);
      return true;
    });
  });

  it("maps convex-token failure to CONVEX_AUTH_FAILED", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, email: "you@8090.inc" }), {
          status: 200,
        }),
      )
      .mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));

    await expect(ensureEvaluationAuth()).rejects.toSatisfy((error: unknown) => {
      expect(isEvaluationAuthError(error)).toBe(true);
      expect((error as EvaluationAuthError).code).toBe(AUTH_ERROR_CONVEX_AUTH_FAILED);
      expect((error as EvaluationAuthError).message).toBe(CONVEX_AUTH_FAILED_MESSAGE);
      return true;
    });
  });

  it("formatEvaluationError maps Unauthenticated to session message", () => {
    expect(formatEvaluationError(new Error("Unauthenticated"))).toBe(
      SESSION_EXPIRED_MESSAGE,
    );
  });

  it("builds return URLs for onboarding redirect", () => {
    expect(buildEvaluationReturnTo("abc123", "midterm")).toBe(
      "/chat/new?studentId=abc123&type=midterm",
    );
    expect(buildOnboardingUrl("/chat/new?studentId=abc123&type=midterm")).toBe(
      "/onboarding?returnTo=%2Fchat%2Fnew%3FstudentId%3Dabc123%26type%3Dmidterm",
    );
  });
});

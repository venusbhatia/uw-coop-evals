import { notifySessionUpdated } from "@/lib/sessionEvents";

export const AUTH_ERROR_SESSION_EXPIRED = "SESSION_EXPIRED";
export const AUTH_ERROR_CONVEX_AUTH_FAILED = "CONVEX_AUTH_FAILED";

export const SESSION_EXPIRED_MESSAGE =
  "Your session expired. Sign in again to save this evaluation.";

export const CONVEX_AUTH_FAILED_MESSAGE =
  "Could not connect your session to the database. Sign in again and retry.";

export class EvaluationAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EvaluationAuthError";
    this.code = code;
  }
}

export function isEvaluationAuthError(
  error: unknown,
): error is EvaluationAuthError {
  return error instanceof EvaluationAuthError;
}

export function formatEvaluationError(error: unknown): string {
  if (isEvaluationAuthError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message === "Unauthenticated" || error.message.includes("Unauthenticated")) {
      return SESSION_EXPIRED_MESSAGE;
    }
    return error.message;
  }
  return "Something went wrong.";
}

export async function createServerSession(email: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });

  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Could not start session.");
  }

  notifySessionUpdated();
}

/** Wait until Convex client can use the httpOnly session (after sign-in). */
export async function waitForConvexAuth(maxAttempts = 40): Promise<void> {
  notifySessionUpdated();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch("/api/auth/convex-token", { credentials: "include" });
    if (res.ok) {
      notifySessionUpdated();
      await new Promise((resolve) => setTimeout(resolve, 80));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new EvaluationAuthError(
    AUTH_ERROR_CONVEX_AUTH_FAILED,
    CONVEX_AUTH_FAILED_MESSAGE,
  );
}

/** Verify httpOnly session and Convex token before evaluation actions. */
export async function ensureEvaluationAuth(): Promise<string> {
  const email = await fetchServerSessionEmail();
  if (!email) {
    throw new EvaluationAuthError(
      AUTH_ERROR_SESSION_EXPIRED,
      SESSION_EXPIRED_MESSAGE,
    );
  }

  try {
    await waitForConvexAuth();
  } catch (error: unknown) {
    if (isEvaluationAuthError(error)) {
      throw error;
    }
    throw new EvaluationAuthError(
      AUTH_ERROR_CONVEX_AUTH_FAILED,
      CONVEX_AUTH_FAILED_MESSAGE,
    );
  }

  return email;
}

export async function destroyServerSession(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
  notifySessionUpdated();
}

export async function fetchServerSessionEmail(): Promise<string | null> {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string; authenticated?: boolean };
  return data.authenticated && data.email ? data.email : null;
}

export function buildEvaluationReturnTo(studentId: string, evalType: string): string {
  const params = new URLSearchParams({ studentId, type: evalType });
  return `/chat/new?${params.toString()}`;
}

export function buildOnboardingUrl(returnTo?: string): string {
  if (!returnTo) return "/onboarding";
  return `/onboarding?returnTo=${encodeURIComponent(returnTo)}`;
}

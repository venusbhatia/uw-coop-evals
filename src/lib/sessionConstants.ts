export const SESSION_COOKIE_NAME = "employee-evals-session";
export const SESSION_APPLICATION_ID = "employee-evals";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const CONVEX_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1 hour

export const EXTENSION_SERVICE_EMAIL = "extension@8090.inc";
export const DEMO_EVALUATOR_EMAIL = "demo@8090.inc";

export function sessionIssuer(): string {
  const fromEnv = process.env.SESSION_ISSUER?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8090";
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://employee-evals.vercel.app"
  );
}

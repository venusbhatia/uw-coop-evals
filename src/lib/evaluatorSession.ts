const STORAGE_KEY = "employee-evals-evaluator-email";

/** Fixed domain suffix for 8090 work email */
export const EMAIL_DOMAIN = "@8090.inc";

/** Pre-filled demo evaluator for “See demo” */
export const DEMO_EVALUATOR_EMAIL = `demo${EMAIL_DOMAIN}`;

export function build8090Email(username: string): string {
  return `${username.trim().toLowerCase()}${EMAIL_DOMAIN}`;
}

export function isValid8090Username(username: string): boolean {
  const part = username.trim().toLowerCase();
  if (!part || part.includes("@")) return false;
  return /^[a-z0-9._+-]+$/.test(part);
}

export function getEvaluatorEmail(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const trimmed = raw.trim();
  return isValid8090Email(trimmed) ? trimmed : null;
}

export function setEvaluatorEmail(email: string): void {
  localStorage.setItem(STORAGE_KEY, email.trim());
}

export function clearEvaluatorEmail(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isValid8090Email(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return false;
  return trimmed.endsWith(EMAIL_DOMAIN);
}

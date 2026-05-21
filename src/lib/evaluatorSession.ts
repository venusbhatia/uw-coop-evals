import { DEMO_EVALUATOR_EMAIL } from "@/lib/sessionConstants";

export { DEMO_EVALUATOR_EMAIL };

const STORAGE_KEY = "evals-com-evaluator-email";

/** Basic email shape: local@domain with non-empty parts. */
export function isValidSignInEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254) return false;
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local.length || !domain.includes(".")) return false;
  if (/\s/.test(trimmed)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function getEvaluatorEmail(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const trimmed = raw.trim();
  return isValidSignInEmail(trimmed) ? trimmed.toLowerCase() : null;
}

export function setEvaluatorEmail(email: string): void {
  localStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());
}

export function clearEvaluatorEmail(): void {
  localStorage.removeItem(STORAGE_KEY);
}

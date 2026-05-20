import { DEMO_EVALUATOR_EMAIL } from "@/lib/sessionConstants";

export { DEMO_EVALUATOR_EMAIL };

const STORAGE_KEY = "employee-evals-evaluator-email";

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
  return trimmed.endsWith("@8090.inc");
}

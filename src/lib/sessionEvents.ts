export const SESSION_UPDATED_EVENT = "evals-com-session-updated";

export function notifySessionUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
}

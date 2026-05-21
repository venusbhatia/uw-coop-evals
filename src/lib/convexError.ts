import {
  formatEvaluationError,
  isEvaluationAuthError,
} from "@/lib/evaluatorApi";

/** Extract a user-visible message from Convex mutation/query failures. */
export function formatConvexError(error: unknown): string {
  if (isEvaluationAuthError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    const data = (error as Error & { data?: unknown }).data;
    if (typeof data === "string" && data.trim()) {
      return data;
    }
    if (data && typeof data === "object" && "message" in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) {
        return msg;
      }
    }
    if (error.message.trim()) {
      return error.message;
    }
  }

  return formatEvaluationError(error);
}

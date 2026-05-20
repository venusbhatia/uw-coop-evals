import type { ChatMessage } from "@/lib/evaluationConfig";

const MAX_MESSAGES = 30;
const MAX_CONTENT_LENGTH = 8000;

export function validateChatMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) {
    throw new Error("messages must be an array.");
  }

  if (input.length > MAX_MESSAGES) {
    throw new Error(`Too many messages (max ${MAX_MESSAGES}).`);
  }

  const validated: ChatMessage[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid message entry.");
    }

    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;

    if (role !== "user" && role !== "assistant") {
      throw new Error("Only user and assistant roles are allowed.");
    }

    if (typeof content !== "string") {
      throw new Error("Message content must be a string.");
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error("Message content cannot be empty.");
    }

    if (trimmed.length > MAX_CONTENT_LENGTH) {
      throw new Error(`Message exceeds ${MAX_CONTENT_LENGTH} characters.`);
    }

    validated.push({ role, content: trimmed });
  }

  return validated;
}

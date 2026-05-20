import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "@/lib/sanitizeFilename";

describe("sanitizeFilename", () => {
  it("removes unsafe characters", () => {
    expect(sanitizeFilename('John "../Smith')).toBe("John_.._Smith");
  });

  it("falls back when empty", () => {
    expect(sanitizeFilename("   ")).toBe("evaluation");
  });
});

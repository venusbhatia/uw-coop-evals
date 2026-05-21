import { describe, expect, it } from "vitest";
import { formatVoiceDuration } from "@/hooks/useSpeechToText";

describe("formatVoiceDuration", () => {
  it("formats seconds as M:SS", () => {
    expect(formatVoiceDuration(0)).toBe("0:00");
    expect(formatVoiceDuration(6000)).toBe("0:06");
    expect(formatVoiceDuration(65000)).toBe("1:05");
  });
});

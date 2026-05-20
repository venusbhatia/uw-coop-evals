import { describe, expect, it } from "vitest";
import { isValid8090Email } from "@/lib/evaluatorSession";

describe("isValid8090Email", () => {
  it("accepts valid 8090 emails", () => {
    expect(isValid8090Email("you@8090.inc")).toBe(true);
    expect(isValid8090Email("  Demo@8090.inc ")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValid8090Email("you@gmail.com")).toBe(false);
    expect(isValid8090Email("not-an-email")).toBe(false);
    expect(isValid8090Email("")).toBe(false);
  });
});

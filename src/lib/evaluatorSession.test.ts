import { describe, expect, it } from "vitest";
import { isValidSignInEmail } from "@/lib/evaluatorSession";

describe("isValidSignInEmail", () => {
  it("accepts common work and personal emails", () => {
    expect(isValidSignInEmail("you@gmail.com")).toBe(true);
    expect(isValidSignInEmail("supervisor@evals.com")).toBe(true);
    expect(isValidSignInEmail("  Demo@Company.co.uk ")).toBe(true);
  });

  it("rejects invalid addresses", () => {
    expect(isValidSignInEmail("not-an-email")).toBe(false);
    expect(isValidSignInEmail("@domain.com")).toBe(false);
    expect(isValidSignInEmail("user@")).toBe(false);
    expect(isValidSignInEmail("")).toBe(false);
  });
});

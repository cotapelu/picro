import { describe, it, expect } from "vitest";
import { sanitizeAndTruncate } from "./output-guards.js";
describe("sanitizeAndTruncate", () => {
  it("removes ANSI escape sequences", () => {
    const input = "\x1B[31mRed\x1B[0m text";
    const result = sanitizeAndTruncate(input);
    expect(result).toBe("Red text");
  });
  it("truncates long strings", () => {
    const long = "a".repeat(100);
    const result = sanitizeAndTruncate(long, 10);
    expect(result.length).toBeLessThan(long.length);
    expect(result.startsWith("a".repeat(10))).toBe(true);
    expect(result).toContain("(truncated, full length 100)");
  });
  it("returns unchanged for short strings", () => {
    const input = "short text";
    const result = sanitizeAndTruncate(input);
    expect(result).toBe(input);
  });
});

// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from "vitest";
import { ContextBuilder } from "./context-manager.js";
import type { ConversationTurn } from "./types.js";

function user(text: string): ConversationTurn {
  return {
    role: "user",
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
}
function assistant(text: string): ConversationTurn {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
}
function system(text: string): ConversationTurn {
  return {
    role: "system",
    content: [{ type: "text", text }],
    timestamp: Date.now(),
  };
}

describe("ContextBuilder (extra)", () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  describe("estimateTokenCount", () => {
    it("estimates correctly for ASCII", () => {
      expect(builder.estimateTokenCount("0123456789")).toBe(3);
    });

    it("handles unicode and emojis", () => {
      const str = "😀👍";
      expect(builder.estimateTokenCount(str)).toBe(Math.ceil(str.length / 4));
    });

    it("handles empty string", () => {
      expect(builder.estimateTokenCount("")).toBe(0);
    });
  });

  describe("estimateHistoryTokens", () => {
    it("sums tokens across turns", () => {
      const turns = [user("Hello"), assistant("Hi")];
      const tokens = builder.estimateHistoryTokens(turns);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe("truncateHistory", () => {
    const smallBuilder = new ContextBuilder({
      maxTokens: 100,
      reservedTokens: 0,
      minMessages: 2,
    });

    it("keeps all history when within limit", () => {
      const history = [user("a"), user("b"), user("c")];
      const truncated = smallBuilder.truncateHistory(history, 100);
      expect(truncated.length).toBe(3);
    });

    it("truncates oldest when exceeding limit", () => {
      const history = Array.from({ length: 10 }, (_, i) => user(`msg${i}`));
      const truncated = smallBuilder.truncateHistory(history, 5);
      expect(truncated.length).toBeLessThan(history.length);
      const ids = truncated.map((t) => (t.content[0] as any).text);
      expect(ids).not.toContain("msg0");
    });

    it("respects minMessages: keeps at least minMessages recent", () => {
      const builder = new ContextBuilder({
        maxTokens: 100,
        reservedTokens: 0,
        minMessages: 3,
      });
      const history = [user("a"), user("b"), user("c"), user("d"), user("e")];
      const truncated = builder.truncateHistory(history, 2);
      expect(truncated.length).toBeGreaterThanOrEqual(3);
      const texts = truncated.map((t) => (t.content[0] as any).text);
      expect(texts).toContain("e");
      expect(texts).toContain("d");
      expect(texts).toContain("c");
    });

    it("includes system messages always without truncation", () => {
      const builder = new ContextBuilder({
        maxTokens: 100,
        reservedTokens: 0,
        minMessages: 1,
      });
      const sys = system("You are a helpful assistant");
      const history = [user("a"), user("b"), user("c")];
      const truncated = builder.truncateHistory([sys, ...history], 2);
      const hasSystem = truncated.some((t) => t.role === "system");
      expect(hasSystem).toBe(true);
    });

    it("handles empty history", () => {
      const truncated = builder.truncateHistory([], 100);
      expect(truncated).toEqual([]);
    });
  });

  describe("isNearCapacity", () => {
    it("returns true when token count approaches limit", () => {
      const b = new ContextBuilder({ maxTokens: 100, reservedTokens: 0 });
      const turns = Array.from({ length: 100 }, (_, i) => user(`Turn ${i}`));
      expect(b.isNearCapacity(turns, 0.9)).toBe(true);
    });

    it("returns false when well under limit", () => {
      const b = new ContextBuilder({ maxTokens: 1000, reservedTokens: 0 });
      const turns = [user("Small")];
      expect(b.isNearCapacity(turns, 0.9)).toBe(false);
    });
  });
});

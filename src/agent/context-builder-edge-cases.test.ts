// SPDX-License-Identifier: Apache-2.0
/**
 * Edge case tests for ContextBuilder to increase coverage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ContextBuilder } from "./context-manager.js";
import type { ConversationTurn, MemoryEntry } from "./types.js";

describe("ContextBuilder - Edge Cases", () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  describe("build edge cases", () => {
    it("handles empty basePrompt", () => {
      const result = builder.build("", []);
      expect(result.prompt).toBeDefined();
      expect(result.tokenCount).toBeGreaterThanOrEqual(0);
    });

    it("handles undefined basePrompt (empty string)", () => {
      const result = builder.build("", []);
      expect(result.prompt).toBeDefined();
    });

    it("handles empty history array", () => {
      const result = builder.build("Test prompt", []);
      expect(result.prompt).toContain("Test prompt");
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it("handles history with empty content turn", () => {
      const history: ConversationTurn[] = [
        { id: "1", role: "user", content: [{ type: "text", text: "Hello" }], timestamp: Date.now() },
        { id: "2", role: "assistant", content: [{ type: "text", text: "Hi" }], timestamp: Date.now() },
        { id: "3", role: "user", content: [], timestamp: Date.now() }, // empty content
      ];
      const result = builder.build("Continue", history);
      expect(result.prompt).toBeDefined();
    });

    it("handles null memories array", () => {
      const result = builder.build("Test", [], null as any);
      expect(result.prompt).toBeDefined();
    });

    it("handles empty memories array", () => {
      const result = builder.build("Test", [], []);
      expect(result.prompt).toBeDefined();
    });

    it("handles memories with empty content", () => {
      const memories: MemoryEntry[] = [
        { id: "m1", content: "Relevant info", embedding: [0.1, 0.2], score: 0.95, createdAt: Date.now() },
        { id: "m2", content: "", embedding: [0.3, 0.4], score: 0.8, createdAt: Date.now() },
      ];
      const result = builder.build("Test", [], memories);
      expect(result.prompt).toBeDefined();
    });
  });
});

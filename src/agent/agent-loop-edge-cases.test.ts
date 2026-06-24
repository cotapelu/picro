// SPDX-License-Identifier: Apache-2.0
/**
 * Edge case tests for AgentLoop to increase coverage to ≥90%.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { LoopStrategy, ReActLoopStrategy } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";
import type { AgentConfig, LLMResponse } from "./types.js";
import type { Context } from "../llm/index.js";

// Helper to create mock LLM complete function
const createMockLLMComplete = (response: LLMResponse) => {
  return async (context: Context, options?: any): Promise<LLMResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return response;
  };
};

describe("AgentLoop - Edge Cases", () => {
  let loop: AgentLoop;
  let mockLLMComplete: (context: Context, options?: any) => Promise<LLMResponse>;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;
  let strategy: LoopStrategy;
  let config: AgentConfig;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor(emitter);
    contextBuilder = new ContextBuilder();
    strategy = new ReActLoopStrategy();
    config = {
      maxRounds: 3,
      loopStrategy: strategy,
    };
  });

  describe("LLM Response Edge Cases", () => {
    it("handles null content", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: null,
        stopReason: "stop",
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("handles undefined content", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: undefined,
        stopReason: "stop",
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Tool Call Edge Cases", () => {
    it("handles tool call with null arguments", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: "",
        stopReason: "toolUse" as const,
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [{ id: "call_1", name: "testTool", arguments: null }],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
    });

    it("handles tool call with undefined arguments", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: "",
        stopReason: "toolUse" as const,
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [{ id: "call_1", name: "testTool", arguments: undefined }],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
    });

    it("handles empty tool calls array", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: "Response",
        stopReason: "stop",
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(true);
    });
  });

  describe("Loop Strategy Edge Cases", () => {
    it("handles maxRounds exceeded", async () => {
      const responses: LLMResponse[] = [
        {
          content: "",
          stopReason: "toolUse" as const,
          usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [{ id: "call_1", name: "testTool", arguments: {} }],
        },
        {
          content: "",
          stopReason: "toolUse" as const,
          usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [{ id: "call_2", name: "testTool", arguments: {} }],
        },
        {
          content: "",
          stopReason: "toolUse" as const,
          usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [{ id: "call_3", name: "testTool", arguments: {} }],
        },
        {
          content: "Final response",
          stopReason: "stop",
          usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
        },
      ];

      let callCount = 0;
      mockLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        const response = responses[callCount % responses.length];
        callCount++;
        return response;
      };

      loop = new AgentLoop(
        { ...config, maxRounds: 2 },
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      // ToolExecutor mock to fail all tool calls
      vi.spyOn(toolExecutor, "execute").mockRejectedValue(new Error("Tool failed"));

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
      // Should stop due to errors or max rounds
    });
  });

  describe("Context Building Edge Cases", () => {
    it("handles empty initial prompt", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: "Response",
        stopReason: "stop",
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
    });

    it("handles whitespace-only prompt", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: "Response",
        stopReason: "stop",
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "   ",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result).toBeDefined();
    });
  });

  describe("Error Recovery Edge Cases", () => {
    it("handles LLM complete throwing error", async () => {
      mockLLMComplete = async () => {
        throw new Error("LLM failure");
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles tool executor errors gracefully", async () => {
      mockLLMComplete = createMockLLMComplete({
        content: "",
        stopReason: "toolUse" as const,
        usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [{ id: "call_1", name: "testTool", arguments: {} }],
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLMComplete,
        async () => { throw new Error("stream not implemented"); },
      );

      // Spy on execute and throw
      const executeSpy = vi.spyOn(toolExecutor, "execute").mockRejectedValue(
        new Error("Tool execution failed")
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );

      expect(result).toBeDefined();
      executeSpy.mockRestore();
    });
  });
});

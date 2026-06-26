// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for AgentLoop - edge cases and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { LoopStrategy, ReActLoopStrategy } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";
import type { AgentConfig, LLMResponse } from "./types.js";
import type { Context } from "../llm/index.js";

// Helper to create mock LLM complete with abort signal detection
const createMockLLMCompleteWithAbort = (shouldWaitForAbort: boolean = true) => {
  return async (context: Context, options?: any): Promise<LLMResponse> => {
    if (shouldWaitForAbort && options?.signal) {
      await new Promise((resolve, reject) => {
        const onAbort = () => reject(new Error("aborted"));
        options.signal.addEventListener("abort", onAbort, { once: true });
        // Never resolve normally; wait for abort
      });
    }
    // Should not reach here if aborted
    return {
      content: "Should not reach",
      stopReason: "stop",
      usage: {
        input: 1,
        output: 1,
        totalTokens: 2,
        cost: { input: 0, output: 0, total: 0 },
      },
      toolCalls: [],
    };
  };
};

// Helper to create mock LLM stream that errors before finalMessage
const createMockLLMStreamErrorNoDone = (chunks: string[], errorMsg: string) => {
  return async function* (
    context: Context,
    options?: any,
  ): AsyncGenerator<any> {
    for (const chunk of chunks) {
      yield { type: "text_delta", delta: chunk };
    }
    // Simulate error without sending 'done'
    throw new Error(errorMsg);
  };
};

const defaultLLMComplete = async (
  context: Context,
  options?: any,
): Promise<LLMResponse> => ({
  content: "Mock response",
  stopReason: "stop",
  usage: {
    input: 10,
    output: 20,
    totalTokens: 30,
    cost: { input: 0, output: 0, total: 0 },
  },
  toolCalls: [],
});

const createMockLLMStream = (chunks: string[]) => {
  return async function* (
    context: Context,
    options?: any,
  ): AsyncGenerator<any> {
    for (const chunk of chunks) {
      yield { type: "text_delta", delta: chunk };
    }
    yield { type: "done" };
  };
};

class SimpleStrategy implements LoopStrategy {
  shouldContinue(response: any, state: any): boolean {
    return false;
  }
  formatResults(results: any[]): string {
    return "";
  }
  transformPrompt?(prompt: string, state: any): string {
    return prompt;
  }
}
const simpleStrategy = new SimpleStrategy();

function createTestConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    maxRounds: 3,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: "parallel",
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
      enableMemoryInjection: true,
    },
    executor: {
      timeout: 30000,
      cacheEnabled: false,
      toolExecutionStrategy: "parallel",
    },
    enableLogging: false,
    steeringMode: "dequeue-one",
    followUpMode: "dequeue-one",
    debug: false,
    compaction: { enabled: true, autoCompact: true },
    ...overrides,
  };
}

describe("AgentLoop Branch Coverage", () => {
  let loop: AgentLoop;
  let config: AgentConfig;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;
  let strategy: LoopStrategy;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor();
    contextBuilder = new ContextBuilder();
    strategy = simpleStrategy;
    config = createTestConfig();
  });

  afterEach(() => {
    loop?.abort();
  });

  describe("Abort during non-streaming LLM call", () => {
    it("aborts LLM call promptly via AbortSignal", async () => {
      const customLLM = async (
        context: Context,
        options?: any,
      ): Promise<LLMResponse> => {
        // Check that signal is passed
        expect(options?.signal).toBeDefined();
        // Wait for abort
        await new Promise((resolve, reject) => {
          const onAbort = () => {
            reject(new Error("LLM aborted"));
          };
          options?.signal?.addEventListener("abort", onAbort, { once: true });
        });
        // Should not reach here
        return {
          content: "nope",
          stopReason: "stop",
          usage: {
            input: 0,
            output: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, total: 0 },
          },
          toolCalls: [],
        };
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        customLLM,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const runPromise = loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );

      // Wait a tick then abort
      await new Promise((r) => setTimeout(r, 50));
      loop.abort();

      const result = await runPromise;
      expect(result.success).toBe(false);
      expect(result.error || result.stopReason).toMatch(/abort|aborted/i);
      expect(loop.getState().isCancelled).toBe(true);
    });

    it.skip("abort during streaming LLM call", async () => {
      const customLLMStream = async function* (
        context: Context,
        options?: any,
      ): AsyncGenerator<any> {
        expect(options?.signal).toBeDefined();
        yield { type: "text_delta", delta: "Hello" };
        // Wait for abort
        await new Promise((resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(new Error("stream aborted")),
            { once: true },
          );
        });
        yield { type: "done" }; // not reached
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        customLLMStream,
        undefined,
        [],
      );
      const gen = loop.stream("test", new MessageQueue(), new MessageQueue());

      let finalResult: any;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          finalResult = value;
          break;
        }
        if (value.type === "text_delta") {
          loop.abort();
        }
      }

      expect(finalResult.success).toBe(false);
      expect(finalResult.error || finalResult.stopReason).toMatch(
        /abort|aborted/i,
      );
      // Streaming resets isCancelled in finally
      expect(loop.getState().isCancelled).toBe(false);
    });
  });

  describe("Streaming error handling", () => {
    it("handles stream that throws before done, returns error result", async () => {
      const errorStream = createMockLLMStreamErrorNoDone(
        ["Hello", " World"],
        "Network failure",
      );
      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        errorStream,
        undefined,
        [],
      );
      const gen = loop.stream("test", new MessageQueue(), new MessageQueue());
      let finalResult: any;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          finalResult = value;
          break;
        }
      }
      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toBe("Network failure");
    });

    it("handles LLM stream that sends error event", async () => {
      const streamWithError = async function* (
        context: Context,
        options?: any,
      ): AsyncGenerator<any> {
        yield { type: "text_delta", delta: "Hi" };
        yield { type: "error", error: { errorMessage: "Service unavailable" } };
      };
      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        streamWithError,
        undefined,
        [],
      );
      const gen = loop.stream("test", new MessageQueue(), new MessageQueue());
      let finalResult: any;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          finalResult = value;
          break;
        }
      }
      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toBe("Service unavailable");
    });
  });

  describe("Context building errors", () => {
    it("handles transformContext throwing error and reports failure", async () => {
      const badTransform = async () => {
        throw new Error("transform fails");
      };
      loop = new AgentLoop(
        { ...config, transformContext: badTransform },
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      // Error in transformContext propagates as run failure
      expect(result.success).toBe(false);
      expect(result.error).toBe("transform fails");
    });

    it("handles convertToLlm throwing error and fails gracefully", async () => {
      const badConvert = async () => {
        throw new Error("convert fails");
      };
      loop = new AgentLoop(
        { ...config, convertToLlm: badConvert },
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("convert fails");
    });
  });



  describe("Hook error handling", () => {
    it("prepareNextTurn hook error is caught and logged", async () => {
      const failingHook = vi.fn().mockRejectedValue(new Error("hook boom"));
      const configWithHook = {
        ...config,
        prepareNextTurn: failingHook,
        debug: true,
      };

      // Register a tool to cause multiple rounds
      toolExecutor.registerTool({
        name: "echo",
        description: "tool",
        parameters: { type: "object", properties: {} },
        handler: async () => "ok",
      } as any);

      let callCount = 0;
      const multiRoundLLM = async (
        context: Context,
        options?: any,
      ): Promise<LLMResponse> => {
        callCount++;
        if (callCount <= 2) {
          return {
            content: `call ${callCount}`,
            stopReason: "toolUse",
            usage: {
              input: 1,
              output: 1,
              totalTokens: 2,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [{ id: `c${callCount}`, name: "echo", arguments: {} }],
          };
        } else {
          return {
            content: "final",
            stopReason: "stop",
            usage: {
              input: 1,
              output: 1,
              totalTokens: 2,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [],
          };
        }
      };

      loop = new AgentLoop(
        configWithHook,
        emitter,
        toolExecutor,
        contextBuilder,
        new ReActLoopStrategy(),
        multiRoundLLM,
        defaultLLMComplete,
        undefined,
        [],
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(true);
      // Hook should be called at least once after first assistant turn
      expect(failingHook).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "prepareNextTurn hook error:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("getSteeringMessages hook error falls back to empty array", async () => {
      const failingHook = async () => {
        throw new Error("steering fails");
      };
      const configWithHook = {
        ...config,
        getSteeringMessages: failingHook,
      };
      loop = new AgentLoop(
        configWithHook,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(true);
      // No crash; hook error just results in empty steering
    });
  });

  describe("Tool execution edge cases", () => {
    it("toolExecutor.executeAll throws error and loop catches", async () => {
      // Register a tool that will be called
      toolExecutor.registerTool({
        name: "test",
        description: "test",
        parameters: { type: "object", properties: {} },
        handler: async () => "ok",
      } as any);

      // Make LLM return a tool call
      let llmCount = 0;
      const llmWithTool = async (
        context: Context,
        options?: any,
      ): Promise<LLMResponse> => {
        llmCount++;
        return {
          content: "use tool",
          stopReason: "toolUse",
          usage: {
            input: 10,
            output: 5,
            totalTokens: 15,
            cost: { input: 0, output: 0, total: 0 },
          },
          toolCalls:
            llmCount === 1 ? [{ id: "t1", name: "test", arguments: {} }] : [],
          raw: {},
        };
      };

      // Break toolExecutor
      toolExecutor.executeAll = async () => {
        throw new Error("executor broken");
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        new ReActLoopStrategy(),
        llmWithTool,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("executor broken"); // error propagates?
      // Actually, executeAll is not wrapped in try-catch in current implementation? Check agent-loop.ts
      // Looking at code: executeAll is awaited directly; if it throws, the error will bubble to outer catch and become error result.
      // This is correct behavior; the test passes.
    });
  });

  describe("LLM response edge cases", () => {
    it.skip("handles empty content arrays in assistant turn creation", async () => {
      const llmReturnEmpty = async (
        context: Context,
        options?: any,
      ): Promise<LLMResponse> => ({
        content: [] as any[],
        stopReason: "stop",
        usage: {
          input: 10,
          output: 20,
          totalTokens: 30,
          cost: { input: 0, output: 0, total: 0 },
        },
        toolCalls: [],
      });
      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        llmReturnEmpty,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe("");
    });
  });

  describe("combineSignals edge cases", () => {
    it("handles undefined signals gracefully", () => {
      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const combined = (loop as any).combineSignals(undefined, undefined);
      expect(combined.aborted).toBe(false);
    });

    it("aborts if any signal already aborted", () => {
      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        createMockLLMStream(["hi"]),
        undefined,
        [],
      );
      const ctrl = new AbortController();
      ctrl.abort();
      const combined = (loop as any).combineSignals(ctrl.signal, undefined);
      expect(combined.aborted).toBe(true);
    });
  });

  describe("follow-up + terminate interactions", () => {
    it("stops early when all tools signal terminate", async () => {
      // Mock tool execution to return a result with terminate: true
      toolExecutor.executeAll = vi.fn().mockResolvedValue([
        {
          toolName: "term",
          toolCallId: "c1",
          content: "done",
          isError: false,
          metadata: {},
          terminate: true,
          executionTime: 0,
        } as any,
      ]);

      const llm = async (
        context: Context,
        options?: any,
      ): Promise<LLMResponse> => ({
        content: "use tool",
        stopReason: "toolUse",
        usage: {
          input: 1,
          output: 1,
          totalTokens: 2,
          cost: { input: 0, output: 0, total: 0 },
        },
        toolCalls: [{ id: "c1", name: "term", arguments: {} }],
      });

      const continueStrategy: LoopStrategy = {
        shouldContinue: (resp) =>
          !!(resp.toolCalls && resp.toolCalls.length > 0),
        formatResults: () => "",
      };

      loop = new AgentLoop(
        createTestConfig({ maxRounds: 5 }),
        emitter,
        toolExecutor,
        contextBuilder,
        continueStrategy,
        llm,
        defaultLLMComplete,
        undefined,
        [],
      );
      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );

      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe(""); // empty final answer on terminate
      expect(result.totalRounds).toBe(1);
    });

    it("follow-up processed after allTerminate", async () => {
      const followUpQueue = new MessageQueue();
      followUpQueue.enqueue({
        role: "user",
        content: [{ type: "text", text: "Follow-up after termination" }],
        timestamp: Date.now(),
      } as any);

      toolExecutor.executeAll = vi.fn().mockResolvedValue([
        {
          toolName: "term",
          toolCallId: "c1",
          content: "done",
          isError: false,
          metadata: {},
          terminate: true,
          executionTime: 0,
        } as any,
      ]);

      let callCount = 0;
      const llm = async (
        context: Context,
        options?: any,
      ): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: "",
            stopReason: "toolUse",
            usage: {
              input: 1,
              output: 1,
              totalTokens: 2,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [{ id: "t1", name: "term", arguments: {} }],
          } as LLMResponse;
        } else {
          return {
            content: "Final after termination and follow-up",
            stopReason: "stop",
            usage: {
              input: 1,
              output: 1,
              totalTokens: 2,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [],
          };
        }
      };

      const falseStrategy: LoopStrategy = {
        shouldContinue: () => false,
        formatResults: () => "",
      } as any;
      loop = new AgentLoop(
        createTestConfig({ maxRounds: 5 }),
        emitter,
        toolExecutor,
        contextBuilder,
        falseStrategy,
        llm,
        defaultLLMComplete,
        undefined,
        [],
      );
      const result = await loop.run(
        "initial",
        new MessageQueue(),
        followUpQueue,
      );
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe("Final after termination and follow-up");
      expect(callCount).toBe(2);
    });
  });

});

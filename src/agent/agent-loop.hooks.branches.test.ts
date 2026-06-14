import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { MessageQueue } from "./message-queue.js";
import type { AgentConfig, LLMResponse } from "./types.js";
import type { Context } from "../llm/index.js";

// Default non-streaming LLM provider
const defaultLLMComplete = async (
  context: Context,
  options?: any,
): Promise<LLMResponse> => ({
  content: "Response",
  stopReason: "stop",
  usage: {
    input: 1,
    output: 1,
    totalTokens: 2,
    cost: { input: 0, output: 0, total: 0 },
  },
  toolCalls: [],
});

// Dummy streaming provider (not used)
const dummyStreamProvider = async (
  context: Context,
  options?: any,
): Promise<AsyncIterable<any>> => {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: "done" };
    },
  } as any;
};

function defaultConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 1,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionMode: "parallel",
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 1,
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
    debug: true,
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

describe("AgentLoop Hooks Branch Coverage", () => {
  let loop: AgentLoop;
  let config: AgentConfig;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;
  let strategy: any;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor();
    contextBuilder = new ContextBuilder();
    strategy = { shouldContinue: () => false, formatResults: () => "" };
    config = defaultConfig();
  });

  describe("memory retrieval error", () => {
    it("does not crash and continues when memoryStore.recall throws", async () => {
      const memoryStore = {
        recall: async () => {
          throw new Error("DB down");
        },
      };
      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        dummyStreamProvider,
        memoryStore as any,
        [],
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe("Response");
    });
  });

  describe("transformContext error", () => {
    it("catches transformContext error and returns failure", async () => {
      const badTransform = async (turns: any[], signal?: AbortSignal) => {
        throw new Error("transform failed");
      };
      const configWithTransform = defaultConfig({
        transformContext: badTransform,
      });
      loop = new AgentLoop(
        configWithTransform,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        dummyStreamProvider,
        undefined,
        [],
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/transform failed/);
    });
  });

  describe("getFollowUpMessages hook error", () => {
    it("handles error gracefully and returns empty array, resulting in normal completion", async () => {
      const hook = vi.fn().mockImplementation(async () => {
        throw new Error("hook fails");
      });
      const configWithHook = defaultConfig({
        getFollowUpMessages: hook,
        debug: true,
      });
      loop = new AgentLoop(
        configWithHook,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        defaultLLMComplete,
        dummyStreamProvider,
        undefined,
        [],
      );

      const result = await loop.run(
        "test",
        new MessageQueue(),
        new MessageQueue(),
      );

      expect(result.success).toBe(true);
      expect(hook).toHaveBeenCalled();
    });
  });
});

// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { ReActLoopStrategy } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";
import type { LLMResponse } from "./types.js";
import type { Context } from "../llm/index.js";

function createConfig(overrides: Partial<any> = {}): any {
  return {
    maxRounds: 2,
    verbose: false,
    toolTimeout: 1000,
    cacheResults: false,
    toolExecutionStrategy: "parallel",
    contextBuilder: {
      maxTokens: 1000,
      reservedTokens: 100,
      minMessages: 1,
      enableMemoryInjection: false,
    },
    executor: {
      timeout: 1000,
      cacheEnabled: false,
      toolExecutionStrategy: "parallel",
    },
    enableLogging: false,
    steeringMode: "dequeue-one",
    followUpMode: "dequeue-one",
    debug: false,
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

function mockLLM(response: string, toolCalls: any[] = []) {
  return async (
    context: Context = {},
    options?: any,
  ): Promise<LLMResponse> => ({
    content: response,
    stopReason: "stop",
    usage: {
      input: 1,
      output: 1,
      totalTokens: 2,
      cost: { input: 0, output: 0, total: 0 },
    },
    toolCalls,
  });
}

// Dummy stream provider for tests (non-streaming)
const dummyStream = async (
  context: Context = {},
  options?: any,
): Promise<AsyncIterable<any>> => ({
  [Symbol.asyncIterator]: async function* () {},
});

describe("AgentLoop (extra)", () => {
  let loop: AgentLoop;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;
  let strategy: ReActLoopStrategy;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor({
      timeout: 1000,
      cacheEnabled: false,
      toolExecutionStrategy: "parallel",
    });
    contextBuilder = new ContextBuilder({
      maxTokens: 1000,
      reservedTokens: 100,
      minMessages: 1,
      enableMemoryInjection: false,
    });
    strategy = new ReActLoopStrategy();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("run", () => {
    it("executes one round and returns success", async () => {
      loop = new AgentLoop(
        createConfig(),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLM("Hi"),
        dummyStream,
      );
      const result = await loop.run(
        "Hello",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe("Hi");
    });

    it("stops after maxRounds reached", async () => {
      loop = new AgentLoop(
        createConfig({ maxRounds: 1 }),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLM("", [{ name: "read", arguments: {}, id: "c1" }]),
        dummyStream,
      );
      const result = await loop.run(
        "Keep",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe("max_rounds");
    });

    it("handles LLM throw", async () => {
      const llm = async (context: Context, options?: any) => {
        throw new Error("llm error");
      };
      loop = new AgentLoop(
        createConfig(),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        llm,
        dummyStream,
      );
      const result = await loop.run(
        "Fail",
        new MessageQueue(),
        new MessageQueue(),
      );
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe("error");
      expect(result.error).toContain("llm error");
    });

    it("aborts via abortable provider", async () => {
      const abortableLLM = (context: Context, options?: any) =>
        new Promise<LLMResponse>((resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        });
      loop = new AgentLoop(
        createConfig(),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        abortableLLM,
        dummyStream,
      );
      const runP = loop.run("Hang", new MessageQueue(), new MessageQueue());
      await new Promise((r) => setTimeout(r, 20));
      loop.abort();
      const result = await runP;
      expect(result.success).toBe(false);
      expect(["aborted", "error"]).toContain(result.stopReason);
    });

    it("applies transformContext when provided", async () => {
      const transform = vi
        .fn()
        .mockResolvedValue([
          { role: "user", content: [{ type: "text", text: "transformed" }] },
        ]);
      loop = new AgentLoop(
        createConfig({ transformContext: transform }),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLM("Out"),
        dummyStream,
      );
      await loop.run("Input", new MessageQueue(), new MessageQueue());
      expect(transform).toHaveBeenCalled();
    });

    it("emits error event on LLM failure", async () => {
      const llm = async (context: Context, options?: any) => {
        throw new Error("boom");
      };
      loop = new AgentLoop(
        createConfig({ enableLogging: true }),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        llm,
        dummyStream,
      );
      const errorSpy = vi.spyOn(emitter, "emit");
      await loop.run("Bad", new MessageQueue(), new MessageQueue());
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", message: "boom" }),
      );
    });
  });

  describe("reset", () => {
    it("clears state after successful run", async () => {
      loop = new AgentLoop(
        createConfig(),
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
        mockLLM("Done"),
        dummyStream,
      );
      await loop.run("Once", new MessageQueue(), new MessageQueue());
      loop.reset();
      const state = loop.getState();
      expect(state.round).toBe(0);
      expect(state.history).toEqual([]);
    });
  });
});

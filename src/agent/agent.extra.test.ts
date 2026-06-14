// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from "vitest";
import { Agent } from "./agent.js";
import type { LLMResponse, ToolDefinition } from "./types.js";

function createTestConfig(overrides: Partial<any> = {}): any {
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

function mockLLM(
  response: string,
): (prompt: string, tools: any[], options?: any) => Promise<LLMResponse> {
  return async () => ({
    content: response,
    stopReason: "stop",
    usage: {
      input: 1,
      output: 1,
      totalTokens: 2,
      cost: { input: 0, output: 0, total: 0 },
    },
    toolCalls: [],
  });
}

describe("Agent (extra)", () => {
  describe("setLLMProvider", () => {
    it("allows setting provider after construction", async () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      agent.setLLMProvider(mockLLM("response"));
      const result = await agent.run("test");
      expect(result.finalAnswer).toBe("response");
    });
  });

  describe("setStreamProvider", () => {
    it("throws on missing stream provider", async () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      const gen = agent.stream("test");
      await expect(gen.next()).rejects.toThrow("LLM stream provider not set");
    });
  });

  describe("run with tool calls", () => {
    it("executes a tool and returns final text response", async () => {
      const agent = new Agent(
        undefined as any,
        [createTool("mytool")],
        createTestConfig(),
      );
      let callNum = 0;
      agent.setLLMProvider(async (prompt, tools) => {
        if (callNum === 0) {
          callNum++;
          return {
            content: "",
            stopReason: "stop",
            usage: {
              input: 0,
              output: 0,
              total: 0,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [{ name: "mytool", arguments: { x: 1 }, id: "c1" }],
          };
        } else {
          return {
            content: "Result after tool",
            stopReason: "stop",
            usage: {
              input: 2,
              output: 3,
              total: 5,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [],
          };
        }
      });

      const result = await agent.run("execute");
      expect(result.finalAnswer).toBe("Result after tool");
    });
  });

  describe("queues", () => {
    it("steer() enqueues and hasQueuedMessages reflects it", () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      expect(agent.hasQueuedMessages()).toBe(false);
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "steer" }],
        timestamp: Date.now(),
      });
      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearSteeringQueue();
      expect(agent.hasQueuedMessages()).toBe(false);
    });

    it("followUp() enqueues", () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "follow" }],
        timestamp: Date.now(),
      });
      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearFollowUpQueue();
      expect(agent.hasQueuedMessages()).toBe(false);
    });

    it("clearAllQueues clears both", () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "s" }],
        timestamp: Date.now(),
      });
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "f" }],
        timestamp: Date.now(),
      });
      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearAllQueues();
      expect(agent.hasQueuedMessages()).toBe(false);
    });
  });

  describe("abort", () => {
    it("aborts running agent and returns unsuccessful result", async () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      // Provider that rejects on abort; Agent catches and returns error result.
      agent.setLLMProvider((prompt, tools, options) => {
        return new Promise((resolve, reject) => {
          const onAbort = () => reject(new Error("aborted"));
          options?.signal?.addEventListener("abort", onAbort, { once: true });
        });
      });

      const runPromise = agent.run("hang");
      await new Promise((r) => setTimeout(r, 20));
      expect(agent.getState().isRunning).toBe(true);
      agent.abort();
      const result = await runPromise;
      expect(result.success).toBe(false);
      expect(["aborted", "error"]).toContain(result.stopReason);
      expect(agent.getState().isRunning).toBe(false);
    });

    it("abort is safe to call multiple times", async () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      agent.setLLMProvider((prompt, tools, options) => {
        return new Promise<void>((resolve) => {
          const onAbort = () => resolve();
          options?.signal?.addEventListener("abort", onAbort, { once: true });
        });
      });
      const runPromise = agent.run("hang");
      await new Promise((r) => setTimeout(r, 20));
      agent.abort();
      agent.abort();
      const result = await runPromise;
      expect(agent.getState().isRunning).toBe(false);
    });
  });

  describe("state", () => {
    it("isRunning false initially", () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      expect(agent.getState().isRunning).toBe(false);
    });

    it("getState returns history after run", async () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      agent.setLLMProvider(mockLLM("final"));
      const result = await agent.run("prompt");
      const state = agent.getState();
      expect(state.history.length).toBeGreaterThan(0);
      expect(state.isRunning).toBe(false);
    });
  });

  describe("config effects on strategy", () => {
    it("uses react strategy by default (parallel)", () => {
      const agent = new Agent(
        undefined as any,
        [],
        createTestConfig({ toolExecutionStrategy: "parallel" }),
      );
      expect((agent as any).strategy.constructor.name).toBe(
        "ReActLoopStrategy",
      );
    });

    it("uses simple strategy for sequential", () => {
      const agent = new Agent(
        undefined as any,
        [],
        createTestConfig({ toolExecutionStrategy: "sequential" }),
      );
      expect((agent as any).strategy.constructor.name).toBe(
        "SimpleLoopStrategy",
      );
    });

    it("respects explicit loopStrategy config", () => {
      const agent = new Agent(
        undefined as any,
        [],
        createTestConfig({ loopStrategy: "plan-solve" }),
      );
      expect((agent as any).strategy.constructor.name).toBe(
        "PlanSolveLoopStrategy",
      );
    });
  });

  describe("constructor with model", () => {
    it("auto-creates providers when model provided", () => {
      const model = {
        id: "m",
        provider: "test",
        baseUrl: "u",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1000,
        maxTokens: 100,
      } as any;
      const agent = new Agent(model, [], createTestConfig());
      expect((agent as any).llmComplete).toBeDefined();
      expect((agent as any).llmStream).toBeDefined();
    });
  });

  describe("reset", () => {
    it("clears history and queues", async () => {
      const agent = new Agent(undefined as any, [], createTestConfig());
      agent.setLLMProvider(mockLLM("ok"));
      await agent.run("one");
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "s" }],
        timestamp: Date.now(),
      });
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "f" }],
        timestamp: Date.now(),
      });
      expect(agent.hasQueuedMessages()).toBe(true);
      agent.reset();
      expect(agent.getState().history).toEqual([]);
      expect(agent.hasQueuedMessages()).toBe(false);
    });
  });
});

// Helper
function createTool(name: string): ToolDefinition {
  return {
    name,
    description: `Tool ${name}`,
    parameters: { type: "object", properties: {} },
    handler: async () => "result",
  };
}

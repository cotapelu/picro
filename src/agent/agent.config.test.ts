// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from "vitest";
import { Agent } from "./agent.js";
import type { AgentConfig, AgentTool } from "./types.js";
import type { Model } from "../llm/index.js";

function defaultConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 5,
    verbose: false,
    enableLogging: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionMode: "parallel",
    queueMode: "all",
    followUpMode: "all",
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

function minimalConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 5,
    verbose: false,
    enableLogging: false,
    toolTimeout: 30000,
    cacheResults: false,
    queueMode: "all",
    followUpMode: "all",
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

function mockModel(overrides: Partial<Model> = {}): Model {
  return {
    id: "test-model",
    name: "Test Model",
    api: "openai",
    provider: "openai",
    baseUrl: "",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1000,
    maxTokens: 100,
    ...overrides,
  };
}

describe("Agent config and internal methods", () => {
  describe("createLogger", () => {
    it("creates silent logger when enableLogging is false", () => {
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ enableLogging: false }),
      );
      // Logger should be a basic EventEmitter (no console.log)
      expect((agent as any).emitter).toBeDefined();
    });

    it("creates verbose logger when enableLogging and verbose are true", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ enableLogging: true, verbose: true }),
      );
      // Trigger an event to verify logger is attached - event type must match switch case
      (agent as any).emitter.emit({
        type: "agent:start",
        timestamp: Date.now(),
        round: 1,
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("creates verbose logger with different event types", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ enableLogging: true, verbose: true }),
      );

      // Test different event types - emit with type property
      (agent as any).emitter.emit({
        type: "agent:end",
        timestamp: Date.now(),
        round: 1,
      });
      (agent as any).emitter.emit({
        type: "turn:end",
        timestamp: Date.now(),
        round: 1,
        toolCallsExecuted: 2,
      });
      (agent as any).emitter.emit({
        type: "tool:error",
        timestamp: Date.now(),
        round: 1,
        toolName: "test",
      });
      (agent as any).emitter.emit({
        type: "error",
        timestamp: Date.now(),
        round: 1,
        message: "test error",
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("_resolveConfig (used in constructor)", () => {
    it("maps toolExecutionStrategy to toolExecutionMode when toolExecutionMode not provided", () => {
      const agent = new Agent(undefined as any, [], minimalConfig());
      const config = (agent as any)._resolveConfig({
        toolExecutionStrategy: "sequential",
      });
      expect(config.toolExecutionMode).toBe("sequential");
    });

    it("maps toolExecutionStrategy parallel to toolExecutionMode", () => {
      const agent = new Agent(undefined as any, [], minimalConfig());
      const config = (agent as any)._resolveConfig({
        toolExecutionStrategy: "parallel",
      });
      expect(config.toolExecutionMode).toBe("parallel");
    });

    it("uses default values for missing fields", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const config = (agent as any).resolveConfig({});
      expect(config.maxRounds).toBe(10);
      expect(config.verbose).toBe(false);
      expect(config.toolTimeout).toBe(30000);
      expect(config.cacheResults).toBe(false);
      expect(config.toolExecutionStrategy).toBe("parallel");
      expect(config.enableLogging).toBe(true);
      expect(config.debug).toBe(false);
      expect(config.compaction).toEqual({ enabled: true, autoCompact: true });
    });

    it("merges provided overrides with defaults", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const config = (agent as any).resolveConfig({
        maxRounds: 20,
        verbose: true,
      });
      expect(config.maxRounds).toBe(20);
      expect(config.verbose).toBe(true);
    });

    it("merges nested contextBuilder config", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const config = (agent as any).resolveConfig({
        contextBuilder: { maxTokens: 50000 },
      });
      expect(config.contextBuilder.maxTokens).toBe(50000);
      expect(config.contextBuilder.reservedTokens).toBe(4096);
    });

    it("merges nested executor config", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const config = (agent as any).resolveConfig({
        executor: { timeout: 60000 },
      });
      expect(config.executor.timeout).toBe(60000);
      expect(config.executor.cacheEnabled).toBe(false);
    });
  });

  describe("_convertToolsToLlm", () => {
    it("converts tools to LLM format", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const tools: AgentTool[] = [
        {
          name: "tool1",
          description: "Tool 1",
          parameters: { type: "object", properties: {} },
        },
        { name: "tool2", description: "", parameters: undefined },
        {
          name: "tool3",
          description: "Tool 3",
          parameters: { type: "object", properties: { a: { type: "string" } } },
        },
      ];
      const result = (agent as any)._convertToolsToLlm(tools);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: "tool1",
        description: "Tool 1",
        parameters: { type: "object", properties: {} },
      });
      expect(result[1]).toEqual({
        name: "tool2",
        description: "",
        parameters: {},
      });
      expect(result[2].parameters).toEqual({
        type: "object",
        properties: { a: { type: "string" } },
      });
    });

    it("handles empty tool array", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const result = (agent as any)._convertToolsToLlm([]);
      expect(result).toEqual([]);
    });
  });

  describe("_llmComplete and _llmStream with getApiKey", () => {
    it("_llmComplete calls getApiKey when provided", async () => {
      const getApiKey = vi.fn().mockResolvedValue("test-key");
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ getApiKey }),
      );
      const model = mockModel({ provider: "openai" });
      (agent as any).model = model;

      // Mock complete from llm module
      const { complete } = await import("../llm/index.js");
      const mockComplete = vi
        .spyOn(await import("../llm/index.js"), "complete")
        .mockResolvedValue({
          content: "response",
          stopReason: "stop",
          usage: {
            input: 10,
            output: 20,
            totalTokens: 30,
            cost: { input: 0, output: 0, total: 0 },
          },
          toolCalls: [],
        });

      const fn = (agent as any)._llmComplete;
      await fn({ messages: [] });

      expect(getApiKey).toHaveBeenCalledWith("openai");
      mockComplete.mockRestore();
    });

    it("_llmComplete does not add apiKey when getApiKey returns undefined", async () => {
      const getApiKey = vi.fn().mockResolvedValue(undefined);
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ getApiKey }),
      );
      const model = mockModel({ provider: "openai" });
      (agent as any).model = model;

      const { complete } = await import("../llm/index.js");
      const mockComplete = vi
        .spyOn(await import("../llm/index.js"), "complete")
        .mockResolvedValue({
          content: "response",
          stopReason: "stop",
          usage: {
            input: 10,
            output: 20,
            totalTokens: 30,
            cost: { input: 0, output: 0, total: 0 },
          },
          toolCalls: [],
        });

      const fn = (agent as any)._llmComplete;
      await fn({ messages: [] });

      expect(getApiKey).toHaveBeenCalled();
      const callArgs = mockComplete.mock.calls[0][2];
      expect(callArgs.apiKey).toBeUndefined();
      mockComplete.mockRestore();
    });

    it("_llmStream calls getApiKey when provided", async () => {
      const getApiKey = vi.fn().mockResolvedValue("stream-key");
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ getApiKey }),
      );
      const model = mockModel({ provider: "anthropic" });
      (agent as any).model = model;

      const { stream } = await import("../llm/index.js");
      const mockStream = vi
        .spyOn(await import("../llm/index.js"), "stream")
        .mockResolvedValue({});

      const fn = (agent as any)._llmStream;
      await fn({ messages: [] });

      expect(getApiKey).toHaveBeenCalledWith("anthropic");
      mockStream.mockRestore();
    });

    it("_llmComplete throws when model not set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const fn = (agent as any)._llmComplete;
      await expect(fn({ messages: [] })).rejects.toThrow("Model not set");
    });

    it("_llmStream throws when model not set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const fn = (agent as any)._llmStream;
      await expect(fn({ messages: [] })).rejects.toThrow("Model not set");
    });
  });

  describe("constructor edge cases", () => {
    it("uses toolExecutionMode sequential when toolExecutionStrategy is sequential", () => {
      const config = minimalConfig({ toolExecutionStrategy: "sequential" });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).config.toolExecutionMode).toBe("sequential");
    });

    it("uses toolExecutionMode parallel when toolExecutionStrategy is parallel", () => {
      const config = defaultConfig({ toolExecutionStrategy: "parallel" });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).config.toolExecutionMode).toBe("parallel");
    });

    it("prefers toolExecutionMode over toolExecutionStrategy", () => {
      const config = defaultConfig({
        toolExecutionMode: "sequential",
        toolExecutionStrategy: "parallel",
      });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).config.toolExecutionMode).toBe("sequential");
    });

    it("maps steeringMode all to queueMode all when queueMode not provided", () => {
      const config = defaultConfig({
        steeringMode: "all",
        queueMode: undefined,
      });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).config.queueMode).toBe("all");
    });

    it("maps steeringMode one-at-a-time to queueMode one-at-a-time when queueMode not provided", () => {
      const config = defaultConfig({
        steeringMode: "one-at-a-time",
        queueMode: undefined,
      });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).config.queueMode).toBe("one-at-a-time");
    });

    it("sets loopStrategy from config", () => {
      const config = defaultConfig({ loopStrategy: "plan-solve" });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).strategy).toBeDefined();
    });

    it("defaults loopStrategy to simple when toolExecutionMode is sequential", () => {
      const config = defaultConfig({
        toolExecutionMode: "sequential",
        loopStrategy: undefined,
      });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).strategy.constructor.name).toBe(
        "SimpleLoopStrategy",
      );
    });

    it("defaults loopStrategy to react when toolExecutionMode is parallel", () => {
      const config = defaultConfig({
        toolExecutionMode: "parallel",
        loopStrategy: undefined,
      });
      const agent = new Agent(undefined as any, [], config);
      expect((agent as any).strategy.constructor.name).toBe(
        "ReActLoopStrategy",
      );
    });
  });

  describe("setModel with model", () => {
    it("sets model and creates both providers", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const model = mockModel();
      agent.setModel(model);
      expect((agent as any).model).toBe(model);
      expect((agent as any).llmComplete).toBeDefined();
      expect((agent as any).llmStream).toBeDefined();
    });

    it("clears providers when setModel(undefined)", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(async () => ({
        content: "",
        stopReason: "stop",
        usage: {
          input: 0,
          output: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, total: 0 },
        },
        toolCalls: [],
      }));
      agent.setModel(undefined);
      expect((agent as any).model).toBeUndefined();
      expect((agent as any).llmComplete).toBeUndefined();
      expect((agent as any).llmStream).toBeUndefined();
    });
  });

  describe("execute and streamExecute", () => {
    it("execute calls runner.run with correct arguments", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(async () => ({
        content: "done",
        stopReason: "stop",
        usage: {
          input: 1,
          output: 1,
          totalTokens: 2,
          cost: { input: 0, output: 0, total: 0 },
        },
        toolCalls: [],
      }));

      const spy = vi.spyOn(agent.runner, "run").mockResolvedValue({
        success: true,
        stopReason: "stop",
        history: [],
      });

      const turns = [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "test" }],
          timestamp: Date.now(),
        },
      ];
      await (agent as any).execute(turns, undefined);

      expect(spy).toHaveBeenCalledWith(
        "",
        agent.steeringQueue,
        agent.followUpQueue,
        undefined,
        turns,
      );
    });

    it("streamExecute calls runner.stream with correct arguments", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(async () => ({
        content: "done",
        stopReason: "stop",
        usage: {
          input: 1,
          output: 1,
          totalTokens: 2,
          cost: { input: 0, output: 0, total: 0 },
        },
        toolCalls: [],
      }));

      const mockStream = vi.fn().mockImplementation(async function* () {
        yield { type: "delta", content: "x" };
        return { success: true, stopReason: "stop", history: [] };
      });
      vi.spyOn(agent.runner, "stream").mockReturnValue(mockStream());

      const turns = [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "test" }],
          timestamp: Date.now(),
        },
      ];
      const gen = (agent as any).streamExecute(turns, undefined);
      await gen.next();

      expect(agent.runner.stream).toHaveBeenCalledWith(
        "",
        agent.steeringQueue,
        agent.followUpQueue,
        undefined,
        turns,
      );
    });
  });
});

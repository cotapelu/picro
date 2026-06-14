import { describe, it, expect, vi } from "vitest";
import { Agent } from "./agent.js";
import type { AgentConfig, ToolDefinition } from "./types.js";
import type { Model } from "../llm/index.js";

// Mock LLM provider
const mockLLMProvider = async (): Promise<any> => ({
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

describe("Agent (unit)", () => {
  describe("constructor", () => {
    it("should not have model or providers initially when no model provided", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      expect((agent as any).model).toBeUndefined();
      expect((agent as any).llmComplete).toBeUndefined();
      expect((agent as any).llmStream).toBeUndefined();
    });

    it("should set providers when model provided in constructor", () => {
      const model: Model = {
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
      };
      const agent = new Agent(model, [], defaultConfig());
      expect((agent as any).model).toBe(model);
      expect((agent as any).llmComplete).toBeDefined();
      expect((agent as any).llmStream).toBeDefined();
    });

    it("should create contextBuilder by default", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      expect((agent as any).contextBuilder).toBeDefined();
    });

    it("should not create contextBuilder when convertToLlm provided", () => {
      const customConvert = (ctx: any) => ctx;
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ convertToLlm: customConvert }),
      );
      expect((agent as any).contextBuilder).toBeUndefined();
    });

    it('should map queueMode "all" to steeringQueue mode "drain-all"', () => {
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ queueMode: "all" }),
      );
      expect((agent as any).steeringQueue.getMode()).toBe("drain-all");
    });

    it('should map queueMode "one-at-a-time" to "dequeue-one"', () => {
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ queueMode: "one-at-a-time" }),
      );
      expect((agent as any).steeringQueue.getMode()).toBe("dequeue-one");
    });

    it("should map followUpMode to followUpQueue mode", () => {
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ followUpMode: "one-at-a-time" }),
      );
      expect((agent as any).followUpQueue.getMode()).toBe("dequeue-one");
    });

    it("should register executors handlers as tools", () => {
      const handler = vi.fn();
      const config = defaultConfig({
        executor: {
          handlers: {
            myTool: handler as any,
          },
        },
      });
      const agent = new Agent(undefined as any, [], config);
      expect(agent.hasTool("myTool")).toBe(true);
      expect(agent.getToolNames()).toContain("myTool");
    });

    it("should assign memoryStore when provided in config", () => {
      const memStore = {
        get: () => null,
        put: () => {},
        delete: async () => {},
      };
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ memoryStore: memStore as any }),
      );
      expect((agent as any).memoryStore).toBe(memStore);
    });
  });

  describe("tool management", () => {
    it("registerTool should add a tool that can be queried", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const tool: ToolDefinition = {
        name: "testTool",
        description: "Test tool",
        parameters: { type: "object", properties: {} },
        handler: vi.fn(),
      };
      agent.registerTool(tool);
      expect(agent.hasTool("testTool")).toBe(true);
      expect(agent.getToolNames()).toContain("testTool");
    });
  });

  describe("queue management", () => {
    it("steer enqueues to steeringQueue", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const turn = {
        role: "user" as const,
        content: [{ type: "text" as const, text: "Steer" }],
        timestamp: Date.now(),
      };
      agent.steer(turn);
      expect((agent as any).steeringQueue.hasPending).toBe(true);
    });

    it("followUp enqueues to followUpQueue", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const turn = {
        role: "user" as const,
        content: [{ type: "text" as const, text: "FollowUp" }],
        timestamp: Date.now(),
      };
      agent.followUp(turn);
      expect((agent as any).followUpQueue.hasPending).toBe(true);
    });

    it("hasQueuedMessages reflects both queues", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      expect(agent.hasQueuedMessages()).toBe(false);
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "A" }],
        timestamp: Date.now(),
      });
      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearSteeringQueue();
      expect(agent.hasQueuedMessages()).toBe(false);
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "B" }],
        timestamp: Date.now(),
      });
      expect(agent.hasQueuedMessages()).toBe(true);
    });

    it("clearSteeringQueue clears the steering queue", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "" }],
        timestamp: Date.now(),
      });
      expect((agent as any).steeringQueue.hasPending).toBe(true);
      agent.clearSteeringQueue();
      expect((agent as any).steeringQueue.hasPending).toBe(false);
    });

    it("clearFollowUpQueue clears the follow-up queue", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "" }],
        timestamp: Date.now(),
      });
      expect((agent as any).followUpQueue.hasPending).toBe(true);
      agent.clearFollowUpQueue();
      expect((agent as any).followUpQueue.hasPending).toBe(false);
    });

    it("clearAllQueues clears both steering and follow-up", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "" }],
        timestamp: Date.now(),
      });
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "" }],
        timestamp: Date.now(),
      });
      expect((agent as any).steeringQueue.hasPending).toBe(true);
      expect((agent as any).followUpQueue.hasPending).toBe(true);
      agent.clearAllQueues();
      expect((agent as any).steeringQueue.hasPending).toBe(false);
      expect((agent as any).followUpQueue.hasPending).toBe(false);
    });
  });

  describe("abort", () => {
    it("calls runner.abort without throwing", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const spy = vi.spyOn(agent.runner, "abort");
      agent.abort();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("setModel", () => {
    it("clears providers when set to undefined", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(mockLLMProvider);
      expect((agent as any).llmComplete).toBeDefined();
      agent.setModel(undefined);
      expect((agent as any).model).toBeUndefined();
      expect((agent as any).llmComplete).toBeUndefined();
      expect((agent as any).llmStream).toBeUndefined();
    });

    it("sets providers when given a model", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const model: Model = {
        id: "m",
        name: "M",
        api: "openai",
        provider: "openai",
        baseUrl: "",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1000,
        maxTokens: 100,
      };
      agent.setModel(model);
      expect((agent as any).model).toBe(model);
      expect((agent as any).llmComplete).toBeDefined();
      expect((agent as any).llmStream).toBeDefined();
    });
  });

  describe("run errors", () => {
    it("should reject if already running", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(mockLLMProvider);
      // Force running state
      (agent as any).runner.state.isRunning = true;
      await expect(agent.run("test")).rejects.toThrow(
        "Agent is already running",
      );
    });

    it("should reject if no LLM provider set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setModel(undefined);
      await expect(agent.run("test")).rejects.toThrow(
        "LLM provider not set. Provide a model or setModel() first.",
      );
    });
  });

  describe("resume errors", () => {
    it("should reject if already running", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(mockLLMProvider);
      // Force running state
      (agent as any).runner.state.isRunning = true;
      await expect(agent.resume()).rejects.toThrow("Agent is already running");
    });

    it("should reject if no LLM provider set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const model: Model = {
        id: "m",
        name: "M",
        api: "openai",
        provider: "openai",
        baseUrl: "",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1000,
        maxTokens: 100,
      };
      agent.setModel(model);
      agent.setLLMProvider(mockLLMProvider);
      await agent.run("first");
      agent.setModel(undefined);
      await expect(agent.resume()).rejects.toThrow(
        "LLM provider not set. Provide a model or setModel() first.",
      );
    });

    it("should reject if last turn is assistant and no queued messages", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(mockLLMProvider);
      await agent.run("test");
      // At this point last turn is assistant; no queued messages
      await expect(agent.resume()).rejects.toThrow(
        "Cannot resume: last message is assistant and no queued messages",
      );
    });

    it("resumes successfully with steering messages", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(mockLLMProvider);
      await agent.run("first");
      // Add a steering message
      agent.steer({
        role: "user",
        content: [{ type: "text", text: "steered" }],
        timestamp: Date.now(),
      });
      const result = await agent.resume();
      expect(result).toBeDefined();
      expect(result.stopReason).toBeDefined();
    });

    it("resumes successfully with followUp if no steering", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(mockLLMProvider);
      await agent.run("first");
      agent.followUp({
        role: "user",
        content: [{ type: "text", text: "followup" }],
        timestamp: Date.now(),
      });
      const result = await agent.resume();
      expect(result).toBeDefined();
    });
  });

  describe("stream errors", () => {
    it("throws if no stream provider set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setModel(undefined);
      const gen = agent.stream("test");
      // The error occurs when starting iteration
      await expect(gen.next()).rejects.toThrow(
        "LLM stream provider not set. Provide a model or setModel() first.",
      );
    });
  });

  describe("public getters", () => {
    it("getEmitter returns the internal emitter", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      expect(agent.getEmitter()).toBe((agent as any).emitter);
    });

    it("getMaxRounds returns config.maxRounds", () => {
      const agent = new Agent(
        undefined as any,
        [],
        defaultConfig({ maxRounds: 15 }),
      );
      expect(agent.getMaxRounds()).toBe(15);
    });

    it("getStrategy returns the strategy object", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      expect(agent.getStrategy()).toBe((agent as any).strategy);
    });

    it("getState returns runner state", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      expect(agent.getState()).toStrictEqual((agent as any).runner.getState());
    });
  });

  describe("LLM internal methods errors", () => {
    it("_llmComplete throws when model is not set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const fn = (agent as any)._llmComplete;
      await expect(fn({ messages: [] })).rejects.toThrow("Model not set");
    });

    it("_llmStream throws when model is not set", async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const fn = (agent as any)._llmStream;
      await expect(fn({ messages: [] })).rejects.toThrow("Model not set");
    });
  });

  describe("_prepareModel", () => {
    it("fills defaults for missing fields", () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const incomplete: any = { id: "id1" };
      const prepared = (agent as any)._prepareModel(incomplete);
      expect(prepared.id).toBe("id1");
      expect(prepared.name).toBe("id1");
      expect(prepared.api).toBe("openai-completions");
      expect(prepared.provider).toBe("openai");
      expect(prepared.baseUrl).toBe("");
      expect(prepared.reasoning).toBe(false);
      expect(prepared.input).toEqual(["text"]);
      expect(prepared.cost).toEqual({
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });
      expect(prepared.contextWindow).toBe(128000);
      expect(prepared.maxTokens).toBe(8192);
    });
  });
});

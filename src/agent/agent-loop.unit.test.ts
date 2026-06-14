import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentLoop } from "./agent-loop";
import type { AgentConfig } from "./types.js";

// Minimal mock classes
class MockEmitter {}
class MockToolExecutor {}
class MockContextBuilder {}
class MockLoopStrategy {}

function createConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxTurns: 10,
    ...overrides,
  } as any;
}

describe("AgentLoop (unit)", () => {
  let config: AgentConfig;
  let emitter: MockEmitter;
  let toolExecutor: MockToolExecutor;
  let contextBuilder: MockContextBuilder;
  let strategy: MockLoopStrategy;

  beforeEach(() => {
    config = createConfig();
    emitter = new MockEmitter();
    toolExecutor = new MockToolExecutor();
    contextBuilder = new MockContextBuilder();
    strategy = new MockLoopStrategy();
  });

  describe("construction", () => {
    it("should create initial state with default values", () => {
      const loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
      );
      const state = loop.getState();
      expect(state.round).toBe(0);
      expect(state.totalToolCalls).toBe(0);
      expect(state.totalTokens).toBe(0);
      expect(state.promptLength).toBe(0);
      expect(state.isRunning).toBe(false);
      expect(state.isCancelled).toBe(false);
      expect(state.toolResults).toEqual([]);
      expect(state.history).toEqual([]);
      expect(state.metadata).toEqual({});
    });

    it("should expose messages as alias to history", () => {
      const loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
      );
      const state = loop.getState();
      // The constructor aliases messages to history
      expect((state as any).messages).toBe(state.history);
    });
  });

  describe("abort", () => {
    it("should set isCancelled flag", () => {
      const loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
      );
      expect(loop.getState().isCancelled).toBe(false);
      loop.abort();
      expect(loop.getState().isCancelled).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset state to initial values", () => {
      const loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
      );
      // Simulate some state change
      (loop as any).state.round = 5;
      (loop as any).state.totalToolCalls = 2;
      (loop as any).state.isRunning = true;
      loop.reset();
      const state = loop.getState();
      expect(state.round).toBe(0);
      expect(state.totalToolCalls).toBe(0);
      expect(state.isRunning).toBe(false);
      expect(state.isCancelled).toBe(false);
    });
  });

  describe("getState", () => {
    it("should return a copy of state, not the internal reference", () => {
      const loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        strategy,
      );
      const state1 = loop.getState();
      const state2 = loop.getState();
      expect(state1).not.toBe(state2);
      expect(state1.round).toBe(state2.round);
    });
  });
});

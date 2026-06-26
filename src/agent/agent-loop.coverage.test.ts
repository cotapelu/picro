import { describe, it, expect, vi } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { LoopStrategy, ReActLoopStrategy } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";
import type { AgentConfig, LLMResponse } from "./types.js";
import type { Context } from "../llm/index.js";

// Simple strategy that stops after first assistant turn
const stopAfterOne: LoopStrategy = {
  shouldContinue: () => false,
  formatResults: () => "",
};

function defaultConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 3,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionMode: "parallel",
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
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
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

describe("AgentLoop Coverage", () => {
  let loop: AgentLoop;
  let config: AgentConfig;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor();
    contextBuilder = new ContextBuilder();
    config = defaultConfig();
  });

  describe("streaming with all event types", () => {
    it("handles full range of stream events", async () => {
      const finalContent = "All done";
      const streamProvider = async function* (
        context: Context,
        options?: any,
      ): AsyncGenerator<any> {
        // start
        yield {
          type: "start",
          partial: { content: [{ type: "text", text: "" }] },
        };
        // text_start
        yield { type: "text_start" };
        // text_delta chunks
        yield { type: "text_delta", delta: "Hello " };
        yield { type: "text_delta", delta: "World" };
        // text_end
        yield { type: "text_end" };
        // thinking_start, thinking_delta, thinking_end
        yield { type: "thinking_start" };
        yield { type: "thinking_delta", delta: "thinking" };
        yield { type: "thinking_end" };
        // toolcall_start, toolcall_delta, toolcall_end
        yield {
          type: "toolcall_start",
          partial: { name: "echo", arguments: { message: "hi" } },
        };
        yield {
          type: "toolcall_delta",
          delta: { name: "echo", arguments: { message: "hi" } },
        };
        yield { type: "toolcall_end" };
        // done with final message (no tool calls)
        yield {
          type: "done",
          message: {
            content: [{ type: "text", text: finalContent }],
            stopReason: "stop",
            usage: {
              input: 10,
              output: 10,
              totalTokens: 20,
              cost: { input: 0, output: 0, total: 0 },
            },
            toolCalls: [],
          },
        };
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        stopAfterOne,
        async () => {
          throw new Error("llmComplete not used");
        },
        streamProvider,
        [],
      );

      const events: any[] = [];
      const gen = loop.stream("test", new MessageQueue(), new MessageQueue());
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          const result = value;
          expect(result.success).toBe(true);
          expect(result.finalAnswer).toBe(finalContent);
          break;
        }
        events.push(value);
      }

      const types = events.map((e) => e.type);
      expect(types).toContain("start");
      expect(types).toContain("text_start");
      expect(types).toContain("text_delta");
      expect(types).toContain("text_end");
      expect(types).toContain("thinking_start");
      expect(types).toContain("thinking_delta");
      expect(types).toContain("thinking_end");
      expect(types).toContain("toolcall_start");
      expect(types).toContain("toolcall_delta");
      expect(types).toContain("toolcall_end");
      expect(types).toContain("done");
    });
  });

  describe("streaming error path", () => {
    it("handles error event from stream and returns failure", async () => {
      const streamProvider = async function* (context: Context, options?: any) {
        yield {
          type: "start",
          partial: { content: [{ type: "text", text: "" }] },
        };
        yield { type: "error", error: { errorMessage: "Stream failed" } };
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        stopAfterOne,
        async () => {
          throw new Error("llmComplete not used");
        },
        streamProvider,
        [],
      );

      const gen = loop.stream("test", new MessageQueue(), new MessageQueue());
      const events: any[] = [];
      let finalResult: any;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          finalResult = value;
          break;
        }
        events.push(value);
      }

      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toMatch(/Stream failed/);
    });
  });
});

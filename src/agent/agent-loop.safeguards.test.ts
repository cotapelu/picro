import { describe, it, expect, beforeEach } from "vitest";
import { AgentLoop } from "./agent-loop.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { EventEmitter } from "../events/event-emitter.js";
import { LoopStrategy, simpleStrategy } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";

function createConfig(overrides: Partial<any> = {}): any {
  return {
    maxRounds: 1,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: "parallel",
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
      enableMemoryInjection: false,
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

function mockLLMComplete(response: any) {
  return async (context: any, options?: any): Promise<any> => response;
}

describe('AgentLoop Memory Safeguards', () => {
  let loop: AgentLoop;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;
  let strategy: LoopStrategy;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor();
    contextBuilder = new ContextBuilder();
    strategy = simpleStrategy;
  });

  function initLoop(config: any) {
    const llmComplete = mockLLMComplete({
      content: "ok",
      stopReason: "stop",
      toolCalls: [],
    });
    const llmStream = async function* () {} as any;
    loop = new AgentLoop(
      config,
      emitter,
      toolExecutor,
      contextBuilder,
      strategy,
      llmComplete,
      llmStream,
      undefined,
      [],
    );
    // Initialize minimal state
    loop['state'] = {
      history: [],
      toolResults: [],
      round: 0,
      isCancelled: false,
      isRunning: false,
      totalToolCalls: 0,
      totalTokens: 0,
      lastTokenCount: 0,
      metadata: {},
    };
    loop['metrics'] = {
      llmCalls: 0,
      llmTokensInput: 0,
      llmTokensOutput: 0,
      llmTotalLatencyMs: 0,
      toolCalls: 0,
      toolSuccesses: 0,
      toolFailures: 0,
      toolTotalLatencyMs: 0,
      memoryRetrievals: 0,
      memoryCacheHits: 0,
      memoryCacheMisses: 0,
      memoryAvgLatencyMs: 0,
      compactions: 0,
      compactionTokensSaved: 0,
      historyEvictions: 0,
      toolResultsEvictions: 0,
    };
  }

  it('enforces MAX_TOOL_TURNS by evicting oldest tool turns', () => {
    initLoop(createConfig());
    const numTurns = 1500;
    const toolTurns: any[] = [];
    for (let i = 0; i < numTurns; i++) {
      toolTurns.push({
        role: 'tool',
        toolCallId: `call-${i}`,
        toolName: 'bash',
        content: [{ type: 'text', text: `output ${i}` }],
        isError: false,
        timestamp: Date.now(),
      });
    }
    loop['state'].history = toolTurns;
    // Call private enforce method
    (loop as any)._enforceHistoryLimits();
    const history = loop['state'].history;
    expect(history.length).toBe(1000);
    expect(loop['metrics'].historyEvictions).toBe(500);
    // Ensure the newest turns remain (oldest 500 removed)
    expect(history[0].toolCallId).toBe('call-500');
    expect(history[499].toolCallId).toBe('call-999');
  });

  it('enforces MAX_TOOL_RESULTS by evicting oldest results', () => {
    initLoop(createConfig());
    const numResults = 1500;
    const results: any[] = [];
    for (let i = 0; i < numResults; i++) {
      results.push({
        toolCallId: `call-${i}`,
        toolName: 'bash',
        output: `result ${i}`,
        isError: false,
        truncated: false,
      });
    }
    loop['state'].toolResults = results;
    (loop as any)._enforceToolResultsLimit();
    const toolResults = loop['state'].toolResults;
    expect(toolResults.length).toBe(1000);
    expect(loop['metrics'].toolResultsEvictions).toBe(500);
    expect(toolResults[0].toolCallId).toBe('call-500');
    expect(toolResults[499].toolCallId).toBe('call-999');
  });
});

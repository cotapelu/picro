import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLoop } from '../agent/agent-loop';
import { ToolExecutor } from '../agent/tool-executor';
import type { AgentTool } from '../agent/types';
import { ContextBuilder } from '../agent/context-manager';
import { LoopStrategyFactory } from '../agent/loop-strategy';
import { EventEmitter } from 'events';
import type { Context } from '../llm/index';
import type { LLMResponse } from '../agent/types';

function createConfig(overrides = {}): any {
  return {
    maxRounds: 2,
    verbose: false,
    toolTimeout: 10000,
    cacheResults: false,
    toolExecutionStrategy: 'parallel',
    contextBuilder: {
      maxTokens: 4000,
      reservedTokens: 500,
      minMessages: 1,
      enableMemoryInjection: false,
    },
    executor: {
      timeout: 10000,
      cacheEnabled: false,
      toolExecutionStrategy: 'parallel',
    },
    enableLogging: false,
    steeringMode: 'dequeue-one',
    followUpMode: 'dequeue-one',
    debug: false,
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

function mockLLM(response: string, toolCalls: any[] = []) {
  return async (context: Context = {}, options?: any): Promise<LLMResponse> => ({
    content: response,
    stopReason: 'stop',
    usage: {
      input: 1,
      output: 1,
      totalTokens: 2,
      cost: { input: 0, output: 0, total: 0 },
    },
    toolCalls,
  });
}

const dummyStream = async (context: Context = {}, options?: any): Promise<AsyncIterable<any>> => ({
  [Symbol.asyncIterator]: async function* () {},
});

describe('AgentLoop basic integration', () => {
  let loop: AgentLoop;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;
  let emitter: EventEmitter;
  let strategy: any;
  let llmComplete: any;
  let llmStream: any;

  beforeEach(() => {
    toolExecutor = new ToolExecutor({
      timeout: 10000,
      cacheEnabled: false,
      toolExecutionStrategy: 'parallel',
    });

    // Register a simple test tool with a proper handler (not execute)
    const testTool: AgentTool = {
      name: 'test_tool',
      description: 'A simple test tool',
      handler: async () => {
        return [{ type: 'text', text: 'test_result' }];
      },
      schema: {
        type: 'object',
        properties: {},
      },
    };
    toolExecutor.register(testTool);

    contextBuilder = new ContextBuilder({
      maxTokens: 4000,
      reservedTokens: 500,
      minMessages: 1,
      enableMemoryInjection: false,
    });

    emitter = new EventEmitter();
    strategy = LoopStrategyFactory.create('simple');

    // First call returns a tool call, second call returns final answer
    let callCount = 0;
    llmComplete = async (context: Context = {}, options?: any): Promise<LLMResponse> => {
      callCount++;
      if (callCount === 1) {
        return {
          content: '',
          toolCalls: [{ id: 'call_1', name: 'test_tool', arguments: {} }],
          stopReason: 'tool_calls',
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      } else {
        return {
          content: [{ type: 'text', text: 'Done' }],
          toolCalls: [],
          stopReason: 'stop',
          usage: { totalTokens: 20, promptTokens: 10, completionTokens: 10 },
        };
      }
    };

    llmStream = dummyStream;

    const config = createConfig();

    loop = new AgentLoop(
      config,
      emitter,
      toolExecutor,
      contextBuilder,
      strategy,
      llmComplete,
      llmStream,
      undefined,
      []
    );
    // Suppress emitter side-effects
    loop.emitter = { emit: async () => {} } as any;
  });

  it('should execute a tool call and include tool turn', async () => {
    // Simple queues that implement required methods
    const emptyQueue = {
      enqueue: () => {},
      dequeue: () => null,
      clear: () => {},
      drainAll: () => [], // needed by FollowUpManager
    };

    const result = await loop.run(
      'Use test_tool',
      emptyQueue,
      emptyQueue
    );

    expect(result.success).toBe(true);
    expect(result.stopReason).toBe('stop');

    // The tool should have been executed exactly once
    const toolResults = result.finalState.toolResults;
    expect(toolResults.length).toBe(1);
    expect(toolResults[0].toolName).toBe('test_tool');
    expect(toolResults[0].content).toEqual([{ type: 'text', text: 'test_result' }]);
  });
});

// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for AgentLoop.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLoop } from './agent-loop.js';
import { ToolExecutor } from './tool-executor.js';
import { ContextBuilder } from './context-manager.js';
import { EventEmitter } from '../events/event-emitter.js';
import { LoopStrategy, ReActLoopStrategy } from './loop-strategy.js';
import { MessageQueue } from './message-queue.js';
import type { AgentConfig, LLMResponse } from './types.js';
import type { Context } from '../llm/index.js';

// Mock LLM provider
const mockLLMProvider = async (prompt: string, tools: any[], options?: any): Promise<LLMResponse> => {
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 50));
  return {
    content: 'Mock response',
    stopReason: 'stop',
    usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
    toolCalls: [],
  };
};
// Helper to create mock LLM complete function (new signature)
const createMockLLMComplete = (response: LLMResponse) => {
  return async (context: Context, options?: any): Promise<LLMResponse> => {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 50));
    return response;
  };
};

const defaultLLMComplete = createMockLLMComplete({
  content: 'Mock response',
  stopReason: 'stop',
  usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
  toolCalls: [],
});

const createMockLLMStream = (chunks: string[]) => {
  return async function* (context: Context, options?: any): AsyncGenerator<any> {
    for (const chunk of chunks) {
      yield { type: 'text_delta', delta: chunk };
    }
    yield { type: 'done' };
  };
};

const defaultLLMStream = createMockLLMStream(['Hello', ' World']);


// Simple loop strategy that does nothing special
class SimpleStrategy implements LoopStrategy {
  shouldContinue(response: any, state: any): boolean { return false; }
  formatResults(results: any[]): string { return ''; }
  transformPrompt?(prompt: string, state: any): string { return prompt; }
}
const simpleStrategy = new SimpleStrategy();

function createTestConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    maxRounds: 3,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: 'parallel',
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
      enableMemoryInjection: true,
    },
    executor: {
      timeout: 30000,
      cacheEnabled: false,
      toolExecutionStrategy: 'parallel',
    },
    enableLogging: false,
    steeringMode: 'dequeue-one',
    followUpMode: 'dequeue-one',
    debug: false,
    compaction: { enabled: true, autoCompact: true },
    ...overrides,
  };
}

describe('AgentLoop', () => {
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

  describe('state management', () => {
    it('should initialize with clean state', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const state = loop.getState();
      expect(state.isRunning).toBe(false);
      expect(state.round).toBe(0);
      expect(state.totalToolCalls).toBe(0);
      expect(state.history).toEqual([]);
    });

    it('should set isRunning during execution', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const runPromise = loop.run('test', new MessageQueue(), new MessageQueue());
      // State should be running
      expect(loop.getState().isRunning).toBe(true);
      await runPromise;
      expect(loop.getState().isRunning).toBe(false);
    });
  });

  describe('run', () => {
    it('should execute to completion and return result', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('Hello', new MessageQueue(), new MessageQueue());

      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Mock response');
      expect(result.totalRounds).toBeGreaterThanOrEqual(1);
      expect(result.stopReason).toBe('stop');
    });

    it('should include history in state', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('Test', new MessageQueue(), new MessageQueue());

      const finalState = loop.getState();
      expect(finalState.history.length).toBeGreaterThan(0);
    });

    it('should respect maxRounds', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('Test', new MessageQueue(), new MessageQueue());

      expect(result.totalRounds).toBeLessThanOrEqual(config.maxRounds);
    });

    it('should abort when abort() is called', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      // Abort quickly
      setTimeout(() => loop.abort(), 10);

      const result = await loop.run('Hello', new MessageQueue(), new MessageQueue());

      // The flag should be set
      expect(loop.getState().isCancelled).toBe(true);
      // The run should complete (may be success or error depending on timing)
      // but it should not exceed maxRounds
      expect(result.totalRounds).toBeLessThanOrEqual(config.maxRounds);
    });
  });

  describe('stream', () => {
    it('should stream events and return final result', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);

      const mockStreamProvider = async function* (prompt: string, tools: any[], options?: any) {
        yield { type: 'text_delta', delta: 'Hello' };
        yield { type: 'text_delta', delta: ' World' };
        yield { type: 'done' };
      };

      const events: any[] = [];
      const result = await loop.stream('test', new MessageQueue(), new MessageQueue());

      // Should have completed and returned result
      expect(result).toBeDefined();
    });
  });

  describe('abort', () => {
    it('should set isCancelled flag', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      expect(loop.getState().isCancelled).toBe(false);
      loop.abort();
      expect(loop.getState().isCancelled).toBe(true);
    });
  });

  describe('event emission', () => {
    it('should emit agent:start and agent:end', async () => {
      const startSpy = vi.fn();
      const endSpy = vi.fn();
      emitter.on('agent:start', startSpy as any);
      emitter.on('agent:end', endSpy as any);

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      await loop.run('test', new MessageQueue(), new MessageQueue());

      expect(startSpy).toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();
    });
  });

  // Additional tests for coverage

  describe('run with tool calls', () => {
    it('executes tools and includes results in state', async () => {
      // Register a simple echo tool
      const echoTool = {
        name: 'echo',
        description: 'Echo message',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        },
        handler: async (args: any) => `Echo: ${args.message}`
      };
      toolExecutor.registerTool(echoTool as any);

      // Mock LLM: first call returns toolCall, second returns final answer
      let callCount = 0;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'Calling tool',
            stopReason: 'toolUse',
            usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ name: 'echo', arguments: { message: 'hello' } }],
            raw: {}
          };
        } else {
          return {
            content: 'Final answer after tool',
            stopReason: 'stop',
            usage: { input: 20, output: 10, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
            raw: {}
          };
        }
      };

      // Use ReActLoopStrategy to continue after tool calls
      const reactStrategy = new ReActLoopStrategy();
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, reactStrategy, customLLMComplete, defaultLLMStream, undefined, []);

      const result = await loop.run('test', new MessageQueue(), new MessageQueue());

      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Final answer after tool');

      const finalState = loop.getState();
      expect(finalState.totalToolCalls).toBeGreaterThanOrEqual(1);
      const toolTurns = finalState.history.filter(t => t.role === 'tool');
      expect(toolTurns.length).toBeGreaterThanOrEqual(1);
      const successTool = toolTurns.find(t => !t.isError);
      expect(successTool).toBeDefined();
      const resultContent = (successTool!.content as any[]).find((c: any) => c.type === 'text');
      expect(resultContent!.text).toContain('Echo: hello');
    });

    it('handles tool execution errors gracefully', async () => {
      // Register a tool that throws
      const badTool = {
        name: 'bad',
        description: 'Always fails',
        parameters: { type: 'object', properties: {} },
        handler: async () => { throw new Error('tool failure'); }
      };
      toolExecutor.registerTool(badTool as any);

      // Custom LLM that triggers tool error
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: '',
        stopReason: 'toolUse',
        usage: { input: 10, output: 0, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [{ name: 'bad', arguments: {} }],
        raw: {}
      });

      // Use simple strategy to avoid multiple rounds
      const simple = new SimpleStrategy();
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simple, customLLMComplete, defaultLLMStream, undefined, []);

      const result = await loop.run('test', new MessageQueue(), new MessageQueue());

      const finalState = loop.getState();
      const toolTurns = finalState.history.filter(t => t.role === 'tool');
      expect(toolTurns.length).toBeGreaterThanOrEqual(1);
      const errTurn = toolTurns.find(t => t.isError);
      expect(errTurn).toBeDefined();
      const errContent = (errTurn!.content as any[]).find((c: any) => c.type === 'text');
      expect(errContent!.text).toContain('tool failure');
    });
  });

  describe('run with LLM error', () => {
    it('records error and returns failure', async () => {
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        throw new Error('Network failure');
      };
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, customLLMComplete, defaultLLMStream, undefined, []);

      const result = await loop.run('test', new MessageQueue(), new MessageQueue());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
      expect(loop.getState().isRunning).toBe(false);
    });
  });

  describe('abort during long run', () => {
    it('cancels execution promptly', async () => {
      let abortSignal: AbortSignal | undefined;

      // Provider that waits for abort
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        abortSignal = options?.signal;
        await new Promise((resolve, reject) => {
          const onAbort = () => reject(new Error('aborted'));
          options?.signal?.addEventListener('abort', onAbort, { once: true });
          setTimeout(() => resolve({
            content: 'Finished',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
            raw: {}
          }), 5000);
        });
        return {
          content: 'Should not reach',
          stopReason: 'stop',
          usage: { input: 0, output: 0, totalTokens: 0, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
          raw: {}
        };
      };

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, customLLMComplete, defaultLLMStream, undefined, []);
      const runPromise = loop.run('test', new MessageQueue(), new MessageQueue());

      // Wait a bit then abort
      await new Promise(r => setTimeout(r, 100));
      loop.abort();
      expect(loop.getState().isCancelled).toBe(true);
      if (abortSignal) {
        expect(abortSignal.aborted).toBe(true);
      }

      const result = await runPromise;
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe('error');
      expect(result.error).toMatch(/aborted/i);
    });
  });

  // === HIGH-COVERAGE ADDITIONS ===

  describe('reset', () => {
    it('resets state to initial values', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      await loop.run('test', new MessageQueue(), new MessageQueue());
      const state1 = loop.getState();
      expect(state1.round).toBeGreaterThan(0);

      loop.reset();
      const state2 = loop.getState();
      expect(state2.isRunning).toBe(false);
      expect(state2.round).toBe(0);
      expect(state2.totalToolCalls).toBe(0);
      expect(state2.history).toEqual([]);
      expect(state2.isCancelled).toBe(false);
    });
  });

  describe('run with transformContext', () => {
    it('applies transformContext to history', async () => {
      loop = new AgentLoop(
        { ...config, transformContext: async (turns) => turns.map(t => ({ ...t, content: [{ type: 'text', text: 'transformed' }] })) },
        emitter, toolExecutor, contextBuilder, strategy,
        defaultLLMComplete, defaultLLMStream, undefined, []
      );
      const result = await loop.run('hello', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(true);
    });
  });

  describe('run with memoryStore', () => {
    it('emits memory:retrieve on successful recall', async () => {
      const memoryStore = { recall: async () => ({ memories: [{ content: 'mem1', relevance: 1, timestamp: Date.now(), metadata: {} }], scores: [0.9] }) };
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, memoryStore as any, []);
      const memorySpy = vi.fn();
      emitter.on('memory:retrieve', memorySpy as any);
      await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(memorySpy).toHaveBeenCalled();
      const event = memorySpy.mock.calls[0][0];
      expect(event.memories.length).toBe(1);
    });

    it('handles memory recall failure gracefully', async () => {
      const memoryStore = { recall: async () => { throw new Error('db down'); } };
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, memoryStore as any, []);
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(true);
      expect(consoleWarn).toHaveBeenCalledWith('Memory retrieval failed:', expect.any(Error));
      consoleWarn.mockRestore();
    });
  });

  describe('run with steering queue', () => {
    it('drains steering queue into history', async () => {
      const steeringQueue = new MessageQueue();
      steeringQueue.enqueue({ role: 'user', content: [{ type: 'text', text: 'steering' }], timestamp: Date.now() } as any);
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      await loop.run('test', steeringQueue, new MessageQueue());
      const state = loop.getState();
      const steeringTurns = state.history.filter(t => t.role === 'user' && (t as any).content?.[0]?.text === 'steering');
      expect(steeringTurns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('run with initialTurns', () => {
    it('includes initialTurns in history', async () => {
      const initialTurns = [
        { role: 'user', content: [{ type: 'text', text: 'prev' }], timestamp: Date.now() } as any,
        { role: 'assistant', content: [{ type: 'text', text: 'prev resp' }], timestamp: Date.now() } as any
      ];
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      await loop.run('new', new MessageQueue(), new MessageQueue(), undefined, initialTurns);
      const state = loop.getState();
      expect(state.history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('autoSaveMemory', () => {
    it('saves user input, assistant response, and tool results', async () => {
      const memoryStore = { remember: vi.fn().mockResolvedValue(undefined) } as any;
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, memoryStore, []);
      const response: LLMResponse = { content: 'Assistant says', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [], raw: {} };
      const toolResults: any[] = [{ toolName: 'test', result: 'ok', toolCallId: '123', metadata: {} }];
      await (loop as any).autoSaveMemory('prompt', response, toolResults);
      expect(memoryStore.remember).toHaveBeenCalledTimes(3);
    });

    it('handles errors without crashing', async () => {
      const memoryStore = { remember: vi.fn().mockRejectedValue(new Error('fail')) } as any;
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, memoryStore, []);
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const response: LLMResponse = { content: 'hi', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [], raw: {} };
      await (loop as any).autoSaveMemory('p', response, []);
      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('createAssistantTurn', () => {
    it('creates turn with content string', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const response: LLMResponse = { content: 'text only', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [], raw: {} };
      const turn = (loop as any).createAssistantTurn(response);
      expect(turn.role).toBe('assistant');
      expect(turn.content[0].type).toBe('text');
    });
  });

  describe('createToolTurn', () => {
    it('creates error turn', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const result: any = { toolName: 'bad', error: 'boom', toolCallId: '123' };
      const turn = (loop as any).createToolTurn(result);
      expect(turn.role).toBe('tool');
      expect(turn.isError).toBe(true);
      const text = (turn.content as any[]).find(c => c.type === 'text');
      expect(text.text).toBe('boom');
    });

    it('creates success turn with details', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const result: any = { toolName: 'ok', result: 'good', toolCallId: '123', metadata: { details: 'info' } };
      const turn = (loop as any).createToolTurn(result);
      expect(turn.isError).toBe(false);
      expect(turn.details).toBe('info');
    });
  });

  describe('drainQueue', () => {
    it('drains all messages from queue', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const queue = new MessageQueue();
      queue.enqueue({ role: 'user', content: [{ type: 'text', text: 'a' }], timestamp: Date.now() } as any);
      queue.enqueue({ role: 'user', content: [{ type: 'text', text: 'b' }], timestamp: Date.now() } as any);
      const drained = (loop as any).drainQueue(queue);
      expect(drained.length).toBe(2);
      expect(queue.hasPending).toBe(false);
    });
  });

  describe('combineSignals', () => {
    it('combines signals and triggers when all abort', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const ctrl1 = new AbortController();
      const ctrl2 = new AbortController();
      const combined = (loop as any).combineSignals(ctrl1.signal, ctrl2.signal);
      const abortPromise = new Promise(resolve => combined.addEventListener('abort', resolve, { once: true }));
      // Both must abort for combined to abort
      ctrl1.abort();
      ctrl2.abort();
      await abortPromise;
      expect(combined.aborted).toBe(true);
    });

    it('immediate abort if any signal already aborted', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const ctrl = new AbortController();
      ctrl.abort();
      const combined = (loop as any).combineSignals(ctrl.signal, undefined);
      expect(combined.aborted).toBe(true);
    });
  });

  describe('run: transformPrompt', () => {
    it('applies strategy.transformPrompt', async () => {
      const strategyWithTransform: LoopStrategy = { shouldContinue: () => false, formatResults: () => '', transformPrompt: (p) => p + ' [transformed]' } as any;
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategyWithTransform as any, defaultLLMComplete, defaultLLMStream, undefined, []);
      const spy = vi.fn();
      emitter.on('llm:request', spy as any);
      await loop.run('hello', new MessageQueue(), new MessageQueue());
      const call = spy.mock.calls[0][0];
      expect(call.promptLength).toBeGreaterThan(0);
    });
  });

  describe('run: max rounds', () => {
    it('stops after maxRounds and returns max_rounds error', async () => {
      const infiniteStrategy: LoopStrategy = { shouldContinue: () => true, formatResults: () => '' } as any;
      toolExecutor.registerTool({ name: 'echo', description: 'e', parameters: { type: 'object', properties: {} }, handler: async () => 'done' } as any);
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: '', stopReason: 'toolUse', usage: { input: 10, output: 0, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [{ id: '1', name: 'echo', arguments: {} }], raw: {}
      });
      loop = new AgentLoop({ ...config, maxRounds: 2 }, emitter, toolExecutor, contextBuilder, infiniteStrategy as any, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe('max_rounds');
      expect(result.totalRounds).toBe(2);
    });
  });

  describe('debug emissions', () => {
    it('emits debug:run:timing on error', async () => {
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => { throw new Error('fail'); };
      loop = new AgentLoop({ ...config, debug: true }, emitter, toolExecutor, contextBuilder, strategy, customLLMComplete, defaultLLMStream, undefined, []);
      const debugSpy = vi.fn();
      emitter.on('debug:run:timing', debugSpy as any);
      await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(debugSpy).toHaveBeenCalled();
      const timing = debugSpy.mock.calls[0][0];
      // totalRunTime can be 0 if error thrown instantly; accept >=0
      expect(timing.totalRunTime).toBeGreaterThanOrEqual(0);
    });

    it('emits debug:round:timing during tool calls', async () => {
      toolExecutor.registerTool({ name: 't', description: 't', parameters: { type: 'object', properties: {} }, handler: async () => 'ok' } as any);
      const reactStrategy = new ReActLoopStrategy();
      let count = 0;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        count++;
        if (count === 1) {
          return { content: 'Call', stopReason: 'toolUse', usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [{ id: 't1', name: 't', arguments: {} }], raw: { } };
        }
        return { content: 'Done', stopReason: 'stop', usage: { input: 20, output: 10, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [], raw: {} };
      };
      loop = new AgentLoop({ ...config, debug: true }, emitter, toolExecutor, contextBuilder, reactStrategy, customLLMComplete, defaultLLMStream, undefined, []);
      const debugSpy = vi.fn();
      emitter.on('debug:round:timing', debugSpy as any);
      await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe('strategy.shouldContinue', () => {
    it('breaks after tools when shouldContinue false', async () => {
      toolExecutor.registerTool({ name: 'e', description: 'e', parameters: { type: 'object', properties: {} }, handler: async () => 'ok' } as any);
      const strategyFalse: LoopStrategy = { shouldContinue: () => false, formatResults: () => '' } as any;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => ({ content: 'Call', stopReason: 'toolUse', usage: { input: 10, output: 0, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [{ id: 'c1', name: 'e', arguments: {} }], raw: {} });
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategyFalse, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      // Since shouldContinue false with tool calls, loop breaks and returns max_rounds failure
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe('max_rounds');
    });

    it('continues when shouldContinue true until max rounds', async () => {
      toolExecutor.registerTool({ name: 'e', description: 'e', parameters: { type: 'object', properties: {} }, handler: async () => 'ok' } as any);
      const strategyTrue: LoopStrategy = { shouldContinue: () => true, formatResults: () => '' } as any;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => ({ content: 'Call', stopReason: 'toolUse', usage: { input: 10, output: 0, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [{ id: 'c2', name: 'e', arguments: {} }], raw: {} });
      loop = new AgentLoop({ ...config, maxRounds: 2 }, emitter, toolExecutor, contextBuilder, strategyTrue, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe('max_rounds');
    });
  });

  describe('signal integration', () => {
    it('passes combined signal to llm provider', async () => {
      let capturedOptions: any;
      // Custom LLM complete that captures options
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        capturedOptions = options;
        return {
          content: 'ok',
          stopReason: 'stop',
          usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
        } as LLMResponse;
      };
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, customLLMComplete, defaultLLMStream, undefined, []);
      const externalSignal = new AbortController().signal;
      await loop.run('test', new MessageQueue(), new MessageQueue(), externalSignal);
      expect(capturedOptions?.signal).toBeDefined();
    });
  });

  describe('tool call with toolCallId preservation', () => {
    it('preserves toolCallId in tool turn', async () => {
      toolExecutor.registerTool({ name: 'g', description: 'g', parameters: { type: 'object', properties: {} }, handler: async () => 'val' } as any);
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'Call', stopReason: 'toolUse', usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } }, toolCalls: [{ id: 'callABC', name: 'g', arguments: {} }], raw: {}
      });
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, new ReActLoopStrategy(), customLLMComplete, defaultLLMStream, undefined, []);
      await loop.run('test', new MessageQueue(), new MessageQueue());
      const state = loop.getState();
      const toolTurn = state.history.find(t => t.role === 'tool');
      expect((toolTurn as any).toolCallId).toBe('callABC');
    });
  });

  describe('consecutive runs after reset', () => {
    it('allows multiple runs after reset', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      await loop.run('first', new MessageQueue(), new MessageQueue());
      expect(loop.getState().round).toBeGreaterThan(0);
      loop.reset();
      expect(loop.getState().round).toBe(0);
      await loop.run('second', new MessageQueue(), new MessageQueue());
      expect(loop.getState().round).toBeGreaterThan(0);
    });
  });

  describe('getState snapshot immutability', () => {
    it('returns a copy of state, not the internal reference', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy, defaultLLMComplete, defaultLLMStream, undefined, []);
      const state1 = loop.getState();
      (state1 as any).round = 999;
      const state2 = loop.getState();
      expect(state2.round).toBe(0);
    });
  });

  describe('follow-up messages', () => {
    it('processes follow-up after turn without tool calls', async () => {
      const followUpQueue = new MessageQueue();
      let callCount = 0;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'First',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          } as LLMResponse;
        } else {
          return {
            content: 'Final',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          } as LLMResponse;
        }
      };
      loop = new AgentLoop(createTestConfig({ maxRounds: 5 }), emitter, toolExecutor, contextBuilder, simpleStrategy, customLLMComplete, defaultLLMStream, undefined, []);
      // Enqueue follow-up turn
      followUpQueue.enqueue({
        role: 'user',
        content: [{ type: 'text', text: 'Follow-up message' }],
        timestamp: Date.now(),
      } as any);
      const result = await loop.run('initial prompt', new MessageQueue(), followUpQueue);
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Final');
      expect(callCount).toBe(2); // two LLM calls
    });

    it('processes follow-up after shouldContinue false with tool calls', async () => {
      const followUpQueue = new MessageQueue();
      followUpQueue.enqueue({
        role: 'user',
        content: [{ type: 'text', text: 'Follow-up after tools' }],
        timestamp: Date.now(),
      } as any);
      let callCount = 0;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'Calling tool',
            stopReason: 'toolUse',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: 't1', name: 'testTool', arguments: {} }],
          } as LLMResponse;
        } else {
          return {
            content: 'Final after follow-up',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          } as LLMResponse;
        }
      };
      // Register a simple tool
      toolExecutor.registerTool({
        name: 'testTool',
        description: 'test',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'ok'
      } as any);
      const falseStrategy: LoopStrategy = { shouldContinue: () => false, formatResults: () => '' } as any;
      loop = new AgentLoop(createTestConfig({ maxRounds: 5 }), emitter, toolExecutor, contextBuilder, falseStrategy, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('initial', new MessageQueue(), followUpQueue);
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Final after follow-up');
      expect(callCount).toBe(2);
    });

    it('uses getFollowUpMessages hook to get follow-up turns', async () => {
      let callCount = 0;
      let hookCallCount = 0;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        return {
          content: 'Response',
          stopReason: 'stop',
          usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
        } as LLMResponse;
      };
      const hook = vi.fn().mockImplementation(async () => {
        hookCallCount++;
        if (hookCallCount === 1) {
          return [{
            role: 'user',
            content: [{ type: 'text', text: 'From hook' }],
            timestamp: Date.now(),
          }] as any;
        }
        return [];
      });
      const configWithHook = createTestConfig({
        maxRounds: 5,
        getFollowUpMessages: hook,
      });
      loop = new AgentLoop(configWithHook, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('initial', new MessageQueue(), new MessageQueue());
      expect(hook).toHaveBeenCalled();
      expect(callCount).toBe(2); // initial + one follow-up round
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Response');
    });

  });

  describe('terminate flag', () => {
    it('stops early when all tools signal terminate', async () => {
      toolExecutor.registerTool({
        name: 'term',
        description: 'terminates',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'done',
      } as any);
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'use tool',
        stopReason: 'toolUse',
        usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [{ id: 't1', name: 'term', arguments: {} }],
      });
      toolExecutor.config.afterToolCall = async () => ({ terminate: true });
      const continueStrategy: LoopStrategy = {
        shouldContinue: (response) => !!(response.toolCalls && response.toolCalls.length > 0),
        formatResults: () => '',
        transformPrompt: (p) => p,
      };
      loop = new AgentLoop(createTestConfig({ maxRounds: 5 }), emitter, toolExecutor, contextBuilder, continueStrategy, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('');
      expect(result.totalRounds).toBe(1);
    });

    it('continues when not all tools terminate', async () => {
      toolExecutor.registerTool({
        name: 'term',
        description: 'terminates',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'done',
      } as any);
      toolExecutor.registerTool({
        name: 'cont',
        description: 'continues',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'ok',
      } as any);
      let callCount = 0;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'use both',
            stopReason: 'toolUse',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [
              { id: 'c1', name: 'term', arguments: {} },
              { id: 'c2', name: 'cont', arguments: {} },
            ],
          };
        }
        return {
          content: 'final answer',
          stopReason: 'stop',
          usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
        };
      };
      toolExecutor.config.afterToolCall = async (ctx: any) => {
        if (ctx.toolCall.name === 'term') {
          return { terminate: true };
        }
        return {};
      };
      const continueStrategy: LoopStrategy = {
        shouldContinue: (response) => !!(response.toolCalls && response.toolCalls.length > 0),
        formatResults: () => '',
        transformPrompt: (p) => p,
      };
      loop = new AgentLoop(createTestConfig({ maxRounds: 5 }), emitter, toolExecutor, contextBuilder, continueStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(callCount).toBe(2);
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('final answer');
    });

    it('processes follow-up after all tools signal terminate', async () => {
      // Register a tool that terminates
      toolExecutor.registerTool({
        name: 'term',
        description: 'terminates',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'done',
      } as any);
      toolExecutor.config.afterToolCall = async () => ({ terminate: true });

      const followUpQueue = new MessageQueue();
      followUpQueue.enqueue({
        role: 'user',
        content: [{ type: 'text', text: 'Follow-up after termination' }],
        timestamp: Date.now(),
      } as any);

      let callCount = 0;
      const customLLMComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: '',
            stopReason: 'toolUse',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: 't1', name: 'term', arguments: {} }],
          } as LLMResponse;
        } else {
          return {
            content: 'Final after termination and follow-up',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          } as LLMResponse;
        }
      };

      const falseStrategy: LoopStrategy = { shouldContinue: () => false, formatResults: () => '' } as any;
      loop = new AgentLoop(createTestConfig({ maxRounds: 5 }), emitter, toolExecutor, contextBuilder, falseStrategy, customLLMComplete, defaultLLMStream, undefined, []);
      const result = await loop.run('initial', new MessageQueue(), followUpQueue);
      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Final after termination and follow-up');
      expect(callCount).toBe(2);
    });

  });

  describe('prepareNextTurn hook', () => {
    it('modifies reasoningLevel for next round', async () => {
      let llmCallCount = 0;
      let reasoningOptions1: any = null;
      let reasoningOptions2: any = null;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        llmCallCount++;
        if (llmCallCount === 1) reasoningOptions1 = options;
        if (llmCallCount === 2) reasoningOptions2 = options;
        return {
          content: llmCallCount === 1 ? 'use tool' : 'final',
          stopReason: llmCallCount === 1 ? 'toolUse' : 'stop',
          usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: llmCallCount === 1 ? [{ id: 't1', name: 'testTool', arguments: {} }] : [],
        };
      };

      toolExecutor.registerTool({
        name: 'testTool',
        description: 'tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'ok',
      } as any);

      const config = createTestConfig({
        reasoningLevel: 'low',
        prepareNextTurn: async (ctx) => {
          if (ctx.round === 1) {
            return { reasoningLevel: 'high' };
          }
          return undefined;
        },
      });

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        new ReActLoopStrategy(),
        customLLM,
        defaultLLMStream,
        undefined,
        []
      );
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(true);
      expect(result.totalRounds).toBe(2);
      expect(reasoningOptions1?.reasoning).toBe('low');
      expect(reasoningOptions2?.reasoning).toBe('high');
    });

    it('does nothing when hook returns undefined', async () => {
      let llmCallCount = 0;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        llmCallCount++;
        return {
          content: 'response',
          stopReason: 'stop',
          usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
        };
      };

      const config = createTestConfig({
        reasoningLevel: 'medium',
        prepareNextTurn: async () => undefined,
      });

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(true);
      expect(result.totalRounds).toBe(1);
    });

    it('does not crash when hook throws error', async () => {
      const hook = vi.fn().mockImplementation(async () => { throw new Error('hook error'); });
      const config = createTestConfig({ prepareNextTurn: hook, debug: true });

      toolExecutor.registerTool({
        name: 'echo',
        description: 'tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'ok',
      } as any);

      let callCount = 0;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount <= 2) {
          return {
            content: `call ${callCount}`,
            stopReason: 'toolUse',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: `c${callCount}`, name: 'echo', arguments: {} }],
          };
        } else {
          return {
            content: 'final',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          };
        }
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, new ReActLoopStrategy(), customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(result.success).toBe(true);
      expect(hook).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('prepareNextTurn hook error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('not called before first round', async () => {
      const hook = vi.fn();
      const config = createTestConfig({ prepareNextTurn: hook });
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'hi',
        stopReason: 'stop',
        usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [],
      });
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      await loop.run('test', new MessageQueue(), new MessageQueue());
      expect(hook).not.toHaveBeenCalled();
    });

    it('receives correct context after tool call', async () => {
      const hookCalls: any[] = [];
      const config = createTestConfig({
        prepareNextTurn: async (ctx) => {
          hookCalls.push({
            round: ctx.round,
            assistant: ctx.lastAssistantMessage,
            toolResults: ctx.toolResults,
            newMessages: ctx.newMessages,
          });
        },
      });

      toolExecutor.registerTool({
        name: 'echo',
        description: 'test',
        parameters: { type: 'object', properties: {} },
        handler: async (args: any) => `echo: ${JSON.stringify(args)}`,
      } as any);

      let callCount = 0;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'use tool',
            stopReason: 'toolUse',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: 'call1', name: 'echo', arguments: { msg: 'hello' } }],
          };
        } else {
          return {
            content: 'final answer',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          };
        }
      };

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, new ReActLoopStrategy(), customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());

      expect(result.success).toBe(true);
      expect(hookCalls.length).toBeGreaterThanOrEqual(1);
      const call = hookCalls[0];
      expect(call.round).toBe(1);
      expect(call.assistant.role).toBe('assistant');
      expect(call.assistant.content[0].type).toBe('text');
      expect(call.assistant.content[0].text).toBe('use tool');
      expect(call.toolResults.length).toBeGreaterThanOrEqual(1);
      expect(call.toolResults[0].toolName).toBe('echo');
      expect(call.toolResults[0].result).toContain('echo: {\"msg\":\"hello\"}');
      expect(call.newMessages.length).toBeGreaterThanOrEqual(2);
      const roles = call.newMessages.map((m: any) => m.role);
      expect(roles).toContain('assistant');
      expect(roles).toContain('tool');
    });

    it('can modify reasoningLevel multiple times across rounds', async () => {
      const reasoningSeen: string[] = [];
      let currentReasoning: any = 'low';
      const config = createTestConfig({
        reasoningLevel: currentReasoning, maxRounds: 5,
        prepareNextTurn: async () => {
          const next = currentReasoning === 'low' ? 'medium' : currentReasoning === 'medium' ? 'high' : 'low';
          currentReasoning = next;
          return { reasoningLevel: next };
        },
      });

      toolExecutor.registerTool({
        name: 'echo',
        description: 'tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => 'ok',
      } as any);

      let callCount = 0;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        reasoningSeen.push(options?.reasoning);
        if (callCount <= 3) {
          return {
            content: `call ${callCount}`,
            stopReason: 'toolUse',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: `c${callCount}`, name: 'echo', arguments: {} }],
          };
        } else {
          return {
            content: 'final',
            stopReason: 'stop',
            usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          };
        }
      };

      const continueStrategy: LoopStrategy = {
        shouldContinue: (response) => !!(response.toolCalls && response.toolCalls.length > 0),
        formatResults: () => '',
      };

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, continueStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('test', new MessageQueue(), new MessageQueue());

      expect(result.success).toBe(true);
      expect(reasoningSeen).toEqual(['low', 'medium', 'high', 'low']);
    });

    it('called after turn without tool calls when follow-up provided', async () => {
      const hookCalls: number[] = [];
      const config = createTestConfig({
        maxRounds: 5,
        prepareNextTurn: async (ctx) => {
          hookCalls.push(ctx.round);
        },
      });

      let callCount = 0;
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        return {
          content: callCount === 1 ? 'first' : 'second',
          stopReason: 'stop',
          usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } },
          toolCalls: [],
        };
      };

      const followUpQueue = new MessageQueue();
      followUpQueue.enqueue({
        role: 'user',
        content: [{ type: 'text', text: 'follow-up' }],
        timestamp: Date.now(),
      } as any);

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('initial', new MessageQueue(), followUpQueue);

      expect(result.success).toBe(true);
      expect(hookCalls).toContain(1);
      expect(hookCalls.length).toBe(1);
    });

  });

  describe('getSteeringMessages hook', () => {
    it('injects steering turns from hook', async () => {
      const hook = vi.fn().mockResolvedValue([
        { role: 'user', content: [{ type: 'text', text: 'steering from hook' }], timestamp: Date.now() } as any,
      ]);
      const config = createTestConfig({ getSteeringMessages: hook });
      const steeringQueue = new MessageQueue(); // empty
      const followUpQueue = new MessageQueue();
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'final answer', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: []
      });
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('prompt', steeringQueue, followUpQueue);
      expect(result.success).toBe(true);
      const state = loop.getState();
      const steeringTurns = state.history.filter(t => t.role === 'user' && (t as any).content[0]?.text === 'steering from hook');
      expect(steeringTurns.length).toBe(1);
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('falls back to steeringQueue when hook not provided', async () => {
      const steeringQueue = new MessageQueue();
      steeringQueue.enqueue({ role: 'user', content: [{ type: 'text', text: 'queue steering' }], timestamp: Date.now() } as any);
      const followUpQueue = new MessageQueue();
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'ok', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: []
      });
      const config = createTestConfig(); // no getSteeringMessages
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('prompt', steeringQueue, followUpQueue);
      expect(result.success).toBe(true);
      const state = loop.getState();
      const queueTurns = state.history.filter(t => (t as any).content[0]?.text === 'queue steering');
      expect(queueTurns.length).toBe(1);
    });

    it('ignores steeringQueue when hook provided', async () => {
      const hook = vi.fn().mockResolvedValue([
        { role: 'user', content: [{ type: 'text', text: 'hook turn' }], timestamp: Date.now() } as any,
      ]);
      const config = createTestConfig({ getSteeringMessages: hook });
      const steeringQueue = new MessageQueue();
      steeringQueue.enqueue({ role: 'user', content: [{ type: 'text', text: 'queue turn' }], timestamp: Date.now() } as any);
      const followUpQueue = new MessageQueue();
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'final', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: []
      });
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('prompt', steeringQueue, followUpQueue);
      expect(result.success).toBe(true);
      const state = loop.getState();
      const hookTurn = state.history.find(t => (t as any).content[0]?.text === 'hook turn');
      const queueTurn = state.history.find(t => (t as any).content[0]?.text === 'queue turn');
      expect(hookTurn).toBeDefined();
      expect(queueTurn).toBeUndefined();
    });

    it('does not crash when hook throws error', async () => {
      const hook = vi.fn().mockImplementation(async () => { throw new Error('hook error'); });
      const config = createTestConfig({ getSteeringMessages: hook, debug: true });
      const steeringQueue = new MessageQueue();
      const followUpQueue = new MessageQueue();
      const customLLM = async (context: Context, options?: any): Promise<LLMResponse> => ({
        content: 'final', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2, cost: { input: 0, output: 0, total: 0 } }, toolCalls: []
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simpleStrategy, customLLM, defaultLLMStream, undefined, []);
      const result = await loop.run('prompt', steeringQueue, followUpQueue);
      expect(result.success).toBe(true);
      expect(hook).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('getSteeringMessages hook error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

  });

});

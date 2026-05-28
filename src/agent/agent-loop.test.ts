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
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      const state = loop.getState();
      expect(state.isRunning).toBe(false);
      expect(state.round).toBe(0);
      expect(state.totalToolCalls).toBe(0);
      expect(state.history).toEqual([]);
    });

    it('should set isRunning during execution', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      const runPromise = loop.run('test', new MessageQueue(), new MessageQueue(), mockLLMProvider);
      // State should be running
      expect(loop.getState().isRunning).toBe(true);
      await runPromise;
      expect(loop.getState().isRunning).toBe(false);
    });
  });

  describe('run', () => {
    it('should execute to completion and return result', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      const result = await loop.run('Hello', new MessageQueue(), new MessageQueue(), mockLLMProvider);

      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Mock response');
      expect(result.totalRounds).toBeGreaterThanOrEqual(1);
      expect(result.stopReason).toBe('stop');
    });

    it('should include history in state', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      const result = await loop.run('Test', new MessageQueue(), new MessageQueue(), mockLLMProvider);

      const finalState = loop.getState();
      expect(finalState.history.length).toBeGreaterThan(0);
    });

    it('should respect maxRounds', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      const result = await loop.run('Test', new MessageQueue(), new MessageQueue(), mockLLMProvider);

      expect(result.totalRounds).toBeLessThanOrEqual(config.maxRounds);
    });

    it('should abort when abort() is called', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      // Abort quickly
      setTimeout(() => loop.abort(), 10);

      const result = await loop.run('Hello', new MessageQueue(), new MessageQueue(), mockLLMProvider);

      // The flag should be set
      expect(loop.getState().isCancelled).toBe(true);
      // The run should complete (may be success or error depending on timing)
      // but it should not exceed maxRounds
      expect(result.totalRounds).toBeLessThanOrEqual(config.maxRounds);
    });
  });

  describe('stream', () => {
    it('should stream events and return final result', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);

      const mockStreamProvider = async function* (prompt: string, tools: any[], options?: any) {
        yield { type: 'text_delta', delta: 'Hello' };
        yield { type: 'text_delta', delta: ' World' };
        yield { type: 'done' };
      };

      const events: any[] = [];
      const result = await loop.stream('test', new MessageQueue(), new MessageQueue(), mockStreamProvider as any);

      // Should have completed and returned result
      expect(result).toBeDefined();
    });
  });

  describe('abort', () => {
    it('should set isCancelled flag', () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
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

      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      await loop.run('test', new MessageQueue(), new MessageQueue(), mockLLMProvider);

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

      // Use ReActLoopStrategy to continue after tool calls
      const reactStrategy = new ReActLoopStrategy();
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, reactStrategy);

      // Mock LLM: first call returns toolCall, second returns final answer
      let callCount = 0;
      const llmProvider = async (prompt: string, tools: any[], options?: any): Promise<LLMResponse> => {
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

      const result = await loop.run('test', new MessageQueue(), new MessageQueue(), llmProvider);

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

      // Use simple strategy to avoid multiple rounds
      const simple = new SimpleStrategy();
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, simple);

      const llmProvider = async (): Promise<LLMResponse> => ({
        content: '',
        stopReason: 'toolUse',
        usage: { input: 10, output: 0, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } },
        toolCalls: [{ name: 'bad', arguments: {} }],
        raw: {}
      });

      const result = await loop.run('test', new MessageQueue(), new MessageQueue(), llmProvider);

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
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);

      const llmProvider = async (): Promise<LLMResponse> => {
        throw new Error('Network failure');
      };

      const result = await loop.run('test', new MessageQueue(), new MessageQueue(), llmProvider);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
      expect(loop.getState().isRunning).toBe(false);
    });
  });

  describe('abort during long run', () => {
    it('cancels execution promptly', async () => {
      loop = new AgentLoop(config, emitter, toolExecutor, contextBuilder, strategy);
      let abortSignal: AbortSignal | undefined;

      // Provider that waits for abort
      const llmProvider = async (prompt: string, tools: any[], options?: any): Promise<LLMResponse> => {
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

      const runPromise = loop.run('test', new MessageQueue(), new MessageQueue(), llmProvider);

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
});

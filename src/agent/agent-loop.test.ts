// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for AgentLoop.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLoop } from './agent-loop.js';
import { ToolExecutor } from './tool-executor.js';
import { ContextBuilder } from './context-manager.js';
import { EventEmitter } from '../events/event-emitter.js';
import { LoopStrategy } from './loop-strategy.js';
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
});

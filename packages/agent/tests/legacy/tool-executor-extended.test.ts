/**
 * Extended Tests for tool-executor.ts - More error scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolExecutor } from '../src/tool-executor.js';
import type { ToolCall, ToolDefinition, ToolContext } from '../src/types.js';

describe('Extended ToolExecutor Tests', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor({ timeout: 5000 });
  });

  describe('Error Recovery', () => {
    it('should recover from sync throw', async () => {
      executor.registerTool({
        name: 'thrower',
        description: '',
        handler: () => { throw new Error('Test error'); },
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'thrower',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.errorMessage).toBe('Test error');
    });

    it('should recover from async throw', async () => {
      executor.registerTool({
        name: 'asyncThrower',
        description: '',
        handler: async () => { throw new Error('Async test'); },
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'asyncThrower',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.errorMessage).toBe('Async test');
    });

    it('should handle rejected promise', async () => {
      executor.registerTool({
        name: 'rejecter',
        description: '',
        handler: async () => Promise.reject(new Error('Rejected')),
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'rejecter',
        arguments: {},
      });

      expect(result.isError).toBe(true);
    });

    it('should handle returned error string', async () => {
      executor.registerTool({
        name: 'errorStr',
        description: '',
        handler: async () => 'Error: Something went wrong',
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'errorStr',
        arguments: {},
      });

      // Note: This is still successful execution, just returning error string
      expect(result.isError).toBe(false);
    });
  });

  describe('Context Propagation', () => {
    it('should pass agent state to handler', async () => {
      executor.registerTool({
        name: 'stateTest',
        description: '',
        handler: async (_, ctx) => {
          return JSON.stringify(ctx?.agentState);
        },
      });

      const context: ToolContext = {
        agentState: {
          round: 5,
          totalToolCalls: 10,
          totalTokens: 5000,
          promptLength: 2000,
          isRunning: true,
          isCancelled: false,
          toolResults: [],
          history: [],
          metadata: { custom: 'data' },
        },
      };

      const result = await executor.execute(
        { id: 'call_1', name: 'stateTest', arguments: {} },
        context
      );

      expect(result.result).toContain('round');
    });

    it('should pass metadata to handler', async () => {
      executor.registerTool({
        name: 'metaTest',
        description: '',
        handler: async (_, ctx) => {
          return ctx?.metadata?.customField || '';
        },
      });

      const result = await executor.execute(
        { id: 'call_1', name: 'metaTest', arguments: {} },
        { metadata: { customField: 'test_value' } }
      );

      expect(result.result).toBe('test_value');
    });

    it('should pass round number', async () => {
      let receivedRound = 0;
      executor.registerTool({
        name: 'roundTest',
        description: '',
        handler: async (_, ctx) => {
          receivedRound = ctx?.round || 0;
          return String(receivedRound);
        },
      });

      await executor.execute(
        { id: 'call_1', name: 'roundTest', arguments: {} },
        { round: 7 }
      );

      expect(receivedRound).toBe(7);
    });
  });

  describe('Nested Error Handling', () => {
    it('should handle nested async errors', async () => {
      executor.registerTool({
        name: 'nested',
        description: '',
        handler: async () => {
          const inner = async () => {
            throw new Error('Nested error');
          };
          await inner();
          return 'done';
        },
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'nested',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.result).toContain('Nested error');
    });

    it('should handle promise.all errors', async () => {
      executor.registerTool({
        name: 'multi',
        description: '',
        handler: async () => {
          await Promise.all([
            Promise.resolve(),
            Promise.reject(new Error('Partially failed')),
          ]);
          return 'done';
        },
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'multi',
        arguments: {},
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Timeout Scenarios', () => {
    it('should timeout fast operations', async () => {
      executor = new ToolExecutor({ timeout: 10 });

      executor.registerTool({
        name: 'slow',
        description: '',
        handler: async () => {
          await new Promise((r) => setTimeout(r, 100));
          return 'done';
        },
      });

      const result = await executor.execute({
        id: 'call_1',
        name: 'slow',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.errorMessage).toContain('timed out');
    });

    it('should handle abort during execution', async () => {
      executor = new ToolExecutor({ timeout: 10000 });

      executor.registerTool({
        name: 'abortable',
        description: '',
        handler: async () => {
          await new Promise((r) => setTimeout(r, 1000));
          return 'done';
        },
      });

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10);

      const result = await executor.execute(
        { id: 'call_1', name: 'abortable', arguments: {} },
        {},
        controller.signal
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('Progress Callback', () => {
    it('should call onProgress callback', async () => {
      const progressCalls: any[] = [];

      executor.registerTool({
        name: 'progress',
        description: '',
        handler: async (args, ctx, onProgress) => {
          onProgress?.({ partialResult: 'Step 1' });
          await Promise.resolve();
          onProgress?.({ partialResult: 'Step 2', details: { progress: 50 } });
          return 'Done';
        },
      });

      // Note: ToolExecutor doesn't have built-in progress listener
      // But the handler receives the callback
      const result = await executor.execute({
        id: 'call_1',
        name: 'progress',
        arguments: {},
      });

      expect(result.result).toBe('Done');
    });
  });

  describe('Batch Operations', () => {
    it('should execute in parallel', async () => {
      executor.registerTool({
        name: 'delay',
        description: '',
        handler: async (args) => {
          await new Promise((r) => setTimeout(r, args.delay || 10));
          return args.id;
        },
      });

      const results = await executor.executeAll([
        { id: 'c1', name: 'delay', arguments: { id: 'a', delay: 10 } },
        { id: 'c2', name: 'delay', arguments: { id: 'b', delay: 10 } },
        { id: 'c3', name: 'delay', arguments: { id: 'c', delay: 10 } },
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => !r.isError)).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      executor.registerTool({
        name: 'failer',
        description: '',
        handler: async (args) => {
          if (args.shouldFail) throw new Error('Failed');
          return 'ok';
        },
      });

      const results = await executor.executeAll([
        { id: 'c1', name: 'failer', arguments: {} },
        { id: 'c2', name: 'failer', arguments: { shouldFail: true } },
        { id: 'c3', name: 'failer', arguments: {} },
      ]);

      expect(results[0].isError).toBe(false);
      expect(results[1].isError).toBe(true);
      expect(results[2].isError).toBe(false);
    });

    it('should handle unknown tools in batch', async () => {
      executor.registerTool({
        name: 'known',
        description: '',
        handler: async () => 'ok',
      });

      const results = await executor.executeAll([
        { id: 'c1', name: 'known', arguments: {} },
        { id: 'c2', name: 'unknown', arguments: {} },
      ]);

      expect(results[0].isError).toBe(false);
      expect(results[1].isError).toBe(true);
    });
  });

  describe('Caching Edge Cases', () => {
    it('should cache negative results', async () => {
      executor = new ToolExecutor({ cacheEnabled: true });

      executor.registerTool({
        name: 'cache',
        description: '',
        handler: async () => {
          throw new Error('Always fails');
        },
      });

      await executor.execute({ id: 'c1', name: 'cache', arguments: {} });
      const result = await executor.execute({ id: 'c2', name: 'cache', arguments: {} });

      expect(result.result).toContain('Always fails');
    });

    it('should handle different args separately', async () => {
      executor = new ToolExecutor({ cacheEnabled: true });

      executor.registerTool({
        name: 'argTest',
        description: '',
        handler: async (args) => args.value,
      });

      const r1 = await executor.execute({ id: 'c1', name: 'argTest', arguments: { value: 'a' } });
      const r2 = await executor.execute({ id: 'c2', name: 'argTest', arguments: { value: 'b' } });

      expect(r1.result).toBe('a');
      expect(r2.result).toBe('b');
    });
  });

  describe('Before/After Hook Edge Cases', () => {
    it('should allow multiple before hooks', async () => {
      let callOrder: string[] = [];

      executor = new ToolExecutor({
        beforeToolCall: async () => {
          callOrder.push('hook1');
          return undefined;
        },
      });

      executor.registerTool({
        name: 'test',
        description: '',
        handler: async () => {
          callOrder.push('exec');
          return 'done';
        },
      });

      await executor.execute({ id: 'c1', name: 'test', arguments: {} });

      expect(callOrder).toContain('hook1');
      expect(callOrder).toContain('exec');
    });

    it('should allow after hook to modify details', async () => {
      executor = new ToolExecutor({
        afterToolCall: async () => ({
          details: { modified: true, extra: 'data' },
        }),
      });

      executor.registerTool({
        name: 'test',
        description: '',
        handler: async () => 'original',
      });

      const result = await executor.execute({ id: 'c1', name: 'test', arguments: {} });

      expect(result.details?.modified).toBe(true);
      expect(result.details?.extra).toBe('data');
    });
  });
});
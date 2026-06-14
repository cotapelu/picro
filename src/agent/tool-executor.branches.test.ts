// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for ToolExecutor.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToolExecutor } from './tool-executor.js';
import type { ToolDefinition, ToolContext } from './types.js';

function createExecutor(configOverrides: any = {}) {
  const executor = new ToolExecutor(configOverrides);
  return executor;
}

// Basic tool for tests
const makeTool = (name: string, handler: any): ToolDefinition => ({
  name,
  description: `Tool ${name}`,
  parameters: { type: 'object', properties: {} },
  handler,
});

describe('ToolExecutor branch coverage', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = createExecutor();
  });

  describe('beforeToolCall block', () => {
    it('skips tool handler and afterToolCall when beforeToolCall returns block: true', async () => {
      const handler = vi.fn().mockResolvedValue('handled');
      const afterHook = vi.fn();
      executor.config.beforeToolCall = async () => ({ block: true });
      executor.config.afterToolCall = afterHook;

      const tool = makeTool('blocked', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'blocked', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(handler).not.toHaveBeenCalled();
      expect(afterHook).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.error).toBe('Tool execution blocked by before hook'); // default message
    });

    it('continues normally when beforeToolCall returns no block', async () => {
      const handler = vi.fn().mockResolvedValue('ok');
      const afterHook = vi.fn();
      executor.config.beforeToolCall = async () => ({});
      executor.config.afterToolCall = afterHook;

      const tool = makeTool('normal', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'normal', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(handler).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('propagates error when beforeToolCall throws', async () => {
      const handler = vi.fn().mockResolvedValue('ok');
      executor.config.beforeToolCall = async () => { throw new Error('hook fail'); };

      const tool = makeTool('tool', handler);
      executor.register(tool);

      await expect(executor.execute(
        { id: '1', name: 'tool', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      )).rejects.toThrow('hook fail');

      expect(handler).not.toHaveBeenCalled(); // tool not executed
    });
  });

  describe('afterToolCall success override', () => {
    it('can modify result via after hook', async () => {
      const handler = vi.fn().mockResolvedValue('original');
      executor.config.afterToolCall = async () => ({ result: 'modified' });

      const tool = makeTool('mod', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'mod', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(result.content[0].text).toBe('modified');
    });

    it('can set isError: true via after hook', async () => {
      const handler = vi.fn().mockResolvedValue('ok');
      executor.config.afterToolCall = async () => ({ isError: true, errorMessage: 'marked error' });

      const tool = makeTool('err', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'err', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(result.isError).toBe(true);
      expect(result.error).toBe('marked error');
    });

    it('can attach details to metadata', async () => {
      const handler = vi.fn().mockResolvedValue('ok');
      executor.config.afterToolCall = async () => ({ details: { extra: 'info' } });

      const tool = makeTool('meta', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'meta', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(result.metadata?.extra).toBe('info');
    });

    it('can set terminate flag', async () => {
      const handler = vi.fn().mockResolvedValue('ok');
      executor.config.afterToolCall = async () => ({ terminate: true });

      const tool = makeTool('term', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'term', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect((result as any).terminate).toBe(true);
    });
  });

  describe('afterToolCall error path override', () => {
    it('can override error message', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('original error'));
      executor.config.afterToolCall = async () => ({ errorMessage: 'overridden error' });

      const tool = makeTool('err', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'err', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(result.isError).toBe(true);
      expect(result.error).toBe('overridden error');
    });
  });

  describe('timeout handling', () => {
    it('throws error when tool times out', async () => {
      const handler = vi.fn().mockImplementation(
        async () => new Promise(resolve => setTimeout(resolve, 10000))
      );
      executor = createExecutor({ timeout: 50 }); // 50ms timeout
      const tool = makeTool('slow', handler);
      executor.register(tool);

      const result = await executor.execute(
        { id: '1', name: 'slow', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(result.isError).toBe(true);
      expect(result.error).toMatch(/timeout/i);
    });
  });

  describe('caching', () => {
    it('caches results when cacheEnabled', async () => {
      executor = createExecutor({ cacheEnabled: true, cacheSize: 10 });
      const handler = vi.fn().mockResolvedValue('cached value');
      const tool = makeTool('cached', handler);
      executor.register(tool);

      const call1 = await executor.execute(
        { id: '1', name: 'cached', arguments: { a: 1 } },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );
      const call2 = await executor.execute(
        { id: '2', name: 'cached', arguments: { a: 1 } },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(call2.content[0].text).toBe('cached value');
    });

    it('does not cache when cacheDisabled', async () => {
      executor = createExecutor({ cacheEnabled: false });
      const handler = vi.fn().mockResolvedValue('value');
      const tool = makeTool('nocache', handler);
      executor.register(tool);

      await executor.execute({ id: '1', name: 'nocache', arguments: {} }, {} as ToolContext, undefined);
      await executor.execute({ id: '2', name: 'nocache', arguments: {} }, {} as ToolContext, undefined);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('evicts oldest when cache size exceeded', async () => {
      executor = createExecutor({ cacheEnabled: true, cacheSize: 2 });
      const handler = vi.fn().mockImplementation(async (args: any) => `value-${args.a}`);
      const tool = makeTool('evict', handler);
      executor.register(tool);

      await executor.execute({ id: '1', name: 'evict', arguments: { a: 1 } }, {} as ToolContext, undefined);
      await executor.execute({ id: '2', name: 'evict', arguments: { a: 2 } }, {} as ToolContext, undefined);
      await executor.execute({ id: '3', name: 'evict', arguments: { a: 3 } }, {} as ToolContext, undefined); // third call adds new key, evicts oldest (key 1)
      await executor.execute({ id: '4', name: 'evict', arguments: { a: 1 } }, {} as ToolContext, undefined); // should miss because key1 evicted, re-execute

      expect(handler).toHaveBeenCalledTimes(4); // fourth call causes extra execution
    });
  });

  describe('executeAll', () => {
    it('executes in parallel by default', async () => {
      const order: string[] = [];
      const tool1 = makeTool('t1', async () => { order.push('t1'); return '1'; });
      const tool2 = makeTool('t2', async () => { order.push('t2'); return '2'; });
      executor.register(tool1);
      executor.register(tool2);

      const results = await executor.executeAll(
        [{ id: '1', name: 't1', arguments: {} }, { id: '2', name: 't2', arguments: {} }],
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      // Parallel: order may vary, but both complete
      expect(results).toHaveLength(2);
      expect(order).toContain('t1');
      expect(order).toContain('t2');
    });

    it('executes sequentially when strategy is sequential', async () => {
      executor = createExecutor({ toolExecutionStrategy: 'sequential' });
      const order: string[] = [];
      const tool1 = makeTool('t1', async () => { order.push('t1'); return '1'; });
      const tool2 = makeTool('t2', async () => { order.push('t2'); return '2'; });
      executor.register(tool1);
      executor.register(tool2);

      await executor.executeAll(
        [{ id: '1', name: 't1', arguments: {} }, { id: '2', name: 't2', arguments: {} }],
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(order).toEqual(['t1', 't2']);
    });

    it('executes sequentially when any tool has executionMode sequential', async () => {
      executor = createExecutor({ toolExecutionStrategy: 'parallel' });
      const order: string[] = [];
      const tool1 = makeTool('t1', async () => { order.push('t1'); return '1'; });
      const tool2 = makeTool('t2', async () => { order.push('t2'); return '2'; });
      // Override executionMode for t2
      tool1.executionMode = 'parallel';
      tool2.executionMode = 'sequential';
      executor.register(tool1);
      executor.register(tool2);

      await executor.executeAll(
        [{ id: '1', name: 't1', arguments: {} }, { id: '2', name: 't2', arguments: {} }],
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      expect(order).toEqual(['t1', 't2']);
    });

    it('aborts execution on signal', async () => {
      const controller = new AbortController();
      const tool = makeTool('abort', async () => {
        await new Promise(r => setTimeout(r, 1000));
        return 'done';
      });
      executor.register(tool);

      // Start execution in background
      const execPromise = executor.executeAll(
        [{ id: '1', name: 'abort', arguments: {} }],
        { round: 1, runtimeState: {}, signal: controller.signal } as ToolContext,
        controller.signal
      );

      // Abort after brief delay
      setTimeout(() => controller.abort(), 50);
      const result = await execPromise;

      // Should complete with abort error
      expect(result[0].isError).toBe(true);
      expect(result[0].error).toMatch(/abort/i);
    });
  });

  describe('signal handling', () => {
    it('propagates abort to tool handler', async () => {
      const controller = new AbortController();
      const tool = makeTool('sig', async (args: any, ctx: any, onProgress?: any) => {
        // Check signal from context
        expect(ctx.signal).toBe(controller.signal);
        await new Promise((resolve, reject) => {
          ctx.signal?.addEventListener('abort', reject, { once: true });
          setTimeout(resolve, 1000);
        });
        return 'done';
      });
      executor.register(tool);

      const execPromise = executor.execute(
        { id: '1', name: 'sig', arguments: {} },
        { round: 1, runtimeState: {}, signal: controller.signal } as ToolContext,
        controller.signal
      );

      setTimeout(() => controller.abort(), 50);
      const result = await execPromise;
      expect(result.isError).toBe(true);
    });
  });

  describe('progress updates', () => {
    it('emits progress events when emitProgressUpdates true', async () => {
      const emitter = { emit: vi.fn() };
      executor = createExecutor({ emitProgressUpdates: true, emitter } as any);
      const tool = makeTool('progress', async (args: any, ctx: any, onProgress: any) => {
        onProgress({ type: 'test' });
        return 'done';
      });
      executor.register(tool);

      await executor.execute(
        { id: '1', name: 'progress', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      // Expect start, progress, and end events at minimum
      const types = emitter.emit.mock.calls.map(c => c[0].type);
      expect(types).toContain('tool:call:start');
      expect(types).toContain('tool:progress');
      expect(types).toContain('tool:call:end');
    });

    it('does not emit progress event when emitProgressUpdates false', async () => {
      const emitter = { emit: vi.fn() };
      executor = createExecutor({ emitProgressUpdates: false, emitter } as any);
      const tool = makeTool('noprogress', async (args: any, ctx: any, onProgress: any) => {
        onProgress({ type: 'test' });
        return 'done';
      });
      executor.register(tool);

      await executor.execute(
        { id: '1', name: 'noprogress', arguments: {} },
        { round: 1, runtimeState: {}, signal: undefined } as ToolContext,
        undefined
      );

      // Expect only start and end, no progress
      const types = emitter.emit.mock.calls.map(c => c[0].type);
      expect(types).toContain('tool:call:start');
      expect(types).not.toContain('tool:progress');
      expect(types).toContain('tool:call:end');
    });
  });
});

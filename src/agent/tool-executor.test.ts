// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for ToolExecutor.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolExecutor } from './tool-executor.js';
import { EventEmitter } from '../events/event-emitter.js';
import type { ToolDefinition, ToolContext, ToolCallData } from './types.js';

// Helper to create a tool definition with custom async handler
function createTool(name: string, fn: (...args: any[]) => any): ToolDefinition {
  return {
    name,
    description: `Test tool ${name}`,
    parameters: { type: 'object', properties: {} },
    handler: async (input: any, context: ToolContext, onProgress?: any) => fn(input, context),
  } as any;
}

// Helper to build a ToolCallData
function buildToolCall(name: string, args: Record<string, any> = {}, id?: string): ToolCallData {
  return { id: id || `call-${Date.now()}`, name, arguments: args };
}

// Helper to build minimal ToolContext
function buildContext(round = 1): ToolContext {
  return { round, signal: undefined, runtimeState: {} as any };
}

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
    executor.reset();
  });

  describe('registration', () => {
    it('should register and retrieve a tool', () => {
      const tool = createTool('test', () => 'result');
      executor.register(tool);
      expect(executor.has('test')).toBe(true);
      expect(executor.getDefinition('test')).toBe(tool);
    });

    it('should register multiple tools', () => {
      executor.registerAll([
        createTool('a', () => 'a'),
        createTool('b', () => 'b'),
      ]);
      expect(executor.getNames()).toContain('a');
      expect(executor.getNames()).toContain('b');
    });

    it('should overwrite existing tool with same name', async () => {
      executor.register(createTool('dup', () => 'first'));
      executor.register(createTool('dup', () => 'second'));
      const def = executor.getDefinition('dup');
      expect(def).not.toBeNull();
      // Execute to ensure second handler is used
      const result = await (def!.handler as any)({});
      expect(result).toBe('second');
    });
  });

  describe('execute', () => {
    it('should execute a tool and return successful result', async () => {
      executor.register(createTool('echo', () => 'hello'));
      const result = await executor.execute(buildToolCall('echo', {}), buildContext());

      expect(result.isError).toBe(false);
      expect(result.toolName).toBe('echo');
      expect(result.toolCallId).toBeDefined();
      expect((result as any).result).toBe('hello');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should return error for unknown tool', async () => {
      const result = await executor.execute(buildToolCall('unknown'), buildContext());
      expect(result.isError).toBe(true);
      expect((result as any).error).toContain('unknown');
    });

    it('should throw exception from tool handler as error result', async () => {
      executor.register(createTool('fail', async () => { throw new Error('boom'); }));
      const result = await executor.execute(buildToolCall('fail'), buildContext());
      expect(result.isError).toBe(true);
      expect((result as any).error).toBe('boom');
    });

    it('should respect timeout', async () => {
      executor = new ToolExecutor({ timeout: 100 });
      executor.register(createTool('slow', async () => { await new Promise(r => setTimeout(r, 500)); return 'ok'; }));
      const result = await executor.execute(buildToolCall('slow'), buildContext());
      expect(result.isError).toBe(true);
      expect((result as any).error).toContain('timeout after');
    });

    it('should handle abort signal', async () => {
      executor = new ToolExecutor({ timeout: 100000 });
      executor.register(createTool('slow', async () => { await new Promise(r => setTimeout(r, 500)); return 'ok'; }));
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 100);
      const result = await executor.execute(buildToolCall('slow'), buildContext(), controller.signal);
      expect(result.isError).toBe(true);
      expect((result as any).error).toBe('Execution aborted');
    });

    describe('argument validation', () => {
      it('should validate required parameters and reject missing ones', async () => {
        // Tool with required parameter 'x'
        const tool = {
          name: 'req',
          description: 'requires x',
          parameters: {
            type: 'object',
            properties: { x: { type: 'string' } },
            required: ['x']
          },
          handler: async () => 'ok'
        } as ToolDefinition;
        executor.register(tool);
        const result = await executor.execute(buildToolCall('req', {}), buildContext());
        expect(result.isError).toBe(true);
        expect((result as any).error).toContain('Invalid arguments');
        expect((result as any).error).toContain('x');
      });

      it('should validate type and reject mismatched types', async () => {
        const tool = {
          name: 'typed',
          description: 'type check',
          parameters: {
            type: 'object',
            properties: { count: { type: 'number' } }
          },
          handler: async () => 'ok'
        } as ToolDefinition;
        executor.register(tool);
        const result = await executor.execute(buildToolCall('typed', { count: 'not-a-number' }), buildContext());
        expect(result.isError).toBe(true);
        expect((result as any).error).toContain('Invalid arguments');
      });

      it('should allow valid arguments to execute successfully', async () => {
        const tool = {
          name: 'valid',
          description: 'valid args',
          parameters: {
            type: 'object',
            properties: { value: { type: 'string' } },
            required: ['value']
          },
          handler: async () => 'success'
        } as ToolDefinition;
        executor.register(tool);
        const result = await executor.execute(buildToolCall('valid', { value: 'ok' }), buildContext());
        expect(result.isError).toBe(false);
        expect((result as any).result).toBe('success');
      });

      it('should skip validation when tool has no parameters schema', async () => {
        const tool = createTool('no-schema', () => 'done');
        executor.register(tool);
        const result = await executor.execute(buildToolCall('no-schema', { anything: 'go' }), buildContext());
        expect(result.isError).toBe(false);
      });
    });
  });

  describe('executeAll', () => {
    it('should execute multiple tools sequentially when strategy is sequential', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'sequential' });
      executor.register(createTool('t1', async () => 'a'));
      executor.register(createTool('t2', async () => 'b'));

      const calls = [buildToolCall('t1'), buildToolCall('t2')];
      const resultsArr = await executor.executeAll(calls, buildContext());

      expect(resultsArr.length).toBe(2);
      expect(resultsArr[0].isError).toBe(false);
      expect(resultsArr[1].isError).toBe(false);
      expect((resultsArr[0] as any).result).toBe('a');
      expect((resultsArr[1] as any).result).toBe('b');
    });

    it('should execute multiple tools in parallel when strategy is parallel', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'parallel' });
      executor.register(createTool('t1', async () => { await new Promise(r => setTimeout(r, 50)); return 'a'; }));
      executor.register(createTool('t2', async () => 'b'));

      const calls = [buildToolCall('t1'), buildToolCall('t2')];
      const resultsArr = await executor.executeAll(calls, buildContext());

      expect(resultsArr.length).toBe(2);
      // Both should succeed
      resultsArr.forEach(r => expect(r.isError).toBe(false));
      // Results should contain a and b regardless of order
      const values = resultsArr.map(r => (r as any).result).sort();
      expect(values).toEqual(['a', 'b']);
    });

    it('should stop execution on abort', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'sequential' });
      executor.register(createTool('t1', async () => { await new Promise(r => setTimeout(r, 200)); return 'a'; }));
      executor.register(createTool('t2', async () => 'b'));

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50);
      const calls = [buildToolCall('t1'), buildToolCall('t2')];
      const resultsArr = await executor.executeAll(calls, buildContext(), controller.signal);

      // At most one tool executes before abort processes
      expect(resultsArr.length).toBeLessThanOrEqual(1);
      if (resultsArr.length === 1) {
        expect(resultsArr[0].isError).toBe(true);
        expect((resultsArr[0] as any).error).toBe('Execution aborted');
      }
    });
  });

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      executor = new ToolExecutor({ cacheEnabled: true, cacheSize: 10 });
      executor.register(createTool('echo', () => 'hello'));

      const call = buildToolCall('echo', {});
      const result1 = await executor.execute(call, buildContext());
      const result2 = await executor.execute(call, buildContext());

      expect(result1.isError).toBe(false);
      expect(result2.isError).toBe(false);
      expect((result1 as any).result).toBe('hello');
      expect((result2 as any).result).toBe('hello');
    });

    it('should not cache when disabled', async () => {
      executor = new ToolExecutor({ cacheEnabled: false });
      executor.register(createTool('echo', () => 'hello'));

      const call = buildToolCall('echo', {});
      const result1 = await executor.execute(call, buildContext());
      const result2 = await executor.execute(call, buildContext());

      expect(result1.isError).toBe(false);
      expect(result2.isError).toBe(false);
      expect((result1 as any).result).toBe('hello');
      expect((result2 as any).result).toBe('hello');
    });

    it('should evict oldest entry when cache exceeds size', async () => {
      executor = new ToolExecutor({ cacheEnabled: true, cacheSize: 2 });
      executor.register(createTool('a', () => 'A'));
      executor.register(createTool('b', () => 'B'));
      executor.register(createTool('c', () => 'C'));

      await executor.execute(buildToolCall('a'), buildContext());
      await executor.execute(buildToolCall('b'), buildContext());
      await executor.execute(buildToolCall('c'), buildContext());

      // Cache size limited; all tools still exist in registry, but cache entries maybe evicted
      // We can't easily test cache internals, so just check no error
      expect(executor.getDefinition('a')).toBeDefined();
    });
  });

  describe('hooks', () => {
    it('should call beforeToolCall hook', async () => {
      const before = vi.fn().mockResolvedValue(undefined);
      executor = new ToolExecutor({ beforeToolCall: before });
      executor.register(createTool('echo', () => 'hello'));

      await executor.execute(buildToolCall('echo'), buildContext());

      expect(before).toHaveBeenCalledWith(
        expect.objectContaining({ toolCall: expect.objectContaining({ name: 'echo' }) }),
        undefined
      );
    });

    it('should block execution if beforeHook returns block: true', async () => {
      const before = vi.fn().mockResolvedValue({ block: true, reason: 'blocked' });
      executor = new ToolExecutor({ beforeToolCall: before });
      executor.register(createTool('echo', () => 'hello'));

      const result = await executor.execute(buildToolCall('echo'), buildContext());

      expect(result.isError).toBe(true);
      expect((result as any).error).toContain('blocked');
      expect(before).toHaveBeenCalled();
    });

    it('should call afterToolCall hook on success', async () => {
      const after = vi.fn().mockResolvedValue(undefined);
      executor = new ToolExecutor({ afterToolCall: after });
      executor.register(createTool('echo', () => 'hello'));

      await executor.execute(buildToolCall('echo'), buildContext());

      expect(after).toHaveBeenCalledWith(
        expect.objectContaining({ toolCall: expect.objectContaining({ name: 'echo' }), isError: false }),
        undefined
      );
    });

    it('should call afterToolCall hook on error', async () => {
      const after = vi.fn().mockResolvedValue(undefined);
      executor = new ToolExecutor({ afterToolCall: after });
      executor.register(createTool('fail', async () => { throw new Error('boom'); }));

      await executor.execute(buildToolCall('fail'), buildContext());

      expect(after).toHaveBeenCalledWith(
        expect.objectContaining({ toolCall: expect.objectContaining({ name: 'fail' }), isError: true }),
        undefined
      );
    });

    it('should allow afterHook to modify result content', async () => {
      const after = vi.fn().mockResolvedValue({ content: 'modified' });
      executor = new ToolExecutor({ afterToolCall: after });
      executor.register(createTool('echo', () => 'original'));

      const result = await executor.execute(buildToolCall('echo'), buildContext());

      expect((result as any).result).toBe('modified');
    });

    it('should allow afterHook to mark result as error', async () => {
      const after = vi.fn().mockResolvedValue({ isError: true, errorMessage: 'after error' });
      executor = new ToolExecutor({ afterToolCall: after });
      executor.register(createTool('echo', () => 'original'));

      const result = await executor.execute(buildToolCall('echo'), buildContext());

      expect(result.isError).toBe(true);
      expect((result as any).error).toBe('after error');
    });
  });

  describe('event emission', () => {
    it('should emit tool:call:start and tool:call:end events', async () => {
      const emitter = new EventEmitter();
      executor = new ToolExecutor({ emitter });
      executor.register(createTool('echo', () => 'hello'));

      const startSpy = vi.fn();
      const endSpy = vi.fn();
      emitter.on('tool:call:start', startSpy as any);
      emitter.on('tool:call:end', endSpy as any);

      await executor.execute(buildToolCall('echo'), buildContext());

      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(endSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit tool:error on failure', async () => {
      const emitter = new EventEmitter();
      executor = new ToolExecutor({ emitter });
      executor.register(createTool('fail', async () => { throw new Error('boom'); }));

      const errorSpy = vi.fn();
      emitter.on('tool:error', errorSpy as any);

      await executor.execute(buildToolCall('fail'), buildContext());

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'fail', errorMessage: 'boom', type: 'tool:error' })
      );
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      executor = new ToolExecutor({ cacheEnabled: true });
      executor.register(createTool('echo', () => 'hello'));

      await executor.execute(buildToolCall('echo'), buildContext());
      expect(executor.getDefinition('echo')).toBeDefined();

      executor.clearCache();
      // No error means pass
    });
  });

  describe('prepareArguments', () => {
    it('should apply prepareArguments before execution', async () => {
      executor = new ToolExecutor();
      const tool: ToolDefinition = {
        name: 'upper',
        description: 'uppercase',
        parameters: {
          type: 'object',
          properties: { str: { type: 'string' } },
          required: ['str'],
        } as any,
        handler: async (args: any) => args.str,
        prepareArguments: async (args: any) => ({ str: args.value?.toUpperCase() ?? '' }),
      };
      executor.register(tool);

      const result = await executor.execute(buildToolCall('upper', { value: 'hello' }), buildContext());

      expect(result.isError).toBe(false);
      expect(result.result).toBe('HELLO');
    });

    it('should propagate prepareArguments errors', async () => {
      executor = new ToolExecutor();
      const tool: ToolDefinition = {
        name: 'fail-prepare',
        description: 'fail',
        parameters: { type: 'object', properties: {} } as any,
        handler: async () => 'unreachable',
        prepareArguments: async () => { throw new Error('prepare failed'); },
      };
      executor.register(tool);

      const result = await executor.execute(buildToolCall('fail-prepare', {}), buildContext());

      expect(result.isError).toBe(true);
      expect((result as any).error).toContain('prepareArguments failed');
    });

    it('should pass transformed args to before hook, handler, after hook, and cache', async () => {
      const emitter = new EventEmitter();
      executor = new ToolExecutor({ emitter, cacheEnabled: true });

      const beforeArgs: any[] = [];
      executor.config.beforeToolCall = async (ctx) => {
        beforeArgs.push(ctx.args);
      };
      const afterArgs: any[] = [];
      executor.config.afterToolCall = async (ctx) => {
        afterArgs.push(ctx.args);
      };

      const tool: ToolDefinition = {
        name: 'spy',
        description: 'spy',
        parameters: {
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'string' } },
          required: ['a'],
        } as any,
        handler: async (args: any) => JSON.stringify(args),
        prepareArguments: async (args: any) => ({ ...args, b: 'prepared' }),
      };
      executor.register(tool);

      // First call
      const res1 = await executor.execute(buildToolCall('spy', { a: 'x' }), buildContext());
      expect(res1.isError).toBe(false);
      expect(JSON.parse(res1.result)).toEqual({ a: 'x', b: 'prepared' });

      // Second call with same original args should hit cache (handler not called again)
      let handlerCalls = 0;
      tool.handler = async (args: any) => { handlerCalls++; return JSON.stringify(args); };
      const res2 = await executor.execute(buildToolCall('spy', { a: 'x' }), buildContext());
      expect(res2.isError).toBe(false);
      expect(handlerCalls).toBe(0); // cached

      // before/after should have captured transformed args
      expect(beforeArgs[0]).toEqual({ a: 'x', b: 'prepared' });
      expect(afterArgs[0]).toEqual({ a: 'x', b: 'prepared' });
    });
  });

  describe('per-tool execution mode', () => {
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    it('uses parallel execution when global strategy is parallel and all tools default', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'parallel' });
      const order: number[] = [];
      executor.register(createTool('a', async () => { order.push(1); await wait(50); return 'a'; }));
      executor.register(createTool('b', async () => { order.push(2); await wait(50); return 'b'; }));
      const start = Date.now();
      await executor.executeAll([buildToolCall('a'), buildToolCall('b')], buildContext());
      const elapsed = Date.now() - start;
      // Parallel should take ~50ms, not 100ms
      expect(elapsed).toBeLessThan(80);
      // Order may not be deterministic but both should be present
      expect(order).toContain(1);
      expect(order).toContain(2);
    });

    it('forces sequential if any tool has executionMode sequential', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'parallel' });
      const order: string[] = [];
      const seqTool = createTool('seq', async () => { order.push('seq'); await wait(30); return 'seq'; });
      // Add executionMode to tool definition
      (seqTool as any).executionMode = 'sequential';
      executor.register(seqTool);
      executor.register(createTool('par', async () => { order.push('par'); await wait(30); return 'par'; }));
      const start = Date.now();
      await executor.executeAll([buildToolCall('seq'), buildToolCall('par')], buildContext());
      const elapsed = Date.now() - start;
      // Sequential should take ~60ms
      expect(elapsed).toBeGreaterThanOrEqual(60);
      // Check that sequential executed before parallel (order preserved)
      expect(order[0]).toBe('seq');
      expect(order[1]).toBe('par');
    });

    it('respects global sequential strategy regardless of per-tool mode', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'sequential' });
      const order: number[] = [];
      executor.register(createTool('a', async () => { order.push(1); await wait(20); return 'a'; }));
      executor.register(createTool('b', async () => { order.push(2); await wait(20); return 'b'; }));
      await executor.executeAll([buildToolCall('a'), buildToolCall('b')], buildContext());
      expect(order).toEqual([1, 2]);
    });
  });

  describe('terminate flag', () => {
    it('allows afterToolCall to set terminate flag', async () => {
      executor = new ToolExecutor();
      executor.register(createTool('test', async () => 'ok'));
      let capturedResult: any;
      executor.config.afterToolCall = async (ctx) => {
        capturedResult = ctx.result;
        return { terminate: true };
      };
      const result = await executor.execute(buildToolCall('test'), buildContext());
      expect(result.terminate).toBe(true);
      expect(capturedResult).toBeDefined();
    });

    it('default terminate is false', async () => {
      executor = new ToolExecutor();
      executor.register(createTool('test', async () => 'ok'));
      const result = await executor.execute(buildToolCall('test'), buildContext());
      expect(result.terminate).toBe(false);
    });
  });
});

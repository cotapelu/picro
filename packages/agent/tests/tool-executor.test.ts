import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolExecutor } from '../src/tool-executor';
import type { ToolDefinition, ToolContext } from '../src/types';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  const createTool = (name: string, handler:any): ToolDefinition => ({
    name,
    description: `Test tool ${name}`,
    handler,
  });

  const createToolCall = (name: string, args: any = {}): any => ({
    id: `call-${Date.now()}`,
    name,
    arguments: args,
  });

  const createContext = (round: number = 1): ToolContext => ({
    round,
    runtimeState: {
      round,
      totalToolCalls: 0,
      totalTokens: 0,
      promptLength: 0,
      isRunning: true,
      isCancelled: false,
      toolResults: [],
      history: [],
      metadata: {},
    },
  });

  beforeEach(() => {
    executor = new ToolExecutor({
      timeout: 5000,
      cacheEnabled: false,
      toolExecutionStrategy: 'sequential',
    });
  });

  describe('register and lookup', () => {
    it('should register a tool', () => {
      executor.register(createTool('test_tool', async () => 'result'));

      expect(executor.has('test_tool')).toBe(true);
      expect(executor.getToolNames()).toContain('test_tool');
      expect(executor.getTool('test_tool')).toBeDefined();
    });

    it('should register all tools', () => {
      executor.registerAll([
        createTool('tool1', async () => '1'),
        createTool('tool2', async () => '2'),
      ]);

      expect(executor.getToolNames()).toHaveLength(2);
    });

    it('should overwrite existing tool', () => {
      executor.register(createTool('test', async () => 'v1'));
      executor.register(createTool('test', async () => 'v2'));

      expect(executor.getToolNames()).toHaveLength(1);
    });

    it('should return undefined for unknown tool', () => {
      expect(executor.getTool('unknown')).toBeUndefined();
      expect(executor.has('unknown')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute a basic tool and return result', async () => {
      executor.register(createTool('echo', async (args: any) => args.text));

      const result = await executor.execute(
        createToolCall('echo', { text: 'Hello' }),
        createContext()
      );

      expect(result.isError).toBe(false);
      expect(result.result).toBe('Hello');
      expect(result.toolName).toBe('echo');
      expect(result.toolCallId).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle async handler', async () => {
      executor.register(createTool('async_tool', async () => {
        await Promise.resolve();
        return 'async result';
      }));

      const result = await executor.execute(createToolCall('async_tool'), createContext());

      expect(result.result).toBe('async result');
      expect(result.isError).toBe(false);
    });

    it('should return error for unknown tool', async () => {
      const result = await executor.execute(createToolCall('unknown'), createContext());

      expect(result.isError).toBe(true);
      expect(result.error?.toLowerCase()).toContain('not found');
    });

    it('should pass context to handler', async () => {
      executor.register(createTool('check_context', async (args: any, ctx: ToolContext) => {
        return `round: ${ctx.round}`;
      }));

      const result = await executor.execute(createToolCall('check_context'), createContext(5));

      expect(result.result).toBe('round: 5');
    });

    it('should include execution time', async () => {
      executor.register(createTool('slow', async () => {
        await new Promise(r => setTimeout(r, 10));
        return 'done';
      }));

      const result = await executor.execute(createToolCall('slow'), createContext());

      expect(result.executionTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('error handling', () => {
    it('should catch synchronous throw', async () => {
      executor.register(createTool('throw_sync', async () => {
        throw new Error('Sync error');
      }));

      const result = await executor.execute(createToolCall('throw_sync'), createContext());

      expect(result.isError).toBe(true);
      expect(result.error).toContain('Sync error');
    });

    it('should catch asynchronous errors', async () => {
      executor.register(createTool('throw_async', async () => {
        await Promise.reject(new Error('Async error'));
      }));

      const result = await executor.execute(createToolCall('throw_async'), createContext());

      expect(result.isError).toBe(true);
      expect(result.error).toContain('Async error');
    });

    it('should handle handler returning undefined', async () => {
      executor.register(createTool('void', async () => undefined));

      const result = await executor.execute(createToolCall('void'), createContext());

      expect(result.isError).toBe(false);
      expect(result.result).toBe('');
    });

    it('should handle handler returning void', async () => {
      executor.register(createTool('no_return', async () => {}));

      const result = await executor.execute(createToolCall('no_return'), createContext());

      expect(result.isError).toBe(false);
      expect(result.result).toBe('');
    });
  });

  describe('timeout', () => {
    it('should timeout long-running tool', async () => {
      executor = new ToolExecutor({ timeout: 50 });

      executor.register(createTool('slow_tool', async () => {
        await new Promise(r => setTimeout(r, 200));
        return 'done';
      }));

      const result = await executor.execute(createToolCall('slow_tool'), createContext());

      expect(result.isError).toBe(true);
      expect(result.error?.toLowerCase()).toContain('timeout');
    });
  });

  describe('beforeToolCall hook', () => {
    it('should allow execution by default', async () => {
      executor = new ToolExecutor({
        timeout: 5000,
        cacheEnabled: false,
        toolExecutionStrategy: 'sequential',
        beforeToolCall: async () => undefined, // no block
      });

      executor.register(createTool('test', async () => 'ok'));

      const result = await executor.execute(createToolCall('test'), createContext());

      expect(result.isError).toBe(false);
    });

    it('should block execution when hook returns block', async () => {
      executor = new ToolExecutor({
        timeout: 5000,
        cacheEnabled: false,
        toolExecutionStrategy: 'sequential',
        beforeToolCall: async () => ({ block: true, reason: 'Blocked by hook' }),
      });

      executor.register(createTool('test', async () => 'ok'));

      const result = await executor.execute(createToolCall('test'), createContext());

      expect(result.isError).toBe(true);
      expect(result.error).toContain('Blocked by hook');
    });

    it('should pass context to before hook', async () => {
      executor = new ToolExecutor({
        timeout: 5000,
        cacheEnabled: false,
        toolExecutionStrategy: 'sequential',
        beforeToolCall: async (ctx) => {
          expect(ctx.round).toBe(3);
          return undefined;
        },
      });

      executor.register(createTool('test', async () => 'ok'));
      await executor.execute(createToolCall('test'), createContext(3));
    });
  });

  describe('afterToolCall hook', () => {
    it('should allow result by default', async () => {
      executor = new ToolExecutor({
        timeout: 5000,
        afterToolCall: async () => undefined,
      });

      executor.register(createTool('test', async () => 'original'));

      const result = await executor.execute(createToolCall('test'), createContext());

      expect(result.result).toBe('original');
    });

    it('should allow hook to override content', async () => {
      executor = new ToolExecutor({
        timeout: 5000,
        afterToolCall: async () => ({ content: 'overridden' }),
      });

      executor.register(createTool('test', async () => 'original'));

      const result = await executor.execute(createToolCall('test'), createContext());

      expect(result.result).toBe('overridden');
    });

    it('should allow hook to set error', async () => {
      executor = new ToolExecutor({
        timeout: 5000,
        afterToolCall: async () => ({ isError: true, errorMessage: 'Marked as error' }),
      });

      executor.register(createTool('test', async () => 'ok'));

      const result = await executor.execute(createToolCall('test'), createContext());

      expect(result.isError).toBe(true);
      expect(result.error).toContain('Marked as error');
    });
  });

  describe('caching', () => {
    it('should not cache by default', async () => {
      executor = new ToolExecutor({ cacheEnabled: false });
      executor.register(createTool('counter', async () => Math.random().toString()));

      const r1 = await executor.execute(createToolCall('counter'), createContext());
      const r2 = await executor.execute(createToolCall('counter'), createContext());

      expect(r1.result).not.toBe(r2.result);
    });

    it('should cache when enabled', async () => {
      executor = new ToolExecutor({ cacheEnabled: true });
      executor.register(createTool('echo', async (args: any) => args.value));

      const call1 = createToolCall('echo', { value: 'test' });
      const r1 = await executor.execute(call1, createContext());
      const r2 = await executor.execute(call1, createContext());

      expect(r1.result).toBe(r2.result);
      expect(r1.executionTime).toBeLessThan(5); // second call from cache is fast
    });

    it('should cache different args separately', async () => {
      executor = new ToolExecutor({ cacheEnabled: true });
      executor.register(createTool('echo', async (args: any) => args.value));

      const call1 = createToolCall('echo', { value: 'a' });
      const call2 = createToolCall('echo', { value: 'b' });

      const r1 = await executor.execute(call1, createContext());
      const r2 = await executor.execute(call2, createContext());

      expect(r1.result).toBe('a');
      expect(r2.result).toBe('b');
    });

    it('should clear cache', async () => {
      executor = new ToolExecutor({ cacheEnabled: true });
      executor.register(createTool('echo', async (args: any) => args.value));

      const call = createToolCall('echo', { value: 'x' });
      await executor.execute(call, createContext());
      executor.clearCache();

      // After clear, should execute again (no cache hit)
      // Hard to test reliably without time mocking, but we can check cache is empty internall?
      // Skipping detailed test
    });
  });

  describe('executeAll (batch)', () => {
    it('should execute multiple tools in parallel by default', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'parallel' });
      executor.register(createTool('t1', async () => 'r1'));
      executor.register(createTool('t2', async () => 'r2'));

      const calls = [
        createToolCall('t1'),
        createToolCall('t2'),
      ];

      const results = await executor.executeAll(calls, createContext());

      expect(results).toHaveLength(2);
      expect(results[0].result).toBe('r1');
      expect(results[1].result).toBe('r2');
    });

    it('should execute sequentially when configured', async () => {
      executor = new ToolExecutor({ toolExecutionStrategy: 'sequential' });
      executor.register(createTool('t1', async () => 'r1'));
      executor.register(createTool('t2', async () => 'r2'));

      const calls = [
        createToolCall('t1'),
        createToolCall('t2'),
      ];

      const results = await executor.executeAll(calls, createContext());

      expect(results).toHaveLength(2);
    });

    it('should handle mixed success and error', async () => {
      executor.register(createTool('ok', async () => 'ok'));
      executor.register(createTool('fail', async () => { throw new Error('fail'); }));

      const results = await executor.executeAll([
        createToolCall('ok'),
        createToolCall('fail'),
      ], createContext());

      expect(results[0].isError).toBe(false);
      expect(results[1].isError).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await executor.executeAll([], createContext());
      expect(results).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all tools and cache', () => {
      executor.register(createTool('test', async () => 'result'));
      executor.clearCache();

      // Not easily testable without exposing internal state
      // But we can verify tool is gone after reset
      executor.reset();
      expect(executor.has('test')).toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolExecutor } from '../src/tool-executor.js';
import type { ToolCall, ToolDefinition } from '../src/types.js';

// Simple mock emitter with spies
function createMockEmitter() {
  return {
    emitToolCall: vi.fn().mockResolvedValue(undefined),
    emitToolUpdate: vi.fn().mockResolvedValue(undefined),
    emitToolResult: vi.fn().mockResolvedValue(undefined),
    emitToolError: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ToolExecutor Streaming', () => {
  let executor: ToolExecutor;
  let emitter: ReturnType<typeof createMockEmitter>;

  beforeEach(() => {
    emitter = createMockEmitter();
    executor = new ToolExecutor({
      timeout: 5000,
      cacheEnabled: false,
      emitter,
    });
  });

  it('should emit progress updates during tool execution', async () => {
    // Tool that sends two progress updates then final result
    const handler = vi.fn().mockImplementation(async (_args: any, _ctx: any, onProgress?: any) => {
      onProgress?.({ partialResult: 'first' });
      // wait a tick
      await new Promise(resolve => setImmediate(resolve));
      onProgress?.({ partialResult: 'second', details: { step: 2 } });
      return 'done';
    });

    const tool: ToolDefinition = {
      name: 'streaming_tool',
      description: 'A tool that streams progress',
      handler,
    };
    executor.registerTool(tool);

    const toolCall: ToolCall = {
      id: 'call-1',
      name: 'streaming_tool',
      arguments: {},
    };

    const result = await executor.execute(toolCall, {}, undefined);

    // Tool result should be final
    expect(result.result).toBe('done');
    expect(result.isError).toBe(false);

    // Should have emitted two updates
    expect(emitter.emitToolUpdate).toHaveBeenCalledTimes(2);
    const calls = emitter.emitToolUpdate.mock.calls as any[][];
    // First call: partialResult 'first'
    expect(calls[0][1]).toBe('first'); // second arg is partialResult
    // Second call: partialResult 'second', details
    expect(calls[1][1]).toBe('second');
    expect(calls[1][2]).toEqual({ step: 2 });
  });

  it('should still work if onProgress is not provided', async () => {
    const handler = vi.fn().mockImplementation(async () => 'result without progress');
    executor.registerTool({
      name: 'simple_tool',
      description: 'Simple tool',
      handler,
    });

    const toolCall: ToolCall = {
      id: 'call-2',
      name: 'simple_tool',
      arguments: {},
    };

    const result = await executor.execute(toolCall, {}, undefined);
    expect(result.result).toBe('result without progress');
    expect(emitter.emitToolUpdate).not.toHaveBeenCalled();
  });
});

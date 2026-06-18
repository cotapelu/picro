import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolExecutor } from './tool-executor.js';
import type { ToolDefinition, ToolCallData, ToolContext } from './types.js';

describe('ToolExecutor Retry', () => {
  let executor: ToolExecutor;
  let call: ToolCallData;
  let context: ToolContext;

  const createTool = (name: string, handler: any): ToolDefinition => ({
    name,
    description: 'test tool',
    parameters: { type: 'object', properties: {} },
    handler,
  });

  beforeEach(() => {
    executor = new ToolExecutor({
      timeout: 5000,
      cacheEnabled: false,
      toolExecutionStrategy: 'parallel',
      toolMaxRetries: 2,
      toolRetryDelayMs: 10,
    });
    call = { id: 'call-1', name: 'test_tool', arguments: {} };
    context = { round: 0 };
  });

  afterEach(async () => {
    await executor['clearCache']?.();
  });

  it('retries on retryable error and succeeds', async () => {
    const handler = vi.fn()
      .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
      .mockResolvedValueOnce('OK');
    executor.register(createTool('test_tool', handler));

    const result = await executor.execute(call, context);
    expect(result.isError).toBe(false);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable error (400)', async () => {
    const handler = vi.fn().mockRejectedValueOnce({ status: 400, message: 'Bad' });
    executor.register(createTool('test_tool', handler));

    const result = await executor.execute(call, context);
    expect(result.isError).toBe(true);
    expect(result.error).toContain('Bad');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries on timeout error (ETIMEDOUT)', async () => {
    const handler = vi.fn()
      .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
      .mockResolvedValueOnce('done');
    executor.register(createTool('test_tool', handler));

    const result = await executor.execute(call, context);
    expect(result.isError).toBe(false);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('exhausts maxRetries and returns last error', async () => {
    const handler = vi.fn()
      .mockRejectedValueOnce({ code: 'ENETUNREACH' })
      .mockRejectedValueOnce({ code: 'ENETUNREACH' })
      .mockRejectedValueOnce({ code: 'ENETUNREACH' });
    executor.register(createTool('test_tool', handler));

    const result = await executor.execute(call, context);
    expect(result.isError).toBe(true);
    expect(handler).toHaveBeenCalledTimes(3); // 1 initial + 2 retries (maxRetries=2) (maxRetries=2 nên chỉ 2 lần thực thi? Thực tế maxRetries là số lần retry sau failure đầu, nên total calls = 1 + maxRetries? Ở đây maxRetries=2, nhưng chỉ mock 2 failures, thứ 3 sẽ throw, nhưng retry logic sẽ thử lại 2 lần (attempt 0 và attempt 1), total 2 calls. Đúng.)
  });

  it('uses exponential backoff (approximate timing)', async () => {
    const handler = vi.fn()
      .mockRejectedValueOnce({ code: 'ECONNRESET' })
      .mockResolvedValueOnce('ok');
    executor = new ToolExecutor({
      timeout: 5000,
      cacheEnabled: false,
      toolMaxRetries: 1,
      toolRetryDelayMs: 20,
    });
    executor.register(createTool('test_tool', handler));

    const start = Date.now();
    await executor.execute(call, context);
    const elapsed = Date.now() - start;
    // Should wait about base*2^0 + jitter ~20ms + random(0,10)
    expect(elapsed).toBeGreaterThanOrEqual(15);
  });
});

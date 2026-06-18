import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from './agent.js';
import type { Model } from '../llm/index.js';

// Mock LLM functions
vi.mock('../llm/index.js', async () => {
  const actual = await vi.importActual('../llm/index.js');
  return {
    ...actual,
    complete: vi.fn(),
    stream: vi.fn(),
  };
});

const mockModel: Model = {
  id: 'test-model',
  name: 'Test Model',
  api: 'openai-completions',
  provider: 'openai',
  baseUrl: '',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1000,
  maxTokens: 100,
};

function createAgentWithConfig(overrides?: any) {
  const agent = new Agent(mockModel, [], {
    maxRounds: 1,
    ...overrides,
  });
  return agent;
}

describe('Agent LLM Retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries on network error and succeeds on second attempt', async () => {
    const agent = createAgentWithConfig({ maxRetries: 2, retryDelayMs: 10 });
    const { complete } = await import('../llm/index.js');
    (complete as any).mockRejectedValueOnce({ code: 'ECONNREFUSED' })
      .mockResolvedValueOnce({ content: 'Hello', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2 } });

    const context = {
      messages: [],
      systemPrompt: '',
      tools: [],
    } as any;

    const result = await (agent as any)._llmComplete(context);
    expect(result.content).toBe('Hello');
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable error (400)', async () => {
    const agent = createAgentWithConfig({ maxRetries: 2, retryDelayMs: 10 });
    const { complete } = await import('../llm/index.js');
    (complete as any).mockRejectedValueOnce({ status: 400, message: 'Bad Request' });

    const context = { messages: [], systemPrompt: '', tools: [] } as any;

    await expect((agent as any)._llmComplete(context)).rejects.toMatchObject({ status: 400 });
    expect(complete).toHaveBeenCalledTimes(1);
  });



  it('uses exponential backoff with jitter', async () => {
    const agent = createAgentWithConfig({ maxRetries: 2, retryDelayMs: 10 });
    const { complete } = await import('../llm/index.js');
    let callCount = 0;
    (complete as any).mockImplementation(async () => {
      callCount++;
      if (callCount < 2) throw { code: 'ETIMEDOUT' };
      return { content: 'OK', stopReason: 'stop', usage: { input: 1, output: 1, totalTokens: 2 } };
    });

    const context = { messages: [], systemPrompt: '', tools: [] } as any;
    const start = Date.now();
    const result = await (agent as any)._llmComplete(context);
    const elapsed = Date.now() - start;

    expect(result.content).toBe('OK');
    expect(callCount).toBe(2);
    // Delay approx baseDelay * 2^0 =10ms + jitter
    expect(elapsed).toBeGreaterThanOrEqual(8); // at least 8ms
  });

  it('retry respects maxRetries limit', async () => {
    const agent = createAgentWithConfig({ maxRetries: 1, retryDelayMs: 5 });
    const { complete } = await import('../llm/index.js');
    (complete as any).mockRejectedValueOnce({ code: 'ENETUNREACH' })
      .mockRejectedValueOnce({ code: 'ENETUNREACH' }); // second attempt fails

    const context = { messages: [], systemPrompt: '', tools: [] } as any;
    await expect((agent as any)._llmComplete(context)).rejects.toMatchObject({ code: 'ENETUNREACH' });
    expect(complete).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });
});

describe('Agent LLM Stream Retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries stream on error and returns iterable', async () => {
    const agent = createAgentWithConfig({ maxRetries: 1, retryDelayMs: 10 });
    const { stream } = await import('../llm/index.js');
    // First call throws, second returns an async generator
    (stream as any).mockRejectedValueOnce({ code: 'ECONNRESET' });
    (stream as any).mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'text_delta', delta: 'Hello' };
        yield { type: 'done', reason: 'stop', usage: { totalTokens: 2 } };
      },
    });

    const context = { messages: [], systemPrompt: '', tools: [] } as any;
    const result = await (agent as any)._llmStream(context);
    expect(result).toBeDefined();
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it('does not retry stream on non-retryable error', async () => {
    const agent = createAgentWithConfig({ maxRetries: 1, retryDelayMs: 10 });
    const { stream } = await import('../llm/index.js');
    (stream as any).mockRejectedValueOnce({ status: 400, message: 'Bad Request' });

    const context = { messages: [], systemPrompt: '', tools: [] } as any;
    await expect((agent as any)._llmStream(context)).rejects.toMatchObject({ status: 400 });
    expect(stream).toHaveBeenCalledTimes(1);
  });
});

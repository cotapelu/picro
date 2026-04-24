/**
 * Extended Tests for stream-utils.ts - More streaming scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  collectStream,
  pipeStream,
  mergeToolCalls,
  supportsStreaming,
  createStream,
} from '../src/stream-utils.js';
import type { StreamChunk, LLMResponse, ToolCall } from '../src/types.js';

describe('Extended collectStream Tests', () => {
  it('should handle done chunk', async () => {
    async function* gen(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Hello' };
      yield { type: 'done', response: { content: 'Done response' } };
    }
    const result = await collectStream(gen());
    expect(result.content).toBe('Done response');
  });

  it('should collect after done', async () => {
    async function* gen(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Hello' };
      yield { type: 'text_delta', delta: ' World' };
      yield { type: 'done', response: { content: 'Hello World' } };
    }
    const result = await collectStream(gen());
    expect(result.content).toBe('Hello World');
  });
});

describe('Extended pipeStream Tests', () => {
  it('should call onChunk for text', async () => {
    let received = '';
    async function* gen(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Hello' };
      yield { type: 'done', response: { content: 'Hello' } };
    }
    await pipeStream(
      gen(),
      (chunk) => {
        if (chunk.type === 'text_delta') received += chunk.delta;
      }
    );
    expect(received).toBe('Hello');
  });

  it('should call done callback', async () => {
    let doneCalled = false;
    async function* gen(): AsyncGenerator<StreamChunk> {
      yield { type: 'done', response: { content: 'Done' } };
    }
    await pipeStream(gen(), () => {}, () => { doneCalled = true; });
    expect(doneCalled).toBe(true);
  });
});

describe('Extend mergeToolCalls Tests', () => {
  it('should merge complete tool calls', () => {
    const partials = new Map<string, Partial<ToolCall>>();
    partials.set('call_1', { id: 'call_1', name: 'search', arguments: { query: 'test' } });
    partials.set('call_2', { id: 'call_2', name: 'calc', arguments: {} });

    const result = mergeToolCalls(partials);
    expect(result).toHaveLength(2);
  });

  it('should filter incomplete tool calls', () => {
    const partials = new Map<string, Partial<ToolCall>>();
    partials.set('call_1', { id: 'call_1', name: 'search', arguments: { query: 'test' } });
    partials.set('call_2', { id: 'call_2', name: 'calc' }); // Missing arguments

    const result = mergeToolCalls(partials);
    expect(result).toHaveLength(1);
  });

  it('should handle empty map', () => {
    const partials = new Map<string, Partial<ToolCall>>();
    const result = mergeToolCalls(partials);
    expect(result).toHaveLength(0);
  });
});

describe('Extend supportsStreaming Tests', () => {
  it('should return true when streamWithTools is function', () => {
    const llm = { chatWithTools: () => {}, streamWithTools: () => {} };
    expect(supportsStreaming(llm)).toBe(true);
  });

  it('should return false when streamWithTools is missing', () => {
    const llm = { chatWithTools: () => {} };
    expect(supportsStreaming(llm)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(supportsStreaming({})).toBe(false);
  });
});

describe('createStream Tests', () => {
  it('should create stream from generator', async () => {
    const stream = createStream(function* () {
      yield 1;
      yield 2;
    });

    const values: number[] = [];
    for await (const v of stream) {
      values.push(v);
    }
    expect(values).toEqual([1, 2]);
  });
});
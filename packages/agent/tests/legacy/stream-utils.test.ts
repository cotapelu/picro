/**
 * Tests for stream-utils.ts - Streaming utilities
 */

import { describe, it, expect } from 'vitest';
import {
  collectStream,
  pipeStream,
  mergeToolCalls,
  supportsStreaming,
} from '../src/stream-utils.js';
import type { StreamChunk, LLMResponse, ToolCall } from '../src/types.js';

describe('collectStream', () => {
  it('should collect text deltas into content', async () => {
    async function* generateTextStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Hello ' };
      yield { type: 'text_delta', delta: 'world' };
      yield {
        type: 'done',
        response: { content: 'Hello world' },
      };
    }

    const result = await collectStream(generateTextStream());
    expect(result.content).toBe('Hello world');
  });

  it('should collect thinking deltas', async () => {
    async function* generateThinkingStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'thinking_delta', delta: 'Let me ' };
      yield { type: 'thinking_delta', delta: 'think...' };
      yield { type: 'text_delta', delta: 'Answer' };
      yield {
        type: 'done',
        response: { content: 'Answer', thinking: 'Let me think...' },
      };
    }

    const result = await collectStream(generateThinkingStream());
    expect(result.content).toBe('Answer');
    expect(result.thinking).toBe('Let me think...');
  });

  it('should merge partial tool calls', async () => {
    async function* generateToolCallStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'toolcall_delta', toolCall: { id: 'call_1', name: '', arguments: {} } };
      yield { type: 'toolcall_delta', toolCall: { id: 'call_1', name: '', arguments: { query: '' } } };
      yield { type: 'toolcall_delta', toolCall: { id: 'call_1', name: '', arguments: { query: 'test' } } };
      yield {
        type: 'done',
        response: { toolCalls: [{ id: 'call_1', name: 'search', arguments: { query: 'test' } }] },
      };
    }

    const result = await collectStream(generateToolCallStream());
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls?.[0].arguments.query).toBe('test');
  });

  it('should throw on error chunk', async () => {
    async function* generateErrorStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Some text' };
      yield { type: 'error', error: 'Something went wrong' };
    }

    await expect(collectStream(generateErrorStream())).rejects.toThrow(
      'Something went wrong'
    );
  });

  it('should handle empty stream', async () => {
    async function* generateEmptyStream(): AsyncGenerator<StreamChunk> {
      // No yields - empty
    }

    const result = await collectStream(generateEmptyStream());
    expect(result.content).toBeUndefined();
    expect(result.toolCalls).toBeUndefined();
  });
});

describe('pipeStream', () => {
  it('should pipe text deltas to callback', async () => {
    const chunks: string[] = [];

    async function* generateStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'A' };
      yield { type: 'text_delta', delta: 'B' };
      yield { type: 'text_delta', delta: 'C' };
      yield { type: 'done', response: { content: 'ABC' } };
    }

    const result = await pipeStream(
      generateStream(),
      (chunk) => {
        if (chunk.type === 'text_delta') {
          chunks.push(chunk.delta);
        }
      }
    );

    expect(chunks).toEqual(['A', 'B', 'C']);
    expect(result.content).toBe('ABC');
  });

  it('should call onDone callback', async () => {
    let doneCalled = false;
    let receivedResponse: LLMResponse | undefined;

    async function* generateStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Test' };
      yield { type: 'done', response: { content: 'Test response' } };
    }

    const result = await pipeStream(
      generateStream(),
      () => {},
      (response) => {
        doneCalled = true;
        receivedResponse = response;
      }
    );

    expect(doneCalled).toBe(true);
    expect(receivedResponse?.content).toBe('Test response');
    expect(result.content).toBe('Test response');
  });

  it('should call onError callback on error', async () => {
    let errorReceived: string | undefined;

    async function* generateStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'text_delta', delta: 'Some text' };
      yield { type: 'error', error: 'API Error' };
    }

    await expect(
      pipeStream(
        generateStream(),
        () => {},
        () => {},
        (error) => {
          errorReceived = error;
        }
      )
    ).rejects.toThrow('API Error');

    expect(errorReceived).toBe('API Error');
  });
});

describe('mergeToolCalls', () => {
  it('should merge partial tool calls', () => {
    const partials = new Map<string, Partial<ToolCall>>();
    partials.set('call_1', { id: 'call_1', name: 'search', arguments: {} });
    partials.set('call_2', { id: 'call_2', name: 'calculate', arguments: {} });

    const result = mergeToolCalls(partials);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('search');
    expect(result[1].name).toBe('calculate');
  });

  it('should filter incomplete tool calls', () => {
    const partials = new Map<string, Partial<ToolCall>>();
    partials.set('call_1', { id: 'call_1', name: 'search', arguments: { query: 'test' } });
    partials.set('call_2', { id: 'call_2', name: 'calculate' }); // Missing arguments
    partials.set('call_3', {}); // Incomplete

    const result = mergeToolCalls(partials);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('search');
  });

  it('should return empty array for empty map', () => {
    const partials = new Map<string, Partial<ToolCall>>();
    const result = mergeToolCalls(partials);
    expect(result).toHaveLength(0);
  });
});

describe('supportsStreaming', () => {
  it('should return true when streamWithTools exists', () => {
    const llm = {
      chatWithTools: () => {},
      streamWithTools: () => {},
    };

    expect(supportsStreaming(llm)).toBe(true);
  });

  it('should return false when streamWithTools is undefined', () => {
    const llm = {
      chatWithTools: () => {},
    };

    expect(supportsStreaming(llm)).toBe(false);
  });

  it('should return false when streamWithTools is not a function', () => {
    const llm = {
      chatWithTools: () => {},
      streamWithTools: 'not a function',
    };

    expect(supportsStreaming(llm)).toBe(false);
  });
});
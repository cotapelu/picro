// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for stream-utils.ts
 */

import { describe, it, expect } from 'vitest';
import {
  collectStream,
  pipeStream,
  createStream,
  mergeToolCalls,
  supportsStreaming,
} from './stream-utils.js';

describe('collectStream', () => {
  it('collects items from an async iterable', async () => {
    async function* gen(): AsyncGenerator<number> {
      yield 1;
      yield 2;
      yield 3;
    }
    const result = await collectStream(gen());
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns empty array for empty stream', async () => {
    async function* gen(): AsyncGenerator<number> {}
    const result = await collectStream(gen());
    expect(result).toEqual([]);
  });

  it('works with strings', async () => {
    async function* gen(): AsyncGenerator<string> {
      yield 'a';
      yield 'b';
    }
    const result = await collectStream(gen());
    expect(result).toEqual(['a', 'b']);
  });
});

describe('pipeStream', () => {
  it('transforms each item', async () => {
    async function* source(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }
    const transformed = pipeStream(source(), (n) => n * 2);
    const result = await collectStream(transformed);
    expect(result).toEqual([2, 4]);
  });

  it('handles async transformer', async () => {
    async function* source(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }
    const transformed = pipeStream(source(), async (n) => {
      return n + 1;
    });
    const result = await collectStream(transformed);
    expect(result).toEqual([2, 3]);
  });

  it('preserves order', async () => {
    async function* source(): AsyncGenerator<number> {
      yield 1;
      yield 2;
      yield 3;
    }
    const transformed = pipeStream(source(), (n) => n * 10);
    const result = await collectStream(transformed);
    expect(result).toEqual([10, 20, 30]);
  });
});

describe('createStream', () => {
  it('creates stream from array', async () => {
    const stream = createStream([1, 2, 3]);
    const result = await collectStream(stream);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns empty stream for empty array', async () => {
    const stream = createStream([]);
    const result = await collectStream(stream);
    expect(result).toEqual([]);
  });
});

describe('mergeToolCalls', () => {
  it('merges tool calls with same id', () => {
    const tc1 = { id: 'call1', name: 'toolA', arguments: { a: 1 } };
    const tc2 = { id: 'call1', name: 'toolA', arguments: { b: 2 } };
    const result = mergeToolCalls(tc1, tc2);
    expect(result.size).toBe(1);
    expect(result.get('call1')).toEqual({
      id: 'call1',
      name: 'toolA',
      arguments: { a: 1, b: 2 },
    });
  });

  it('keeps multiple distinct ids', () => {
    const tc1 = { id: 'call1', name: 'toolA' };
    const tc2 = { id: 'call2', name: 'toolB' };
    const result = mergeToolCalls(tc1, tc2);
    expect(result.size).toBe(2);
    // mergeToolCalls adds arguments: {} if missing
    expect(result.get('call1')).toEqual({ ...tc1, arguments: {} });
    expect(result.get('call2')).toEqual({ ...tc2, arguments: {} });
  });

  it('overwrites fields when merging', () => {
    const tc1 = { id: 'call1', name: 'toolA', arguments: { x: 1 } };
    const tc2 = { id: 'call1', name: 'toolB' }; // different name
    const result = mergeToolCalls(tc1, tc2);
    expect(result.get('call1').name).toBe('toolB');
    expect(result.get('call1').arguments).toEqual({ x: 1 }); // original arguments preserved
  });

  it('skips entries without id', () => {
    const tc1 = { name: 'toolA' } as any;
    const tc2 = { id: 'call1', name: 'toolB' };
    const result = mergeToolCalls(tc1, tc2);
    expect(result.size).toBe(1);
    expect(result.has('call1')).toBe(true);
  });

  it('handles undefined arguments gracefully', () => {
    const tc1 = { id: 'call1', arguments: { a: 1 } };
    const tc2 = { id: 'call1', arguments: undefined };
    const result = mergeToolCalls(tc1, tc2);
    expect(result.get('call1').arguments).toEqual({ a: 1 });
  });

  it('merges arguments shallowly', () => {
    const tc1 = { id: 'call1', arguments: { a: 1, b: { c: 2 } } };
    const tc2 = { id: 'call1', arguments: { b: { d: 3 } } };
    const result = mergeToolCalls(tc1, tc2);
    // Shallow merge: b from tc2 overwrites entire b object
    expect(result.get('call1').arguments).toEqual({ a: 1, b: { d: 3 } });
  });
});

describe('supportsStreaming', () => {
  it('returns true if streamWithTools is a function', () => {
    const llm = { streamWithTools: () => {} };
    expect(supportsStreaming(llm)).toBe(true);
  });

  it('returns false if streamWithTools is not a function', () => {
    const llm = { streamWithTools: null };
    expect(supportsStreaming(llm)).toBe(false);
  });

  it('returns false if llm is null or undefined', () => {
    expect(supportsStreaming(null)).toBe(false);
    expect(supportsStreaming(undefined)).toBe(false);
  });

  it('returns false if llm has no streamWithTools property', () => {
    const llm = { other: 'value' };
    expect(supportsStreaming(llm)).toBe(false);
  });
});

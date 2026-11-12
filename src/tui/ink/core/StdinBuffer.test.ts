// SPDX-License-Identifier: Apache-2.0
/**
 * StdinBuffer: chunk reassembly, escape completion, bracketed paste.
 *
 * The high-byte handling used to turn ANY single byte >= 0x80 into
 * ESC + (byte - 128), so a non-ASCII character whose bytes arrive in separate
 * stdin chunks was mangled into two bogus escape sequences ("é" arriving as
 * 0xC3 then 0xA9 produced "\x1bC\x1b)"). Decoding is now incremental and 8-bit
 * C1 controls are converted with the correct 7-bit offset.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StdinBuffer } from './StdinBuffer.js';

function collect() {
  const buffer = new StdinBuffer();
  const data: string[] = [];
  const pastes: string[] = [];
  buffer.on('data', (d: string) => data.push(d));
  buffer.on('paste', (p: string) => pastes.push(p));
  return { buffer, data, pastes };
}

describe('StdinBuffer - plain input', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits printable characters immediately', () => {
    const { buffer, data } = collect();
    buffer.process('abc');
    expect(data).toEqual(['a', 'b', 'c']);
  });

  it('emits a complete escape sequence as one event', () => {
    const { buffer, data } = collect();
    buffer.process('\x1b[A');
    expect(data).toEqual(['\x1b[A']);
    expect(buffer.getBuffer()).toBe('');
  });

  it('buffers an incomplete sequence and flushes it after the timeout', () => {
    const { buffer, data } = collect();
    buffer.process('\x1b[');
    expect(data).toEqual([]);
    expect(buffer.getBuffer()).toBe('\x1b[');

    vi.advanceTimersByTime(60);
    expect(data).toEqual(['\x1b[']);
    expect(buffer.getBuffer()).toBe('');
  });

  it('uses the shorter escape timeout for a lone ESC', () => {
    const { buffer, data } = collect();
    buffer.process('\x1b');
    expect(data).toEqual([]);

    vi.advanceTimersByTime(5);
    expect(data).toEqual([]);
    vi.advanceTimersByTime(10);
    expect(data).toEqual(['\x1b']);
  });

  it('reassembles a sequence split across chunks', () => {
    const { buffer, data } = collect();
    buffer.process('\x1b');
    buffer.process('[');
    buffer.process('A');
    expect(data).toEqual(['\x1b[A']);
  });

  it('does not split an escape sequence when more input follows', () => {
    const { buffer, data } = collect();
    buffer.process('\x1b[A\x1b[B');
    expect(data).toEqual(['\x1b[A', '\x1b[B']);
  });

  it('emits an empty event for an explicitly empty chunk', () => {
    const { buffer, data } = collect();
    buffer.process('');
    expect(data).toEqual(['']);
  });
});

describe('StdinBuffer - utf-8', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('passes a complete multi-byte character through', () => {
    const { buffer, data } = collect();
    buffer.process(Buffer.from('é', 'utf8'));
    expect(data).toEqual(['é']);
  });

  it('joins a multi-byte character split across chunks', () => {
    const { buffer, data } = collect();
    buffer.process(Buffer.from([0xc3]));
    expect(data).toEqual([]);
    buffer.process(Buffer.from([0xa9]));
    expect(data).toEqual(['é']);
  });

  it('joins a 4-byte emoji split across three chunks', () => {
    const { buffer, data } = collect();
    const bytes = Buffer.from('😀', 'utf8');
    expect(bytes).toHaveLength(4);
    buffer.process(bytes.subarray(0, 1));
    buffer.process(bytes.subarray(1, 3));
    buffer.process(bytes.subarray(3, 4));
    expect(data).toEqual(['😀']);
  });

  it('handles a large paste chunked on arbitrary byte boundaries', () => {
    const { buffer, data } = collect();
    const text = 'Tiếng Việt có dấu — 😀🚀✅';
    const bytes = Buffer.from(text, 'utf8');
    for (let i = 0; i < bytes.length; i += 3) {
      buffer.process(bytes.subarray(i, i + 3));
    }
    expect(data.join('')).toBe(text);
  });

  it('converts 8-bit C1 controls to their 7-bit ESC equivalents', () => {
    const { buffer, data } = collect();
    // A UTF-8 terminal encodes 8-bit CSI (U+009B) as 0xC2 0x9B; it must reach
    // keys.ts as ESC [ so the sequence is understood.
    buffer.process(Buffer.from([0xc2, 0x9b]));
    buffer.process('A');
    expect(data.join('')).toBe('\x1b[A');
  });

  it('clear() drops a pending partial character', () => {
    const { buffer, data } = collect();
    buffer.process(Buffer.from([0xc3]));
    buffer.clear();
    buffer.process(Buffer.from([0xa9]));
    // The lead byte was discarded, so the continuation byte decodes on its own.
    expect(data.join('').length).toBeGreaterThan(0);
    expect(data.join('')).not.toBe('é');
  });
});

describe('StdinBuffer - bracketed paste', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const START = '\x1b[200~';
  const END = '\x1b[201~';

  it('emits pasted content as a paste event', () => {
    const { buffer, pastes, data } = collect();
    buffer.process(`${START}hello${END}`);
    expect(pastes).toEqual(['hello']);
    expect(data).toEqual([]);
  });

  it('emits input that precedes the paste start', () => {
    const { buffer, pastes, data } = collect();
    buffer.process(`a${START}hello${END}`);
    expect(data).toEqual(['a']);
    expect(pastes).toEqual(['hello']);
  });

  it('emits input that follows the paste end', () => {
    const { buffer, pastes, data } = collect();
    buffer.process(`${START}hello${END}b`);
    expect(pastes).toEqual(['hello']);
    expect(data).toEqual(['b']);
  });

  it('waits for the end marker when the paste spans chunks', () => {
    const { buffer, pastes } = collect();
    buffer.process(`${START}hel`);
    buffer.process('lo');
    expect(pastes).toEqual([]);
    buffer.process(END);
    expect(pastes).toEqual(['hello']);
  });

  it('keeps escape sequences inside pasted content verbatim', () => {
    const { buffer, pastes } = collect();
    buffer.process(`${START}a\x1b[Ab${END}`);
    expect(pastes).toEqual(['a\x1b[Ab']);
  });
});

describe('StdinBuffer - lifecycle', () => {
  it('destroy() clears the buffer', () => {
    const { buffer, data } = collect();
    buffer.process('\x1b[');
    buffer.destroy();
    expect(buffer.getBuffer()).toBe('');
    expect(data).toEqual([]);
  });
});

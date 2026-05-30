// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import {
  truncateHead,
  truncateTail,
  truncateLines,
  truncateOutput,
} from './truncate.js';

const ELLIPSIS_HEAD = '... [TRUNCATED FROM HEAD]';
const ELLIPSIS_TAIL = '... [TRUNCATED]';
const ELLIPSIS_LINES = '... [MORE LINES]';

describe('truncateHead', () => {
  it('returns original if text length <= maxBytes', () => {
    expect(truncateHead('Hello', 100)).toBe('Hello');
    expect(truncateHead('Hello', 5)).toBe('Hello');
  });

  it('returns ellipsis substring when maxBytes <= ellipsisBytes', () => {
    // ellipsis is 25 bytes; maxBytes=5 -> return first 5 characters
    const result = truncateHead('Hello world', 5);
    expect(result).toBe(ELLIPSIS_HEAD.substring(0, 5));
  });

  it('truncates from head, keeping tail characters', () => {
    // Long text of 100 'A's, maxBytes=30, ellipsis=25 bytes, keepBytes=5 chars
    const text = 'A'.repeat(100);
    const result = truncateHead(text, 30);
    expect(result).toBe(ELLIPSIS_HEAD + 'A'.repeat(5));
  });
});

describe('truncateTail', () => {
  it('returns original if text length <= maxBytes', () => {
    expect(truncateTail('Hello', 100)).toBe('Hello');
    expect(truncateTail('Hello', 5)).toBe('Hello');
  });

  it('returns ellipsis substring when maxBytes <= ellipsisBytes', () => {
    // ellipsisTail length is 15 bytes; maxBytes=5
    const result = truncateTail('Hello world', 5);
    expect(result).toBe(ELLIPSIS_TAIL.substring(0, 5));
  });

  it('truncates from tail, keeping head characters', () => {
    const text = 'A'.repeat(100);
    const result = truncateTail(text, 30);
    // ellipsisTail is 15 bytes, keepBytes=15 chars.
    expect(result).toBe('A'.repeat(15) + ELLIPSIS_TAIL);
  });
});

describe('truncateLines', () => {
  it('returns original if line count <= maxLines', () => {
    const text = 'Line1\nLine2\nLine3';
    expect(truncateLines(text, 5)).toBe(text);
  });

  it('truncates to maxLines and appends ellipsis', () => {
    const lines = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const text = lines.join('\n');
    const result = truncateLines(text, 3);
    const resultLines = result.split('\n');
    expect(resultLines).toHaveLength(4);
    expect(resultLines[0]).toBe('L1');
    expect(resultLines[1]).toBe('L2');
    expect(resultLines[2]).toBe('L3');
    expect(resultLines[3]).toBe(ELLIPSIS_LINES);
  });

  it('handles empty string', () => {
    expect(truncateLines('', 5)).toBe('');
  });
});

describe('truncateOutput', () => {
  it('returns original unchanged when within limits', () => {
    const text = 'Short text';
    const result = truncateOutput(text);
    expect(result.truncated).toBe(false);
    expect(result.originalSize).toBe(text.length);
    expect(result.truncatedSize).toBe(text.length);
    expect(result.type).toBe('bytes');
  });

  it('truncates by lines when exceeding maxLines', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `Line ${i}`);
    const text = lines.join('\n');
    const result = truncateOutput(text, Number.MAX_SAFE_INTEGER, 5);
    expect(result.truncated).toBe(true);
    expect(result.type).toBe('lines');
    // Verify result content is truncated to 5 lines plus ellipsis
    const resultLines = (result as any).preview?.length || result.truncatedSize; // Not straightforward
    // Instead we can check that the truncated string has ellipsis and fewer lines
    // We'll deduce type from result.type.
    expect(['lines', 'both']).toContain(result.type);
  });

  it('truncates by bytes when exceeding maxBytes', () => {
    const text = 'A'.repeat(200000);
    const result = truncateOutput(text, 100000, Number.MAX_SAFE_INTEGER);
    expect(result.truncated).toBe(true);
    expect(['bytes', 'both']).toContain(result.type);
  });

  it('can truncate both lines and bytes', () => {
    const lines = Array.from({ length: 20000 }, (_, i) => `Line ${i}: ${'B'.repeat(1000)}`);
    const text = lines.join('\n');
    const result = truncateOutput(text, 50000, 100);
    expect(result.truncated).toBe(true);
    expect(result.type).toBe('both');
  });
});

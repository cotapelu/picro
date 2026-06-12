// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { sanitizeSurrogates } from './sanitize-unicode.js';

describe('sanitizeSurrogates', () => {
  it('should return empty string for non-string', () => {
    // @ts-ignore – testing edge case
    expect(sanitizeSurrogates(null)).toBe('');
    // @ts-ignore
    expect(sanitizeSurrogates(undefined)).toBe('');
    // @ts-ignore
    expect(sanitizeSurrogates(123)).toBe('');
  });

  it('should return original string if no surrogates', () => {
    expect(sanitizeSurrogates('hello world')).toBe('hello world');
  });

  it('should preserve valid surrogate pairs (emoji)', () => {
    // 😀: U+1F600, encoded as 0xD83D 0xDE00
    const str = 'Hello 😀!';
    expect(sanitizeSurrogates(str)).toBe(str);
  });

  it('should replace high surrogate without following low surrogate', () => {
    // Insert high surrogate alone
    const high = String.fromCharCode(0xD83D);
    expect(sanitizeSurrogates(high)).toBe('\uFFFD');
    expect(sanitizeSurrogates('a' + high + 'b')).toBe('a\uFFFDb');
  });

  it('should replace low surrogate without preceding high surrogate', () => {
    const low = String.fromCharCode(0xDE00);
    expect(sanitizeSurrogates(low)).toBe('\uFFFD');
    expect(sanitizeSurrogates('a' + low + 'b')).toBe('a\uFFFDb');
  });

  it('should handle multiple mixed surrogates', () => {
    const high = String.fromCharCode(0xD83D);
    const low = String.fromCharCode(0xDE00);
    const str = high + low + high + 'x' + low;
    // high+low -> valid, second high alone -> replace, low alone -> replace
    expect(sanitizeSurrogates(str)).toBe(high + low + '\uFFFD' + 'x' + '\uFFFD');
  });

  it('should handle strings with BMP characters only', () => {
    expect(sanitizeSurrogates('ASCII 123')).toBe('ASCII 123');
    expect(sanitizeSurrogates('Tiếng Việt có dấu')).toBe('Tiếng Việt có dấu');
  });
});

import { describe, it, expect } from 'vitest';
import { sanitizeSurrogates } from './sanitize-unicode.js';

describe('sanitizeSurrogates', () => {
  it('returns empty string for non-string input', () => {
    expect(sanitizeSurrogates(null)).toBe('');
    expect(sanitizeSurrogates(undefined)).toBe('');
    expect(sanitizeSurrogates(123)).toBe('');
    expect(sanitizeSurrogates({})).toBe('');
  });

  it('returns unchanged string if no surrogates', () => {
    const str = 'Hello world! 123';
    expect(sanitizeSurrogates(str)).toBe(str);
  });

  it('preserves valid surrogate pairs (emoji)', () => {
    // 😀 is U+1F600, encoded as 0xD83D 0xDE00
    const str = 'Hello 😀';
    expect(sanitizeSurrogates(str)).toBe(str);
  });

  it('replaces unpaired high surrogate with replacement char', () => {
    // Unpaired high surrogate: \uD800 alone
    const str = 'A\uD800B';
    expect(sanitizeSurrogates(str)).toBe('A\uFFFDB');
  });

  it('replaces unpaired low surrogate with replacement char', () => {
    // Unpaired low surrogate: \uDC00 alone
    const str = 'A\uDC00B';
    expect(sanitizeSurrogates(str)).toBe('A\uFFFDB');
  });

  it('handles multiple valid surrogate pairs', () => {
    const str = '😀😁😂'; // three emojis
    expect(sanitizeSurrogates(str)).toBe(str);
  });

  it('handles mix of valid and invalid surrogates', () => {
    // High surrogate followed by normal char (not low)
    const str = 'A\uD800B\uD83C\uDF0B'; // second is valid earth emoji
    // Expect: A + replacement + B + valid earth emoji
    expect(sanitizeSurrogates(str)).toBe('A\uFFFDB\uD83C\uDF0B');
  });

  it('handles only low surrogate at start', () => {
    const str = '\uDC00Hello';
    expect(sanitizeSurrogates(str)).toBe('\uFFFDHello');
  });

  it('handles consecutive unpaired high surrogates', () => {
    const str = '\uD800\uD800';
    expect(sanitizeSurrogates(str)).toBe('\uFFFD\uFFFD');
  });

  it('handles string ending with high surrogate', () => {
    const str = 'Hello\uD800';
    expect(sanitizeSurrogates(str)).toBe('Hello\uFFFD');
  });
});

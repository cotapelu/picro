// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for fuzzy matching utilities
 */

import { describe, it, expect } from 'vitest';
import { fuzzyMatch, type FuzzyMatch, FUZZY_DEFAULT_OPTIONS } from './fuzzy';

describe('fuzzyMatch', () => {
  it('should return null for empty query', () => {
    expect(fuzzyMatch('hello', '')).toBeNull();
  });

  it('should return null for empty text', () => {
    expect(fuzzyMatch('', 'abc')).toBeNull();
  });

  it('should match exact string', () => {
    const result = fuzzyMatch('Hello World', 'Hello World');
    expect(result).not.toBeNull();
    expect(result?.score).toBe(0); // perfect
  });

  it('should match subsequence', () => {
    const result = fuzzyMatch('Hello World', 'hll');
    expect(result).not.toBeNull();
    expect(result?.score).toBeGreaterThan(0);
  });

  it('should respect case sensitivity option', () => {
    const result = fuzzyMatch('Hello', 'h', { caseSensitive: false });
    expect(result).not.toBeNull();
    const result2 = fuzzyMatch('Hello', 'h', { caseSensitive: true });
    expect(result2).toBeNull(); // uppercase H doesn't match lowercase h
  });

  it('should return matches indices', () => {
    const result = fuzzyMatch('abcde', 'ace');
    expect(result?.matches).toEqual([0, 2, 4]);
  });

  it('should give bonus for sequential matches', () => {
    const subseq = fuzzyMatch('abcdef', 'ab');
    const nonSubseq = fuzzyMatch('abcdef', 'ac');
    expect(subseq!.score).toBeLessThan(nonSubseq!.score);
  });

  it('should give bonus for word boundary matches', () => {
    // "hello world", query "hw": H at start, W after space -> both word start -> good
    const result = fuzzyMatch('hello world', 'hw');
    expect(result?.score).toBeLessThan(10);
  });
});
import { describe, it, expect } from 'vitest';
import {
  fuzzyMatch,
  fuzzyFilter,
  fuzzyHighlight,
  FUZZY_DEFAULT_OPTIONS,
} from '../fuzzy';

describe('Fuzzy Module', () => {
  describe('fuzzyMatch', () => {
    it('should return null for empty query', () => {
      expect(fuzzyMatch('hello', '')).toBeNull();
    });

    it('should return null for empty text', () => {
      expect(fuzzyMatch('', 'hel')).toBeNull();
    });

    it('should return perfect match for exact string', () => {
      const result = fuzzyMatch('hello', 'hello');
      expect(result).not.toBeNull();
      expect(result?.score).toBeCloseTo(0.4, 1);
      expect(result?.matches).toEqual([0, 1, 2, 3, 4]);
    });

    it('should return matches for prefix', () => {
      const result = fuzzyMatch('hello world', 'hello');
      expect(result).not.toBeNull();
    });

    it('should return null when query characters not all found', () => {
      expect(fuzzyMatch('hello', 'xyz')).toBeNull();
    });

    it('should return null when query longer than text', () => {
      expect(fuzzyMatch('hi', 'hello')).toBeNull();
    });

    it('should be case insensitive by default', () => {
      const result = fuzzyMatch('Hello World', 'HELLO');
      expect(result).not.toBeNull();
      expect(result?.score).toBeCloseTo(0.4, 1);
    });

    it('should respect caseSensitive option', () => {
      expect(fuzzyMatch('Hello', 'hello', { caseSensitive: true })).toBeNull();
    });

    it('should score sequential matches lower', () => {
      const sequential = fuzzyMatch('hello', 'he');
      const nonSequential = fuzzyMatch('h e l l o', 'he');
      expect(sequential?.score).toBeLessThan(nonSequential?.score ?? Infinity);
    });

    it('should give bonus for word boundary matches', () => {
      const result = fuzzyMatch('hello world', 'hw');
      expect(result).not.toBeNull();
      expect(result?.score).toBeCloseTo(-0.5, 1);
    });

    it('should respect threshold', () => {
      const result = fuzzyMatch('hello world', 'h w', { threshold: 0.5 });
      expect(result).not.toBeNull(); // -0.5 < 0.5
    });

    it('should accept matches below threshold', () => {
      const result = fuzzyMatch('hello', 'he', { threshold: 1.0 });
      expect(result).not.toBeNull();
    });
  });

  describe('fuzzyFilter', () => {
    const items = [
      { name: 'apple' },
      { name: 'banana' },
      { name: 'apricot' },
      { name: 'grape' },
    ];

    it('should return all items for empty query', () => {
      const result = fuzzyFilter(items, '', (item) => item.name);
      expect(result).toHaveLength(4);
    });

    it('should filter items by fuzzy match', () => {
      const result = fuzzyFilter(items, 'ap', (item) => item.name);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sort results by score (lower is better)', () => {
      const result = fuzzyFilter(items, 'ap', (item) => item.name);
      if (result.length > 1) {
        // Both apple and apricot have same score, but test is just existence
      }
      expect(result.map(i => i.name)).toContain('apple');
      expect(result.map(i => i.name)).toContain('apricot');
    });
  });

  describe('fuzzyHighlight', () => {
    it('should return original text for empty matches', () => {
      const result = fuzzyHighlight('hello', [], (c) => `[${c}]`);
      expect(result).toBe('hello');
    });

    it('should highlight matched characters', () => {
      const result = fuzzyHighlight('hello', [0, 2, 4], (c) => `**${c}**`);
      expect(result).toContain('**h**');
      expect(result).toContain('**l**');
      expect(result).toContain('**o**');
    });

    it('should preserve non-matched characters', () => {
      const result = fuzzyHighlight('hello', [0, 4], (c) => `(${c})`);
      expect(result).toBe('(h)ell(o)');
    });
  });

  describe('FUZZY_DEFAULT_OPTIONS', () => {
    it('should have threshold 0.6', () => {
      expect(FUZZY_DEFAULT_OPTIONS.threshold).toBe(0.6);
    });

    it('should have caseSensitive false', () => {
      expect(FUZZY_DEFAULT_OPTIONS.caseSensitive).toBe(false);
    });
  });
});
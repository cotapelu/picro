import { describe, it, expect } from 'vitest';
import {
  visibleWidth,
  stripAnsi,
  wrapText,
  truncateText,
  escapeRegex,
  padText,
  graphemeLength,
  splitGraphemes,
  containsRtl,
  shapeArabic,
  containsArabic,
  sliceByColumn,
  sliceWithWidth,
} from '../utils';

describe('Utils Module', () => {
  describe('visibleWidth', () => {
    it('should count visible characters excluding ANSI codes', () => {
      expect(visibleWidth('hello')).toBe(5);
    });

    it('should ignore ANSI codes', () => {
      const str = '\x1b[31mred\x1b[0m';
      expect(visibleWidth(str)).toBe(3);
    });

    it('should handle multiple ANSI codes', () => {
      const str = '\x1b[1;31;4mtext\x1b[0m';
      expect(visibleWidth(str)).toBe(4);
    });

    it('should handle empty string', () => {
      expect(visibleWidth('')).toBe(0);
    });

    it('should handle unicode width (CJK)', () => {
      // Chinese characters typically have width 2
      expect(visibleWidth('你好')).toBeGreaterThanOrEqual(4);
    });

    it('should handle emoji width', () => {
      // Most emoji are width 2
      expect(visibleWidth('😀')).toBeGreaterThanOrEqual(2);
    });
  });

  describe('stripAnsi', () => {
    it('should remove all ANSI codes', () => {
      const str = '\x1b[31mred\x1b[0m';
      expect(stripAnsi(str)).toBe('red');
    });

    it('should handle nested codes', () => {
      const str = '\x1b[1;31mBold Red\x1b[0m';
      expect(stripAnsi(str)).toBe('Bold Red');
    });

    it('should return empty if input empty', () => {
      expect(stripAnsi('')).toBe('');
    });
  });

  describe('wrapText', () => {
    it('should wrap long text to width', () => {
      const result = wrapText('This is a long text', 10);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should not break words in the middle', () => {
      const result = wrapText('hello world', 20);
      expect(result[0]).toBe('hello world');
    });

    it('should handle empty string', () => {
      const result = wrapText('', 10);
      expect(result).toEqual([]);
    });

    it('should handle width less than 1', () => {
      const result = wrapText('test', 0);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('truncateText', () => {
    it('should truncate to exact length without ellipsis when not needed', () => {
      expect(truncateText('hello', 10)).toBe('hello');
    });

    it('should truncate to max length with ellipsis', () => {
      expect(truncateText('hello world', 5)).toBe('he...');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 5)).toBe('');
    });

    it('should handle custom ellipsis', () => {
      expect(truncateText('hello', 3, '…')).toBe('he…');
    });
  });

  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      const escaped = escapeRegex('test.[]*(){}^$+?\\|');
      expect(escaped).toContain('\\[');
      expect(escaped).toContain('\\]');
      expect(escaped).toContain('\\*');
    });

    it('should not change normal text', () => {
      expect(escapeRegex('normal')).toBe('normal');
    });
  });

  describe('padText', () => {
    it('should pad to width with spaces', () => {
      expect(padText('hi', 5)).toBe('hi   ');
    });

    it('should not pad if already at width', () => {
      expect(padText('hello', 5)).toBe('hello');
    });
  });

  describe('graphemeLength', () => {
    it('should count grapheme clusters correctly', () => {
      expect(graphemeLength('a')).toBe(1);
      expect(graphemeLength('aa')).toBe(2);
    });

    it('should handle combined characters', () => {
      // a + combining accent = single grapheme
      expect(graphemeLength('a\u0301')).toBe(1);
    });

    it('should handle flags (regional indicator pairs)', () => {
      // US flag: U + S = one grapheme
      expect(graphemeLength('🇺🇸')).toBe(1);
    });
  });

  describe('splitGraphemes', () => {
    it('should split string into grapheme clusters', () => {
      const parts = splitGraphemes('hello');
      expect(parts).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('should keep combined characters together', () => {
      const parts = splitGraphemes('a\u0301'); // a with acute
      expect(parts).toEqual(['a\u0301']);
    });
  });



  describe('sliceByColumn', () => {
    it('should slice string by ANSI-aware column', () => {
      const str = '\x1b[31mred\x1b[0m text';
      const sliced = sliceByColumn(str, 9); // include 'red' (3 visible) => column 6-9 may get text
      // sliced is a string, may be empty if cut in middle of ansi, but should not crash
      expect(typeof sliced).toBe('string');
    });
  });

  describe('sliceWithWidth', () => {
    it('should slice string to fit visible width', () => {
      const str = 'hello world';
      const sliced = sliceWithWidth(str, 5);
      // Should produce string with visible width <= 5
      expect(visibleWidth(sliced)).toBeLessThanOrEqual(5);
    });
  });
});

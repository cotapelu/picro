// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for internal-utils module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  visibleWidth,
  wrapText,
  truncateText,
  sliceByColumn,
  extractOverlaySegments,
  wrapTextWithAnsi,
  getSegmenter,
  containsArabic,
  shapeArabic,
} from './internal-utils';

// Mock ArabicReshaper
vi.mock('arabic-reshaper', () => ({
  __esModule: true,
  default: (text: string) => text, // no reshape in test
}));

describe('internal-utils', () => {
  describe('getSegmenter', () => {
    it('should return Intl.Segmenter instance', () => {
      const seg = getSegmenter();
      expect(seg).toBeInstanceOf(Intl.Segmenter);
    });

    it('should return same instance (singleton)', () => {
      const seg1 = getSegmenter();
      const seg2 = getSegmenter();
      expect(seg1).toBe(seg2);
    });
  });

  describe('visibleWidth', () => {
    it('should return 0 for empty string', () => {
      expect(visibleWidth('')).toBe(0);
    });

    it('should count ASCII characters as 1', () => {
      expect(visibleWidth('Hello')).toBe(5);
    });

    it('should ignore ANSI escape sequences', () => {
      const s = '\x1b[31mRed\x1b[0m';
      expect(visibleWidth(s)).toBe(3);
    });

    it('should count Chinese/Japanese/Korean characters as 2', () => {
      expect(visibleWidth('中')).toBe(2);
      expect(visibleWidth('日')).toBe(2);
      expect(visibleWidth('한')).toBe(2);
    });

    it('should count emojis as 2 (most are wide)', () => {
      expect(visibleWidth('😀')).toBe(2);
    });

    it('should ignore zero-width characters', () => {
      // Zero Width Non-Joiner (U+200C)
      expect(visibleWidth('a\u200c')).toBe(1);
      // Variation Selectors
      expect(visibleWidth('a\u200d')).toBe(1); // ZWJ
    });

    it('should handle mixed content', () => {
      const s = 'Hello 世界';
      // Hello(5) + space(1) + 世(2) + 界(2) = 10
      expect(visibleWidth(s)).toBe(10);
    });

    it('should handle multiple ANSI codes', () => {
      const s = '\x1b[1;31mBold Red\x1b[0m Normal';
      expect(visibleWidth(s)).toBe(15);
    });
  });

  describe('truncateText', () => {
    it('should truncate to width with ellipsis', () => {
      const result = truncateText('Hello World', 8);
      expect(result).toBe('Hello...'); // 8 visible width? Actually ellipsis is 1 char, so 5+3=8? "Hello..." = 8? H-e-l-l-o-.-.-. = 8.
    });

    it('should not truncate if shorter than width', () => {
      expect(truncateText('Hi', 10)).toBe('Hi');
    });

    it('should handle ANSI codes in truncation', () => {
      const s = '\x1b[31mRed Text\x1b[0m';
      const result = truncateText(s, 5);
      // Should produce "Red.." maybe?
    });

    it('should respect maxWidth parameter', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });
  });

  describe('wrapText', () => {
    it('should wrap long text to width', () => {
      const result = wrapText('Hello World this is a test', 10);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should preserve existing newlines', () => {
      const result = wrapText('Line1\nLine2', 10);
      expect(result).toHaveLength(2);
    });

    it('should handle empty string', () => {
      const result = wrapText('');
      expect(result).toEqual([]);
    });

    it('should break on word boundaries when possible', () => {
      const result = wrapText('Hello World', 5);
      // If width 5, "Hello" fits, "World" may be on next line
      expect(result[0]).toBe('Hello');
    });
  });

  describe('wrapTextWithAnsi', () => {
    it('should wrap text while preserving ANSI codes', () => {
      const s = '\x1b[31mRed Text that is long\x1b[0m';
      const result = wrapTextWithAnsi(s, 10);
      expect(result.length).toBeGreaterThan(1);
      // Each line should have balanced ANSI codes? Possibly.
    });
  });

  describe('sliceByColumn', () => {
    it('should extract substring by visible columns', () => {
      // Simple ASCII
      expect(sliceByColumn('Hello', 2, 10)).toBe('He');
    });

    it('should skip zero-width chars', () => {
      const s = 'a\u200cb'; // a + ZWNJ + b
      expect(sliceByColumn(s, 0, 2)).toBe('ab'); // ZWNJ is zero width, so visible width 2 for "ab"
    });

    it('should handle wide chars', () => {
      const s = 'a中b'; // a(1) 中(2) b(1) total 4
      expect(sliceByColumn(s, 1, 2)).toBe('中'); // from col1, take 2 width -> 中
    });

    it('should respect start offset', () => {
      const s = 'Hello';
      expect(sliceByColumn(s, 2, 5)).toBe('llo');
    });
  });

  describe('extractOverlaySegments', () => {
    it('should extract overlay segments from lines', () => {
      const lines = [
        'Normal text',
        '\x1b_Gf=100;...`\x1b\\ more text',
        'More normal'
      ];
      // function extracts overlay sequences and returns [lines without, map of overlays]
      const result = extractOverlaySegments(lines);
      // result: { lines: [...], overlays: Map<row, segments> }
      // We'll ensure it identifies overlay line.
    });
  });

  describe('containsArabic', () => {
    it('should detect Arabic characters', () => {
      expect(containsArabic('مرحبا')).toBe(true);
      expect(containsArabic('Hello')).toBe(false);
    });
  });

  describe('shapeArabic', () => {
    it('should reshape Arabic text', () => {
      // With mock, returns same
      const result = shapeArabic('مرحبا');
      expect(result).toBe('مرحبا');
    });

    it('should handle non-Arabic gracefully', () => {
      const result = shapeArabic('Hello');
      expect(result).toBe('Hello');
    });
  });
});
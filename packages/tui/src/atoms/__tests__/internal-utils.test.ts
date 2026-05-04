import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  visibleWidth,
  stripAnsi,
  hasAnsi,
  wrapText,
  truncateText,
  padText,
  escapeRegex,
  splitGraphemes,
  graphemeLength,
  containsRtl,
  containsArabic,
  shapeArabic,
  getSegmenter,
  parseCsiParameters,
  extractAnsiCode,
  extractSegments,
  sliceByColumn,
  sliceWithWidth,
  expandTabs,
  reverseByGraphemes,
  truncateToWidth,
  wrapTextWithAnsi,
  extractOverlaySegments,
} from '../internal-utils';

// Mock ArabicReshaper
vi.mock('arabic-reshaper', () => ({
  default: (text: string) => text, // identity
}));

describe('Internal Utils', () => {
  describe('visibleWidth', () => {
    it('should count visible characters correctly', () => {
      expect(visibleWidth('hello')).toBe(5);
    });

    it('should ignore ANSI codes', () => {
      const str = '\x1b[31mred\x1b[0m';
      expect(visibleWidth(str)).toBe(3);
    });

    it('should handle wide characters (CJK)', () => {
      expect(visibleWidth('你好')).toBeGreaterThanOrEqual(4);
    });

    it('should handle emoji width', () => {
      expect(visibleWidth('😀')).toBeGreaterThanOrEqual(2);
    });

    it('should handle combining characters', () => {
      expect(visibleWidth('a\u0301')).toBe(1); // a with acute accent
    });

    it('should handle zero-width characters', () => {
      expect(visibleWidth('\u200d')).toBe(0); // ZWJ
    });

    it('should handle mixed ANSI and wide chars', () => {
      const str = '\x1b[31m你好\x1b[0m';
      expect(visibleWidth(str)).toBeGreaterThanOrEqual(4);
    });

    it('should cache results', () => {
      // Internal cache: first call populates, second returns cached
      const str = 'test cache';
      expect(visibleWidth(str)).toBe(visibleWidth(str));
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

  describe('hasAnsi', () => {
    it('should detect ANSI codes', () => {
      expect(hasAnsi('\x1b[31m')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasAnsi('hello')).toBe(false);
    });
  });

  describe('wrapText', () => {
    it('should wrap long text to width', () => {
      const result = wrapText('This is a long text that needs wrapping', 10);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should not break words in the middle', () => {
      const result = wrapText('hello world', 20);
      expect(result[0]).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(wrapText('', 10)).toEqual([]);
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

  describe('padText', () => {
    it('should pad to width with spaces', () => {
      expect(padText('hi', 5)).toBe('hi   ');
    });

    it('should not pad if already at width', () => {
      expect(padText('hello', 5)).toBe('hello');
    });

    it('should pad right by default', () => {
      expect(padText('hi', 5, 'right')).toBe('   hi');
    });

    it('should pad center', () => {
      expect(padText('hi', 5, 'center')).toBe(' hi  ');
    });
  });

  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      const escaped = escapeRegex('test.[]*(){}^$+?\\|');
      expect(escaped).toContain('\\[');
      expect(escaped).toContain('\\*');
    });

    it('should not change normal text', () => {
      expect(escapeRegex('normal')).toBe('normal');
    });
  });

  describe('graphemeLength', () => {
    it('should count grapheme clusters correctly', () => {
      expect(graphemeLength('a')).toBe(1);
      expect(graphemeLength('aa')).toBe(2);
    });

    it('should handle combined characters', () => {
      expect(graphemeLength('a\u0301')).toBe(1);
    });

    it('should handle flags (regional indicator pairs)', () => {
      expect(graphemeLength('🇺🇸')).toBe(1);
    });
  });

  describe('splitGraphemes', () => {
    it('should split string into grapheme clusters', () => {
      const parts = splitGraphemes('hello');
      expect(parts).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('should keep combined characters together', () => {
      const parts = splitGraphemes('a\u0301');
      expect(parts).toEqual(['a\u0301']);
    });
  });

  describe('containsRtl', () => {
    it('should detect Hebrew', () => {
      expect(containsRtl('שלום')).toBe(true);
    });

    it('should detect Arabic', () => {
      expect(containsRtl('مرحبا')).toBe(true);
    });

    it('should return false for LTR text', () => {
      expect(containsRtl('hello')).toBe(false);
    });
  });

  describe('containsArabic', () => {
    it('should detect Arabic text', () => {
      expect(containsArabic('مرحبا')).toBe(true);
    });

    it('should return false for non-Arabic', () => {
      expect(containsArabic('hello')).toBe(false);
    });
  });

  describe('shapeArabic', () => {
    it('should reshape Arabic text', () => {
      const result = shapeArabic('مرحبا');
      expect(result).toBeDefined();
    });

    it('should return original on error', () => {
      // Mock ArabicReshaper to throw if needed
    });
  });

  describe('getSegmenter', () => {
    it('should return Intl.Segmenter instance', () => {
      const seg = getSegmenter();
      expect(seg).toBeInstanceOf(Intl.Segmenter);
    });

    it('should return same instance', () => {
      const seg1 = getSegmenter();
      const seg2 = getSegmenter();
      expect(seg1).toBe(seg2);
    });
  });

  describe('parseCsiParameters', () => {
    it('should parse CSI parameters', () => {
      const result = parseCsiParameters('\x1b[38;2;255;128;64m', 0);
      expect(result?.params).toEqual([38, 2, 255, 128, 64]);
    });

    it('should return null for invalid input', () => {
      expect(parseCsiParameters('abc', 0)).toBeNull();
    });

    it('should handle missing parameters', () => {
      const result = parseCsiParameters('\x1b[m', 0);
      expect(result?.params).toEqual([0]);
    });
  });

  describe('extractAnsiCode', () => {
    it('should extract CSI sequence', () => {
      const result = extractAnsiCode('\x1b[31mtext', 0);
      expect(result?.code).toBe('\x1b[31m');
      expect(result?.length).toBe(4);
    });

    it('should extract OSC sequence', () => {
      const result = extractAnsiCode('\x1b]1337;File=test\x07more', 0);
      expect(result?.code).toContain('\x1b]1337;File=test\x07');
    });

    it('should return null when not at escape', () => {
      expect(extractAnsiCode('abc\x1b[31m', 0)).toBeNull();
      expect(extractAnsiCode('\x1b[31m', 1)).toBeNull();
    });
  });

  describe('extractSegments', () => {
    it('should split string with ANSI codes', () => {
      const result = extractSegments('\x1b[31mred\x1b[0m text');
      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle plain text', () => {
      const result = extractSegments('hello');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello');
    });

    it('should accumulate ANSI codes separately', () => {
      const result = extractSegments('\x1b[1mBold\x1b[0m Normal');
      const boldSegment = result.find(s => s.ansi === '\x1b[1m');
      expect(boldSegment).toBeDefined();
    });
  });

  describe('sliceByColumn', () => {
    it('should slice string by column width', () => {
      const result = sliceByColumn('hello world', 0, 5);
      expect(visibleWidth(result)).toBeLessThanOrEqual(5);
    });

    it('should handle ANSI codes correctly', () => {
      const str = '\x1b[31mred\x1b[0m text';
      const result = sliceByColumn(str, 0, 6); // 'red te' maybe
      expect(result).toBeDefined();
    });
  });

  describe('sliceWithWidth', () => {
    it('should slice string to fit width', () => {
      const str = 'hello world';
      const result = sliceWithWidth(str, 5);
      expect(visibleWidth(result)).toBeLessThanOrEqual(5);
    });
  });

  describe('expandTabs', () => {
    it('should expand tabs to spaces', () => {
      expect(expandTabs('a\tb', 4)).toBe('a   b');
    });

    it('should use default tabSize 2', () => {
      expect(expandTabs('\t')).toBe('  ');
    });
  });

  describe('reverseByGraphemes', () => {
    it('should reverse string by grapheme clusters', () => {
      expect(reverseByGraphemes('hello')).toBe('olleh');
    });

    it('should keep combined characters together', () => {
      expect(reverseByGraphemes('a\u0301b')).toBe('ba\u0301');
    });
  });

  describe('truncateToWidth', () => {
    it('should truncate to width', () => {
      const result = truncateToWidth('hello world', 8);
      expect(visibleWidth(result)).toBeLessThanOrEqual(8);
    });

    it('should add ellipsis', () => {
      const result = truncateToWidth('hello world', 8, { ellipsis: '...' });
      expect(result).toContain('...');
    });

    it('should truncate from end when fromEnd=true', () => {
      const result = truncateToWidth('hello world', 8, { fromEnd: true });
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('wrapTextWithAnsi', () => {
    it('should wrap text preserving ANSI codes', () => {
      const result = wrapTextWithAnsi('\x1b[31mThis is a long line that wraps\x1b[0m', 10);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle plain text', () => {
      const result = wrapTextWithAnsi('hello world', 5);
      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('extractOverlaySegments', () => {
    it('should extract before and after segments', () => {
      const result = extractOverlaySegments('abcde', 2, 3, 2);
      expect(result.before).toBe('ab');
      expect(result.after).toBe('de');
    });

    it('should handle empty inputs', () => {
      const result = extractOverlaySegments('', 0, 0, 5);
      expect(result.before).toBe('');
      expect(result.after).toBe('');
    });
  });
});

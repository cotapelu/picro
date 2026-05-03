import { describe, it, expect, beforeEach } from 'vitest';
import { Text } from '../text.js';

function createContext(width = 80, height = 24) {
  return { width, height };
}

describe('Text Component', () => {
  describe('Basic Rendering', () => {
    it('should render plain text', () => {
      const text = new Text('Hello World');
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result).toContain('Hello World');
    });

    it('should handle empty string', () => {
      const text = new Text('');
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result).toEqual([]);
    });

    it('should handle newlines', () => {
      const text = new Text('Line1\nLine2\nLine3');
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result).toContain('Line1');
      expect(result).toContain('Line2');
      expect(result).toContain('Line3');
    });
  });

  describe('Text Wrapping', () => {
    it('should wrap long text when wrap=true', () => {
      const longText = 'This is a very long text that should be wrapped to multiple lines';
      const text = new Text(longText, { wrap: true });
      const ctx = createContext(20, 24);
      const result = text.draw(ctx);

      // Should have multiple lines
      expect(result.length).toBeGreaterThan(1);
      // Each line should be <= width
      result.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });

    it('should not wrap when wrap=false', () => {
      const longText = 'This is a very long text that should not be wrapped';
      const text = new Text(longText, { wrap: false, truncate: false });
      const ctx = createContext(20, 24);
      const result = text.draw(ctx);

      // Should be single line (may exceed width)
      expect(result.length).toBe(1);
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long text when truncate=true', () => {
      const longText = 'This is a very long text that will be truncated';
      const text = new Text(longText, { truncate: true, wrap: false });
      const ctx = createContext(20, 24);
      const result = text.draw(ctx);

      expect(result.length).toBe(1);
      expect(result[0].length).toBeLessThanOrEqual(20);
    });
  });

  describe('Alignment', () => {
    it('should align center', () => {
      const text = new Text('Centered', { align: 'center' });
      const ctx = createContext(20, 24);
      const result = text.draw(ctx);

      const line = result[0];
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      const textStr = 'Centered';
      // Center should have padding on both sides
      expect(cleanLine.startsWith(' ')).toBe(true);
      expect(cleanLine.endsWith(' ')).toBe(true);
      // Text should be roughly centered: leftPad approx rightPad
      const leftPad = cleanLine.indexOf(textStr);
      const rightPad = cleanLine.length - (leftPad + textStr.length);
      expect(Math.abs(leftPad - rightPad)).toBeLessThanOrEqual(1);
    });

    it('should align right', () => {
      const text = new Text('Right', { align: 'right' });
      const ctx = createContext(20, 24);
      const result = text.draw(ctx);

      const line = result[0];
      const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
      expect(visible.trimStart().startsWith('Right')).toBe(true);
      expect(visible.length).toBeLessThanOrEqual(20);
    });

    it('should align left (default)', () => {
      const text = new Text('Left');
      const ctx = createContext(20, 24);
      const result = text.draw(ctx);

      const line = result[0];
      expect(line.startsWith('Left')).toBe(true);
    });
  });

  describe('Styling', () => {
    it('should apply bold style', () => {
      const text = new Text('Bold', { bold: true });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('\x1b[1m');
      expect(result[0]).toContain('\x1b[0m');
    });

    it('should apply dim style', () => {
      const text = new Text('Dim', { dim: true });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('\x1b[2m');
    });

    it('should apply underline style', () => {
      const text = new Text('Underline', { underline: true });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('\x1b[4m');
    });

    it('should apply foreground color', () => {
      const text = new Text('Red', { color: 'red' });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('\x1b[31m');
    });

    it('should apply background color', () => {
      const text = new Text('Blue BG', { bgColor: 'blue' });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('\x1b[44m');
    });

    it('should combine multiple styles', () => {
      const text = new Text('Styled', { bold: true, color: 'green', underline: true });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      // Order of codes may vary, check each code number exists in the escape sequence
      const ansiSeq = result[0].match(/\x1b\[[0-9;]*m/)?.[0] || '';
      expect(ansiSeq).toMatch(/1/); // bold
      expect(ansiSeq).toMatch(/32/); // green
      expect(ansiSeq).toMatch(/4/); // underline
    });

    it('should handle bright colors', () => {
      const text = new Text('Bright', { color: 'brightRed' });
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('\x1b[91m');
    });
  });

  describe('Caching', () => {
    it('should cache rendered output when context width unchanged', () => {
      const text = new Text('Cached');
      const ctx = createContext(80, 24);

      const result1 = text.draw(ctx);
      const result2 = text.draw(ctx);

      expect(result1).toBe(result2);
    });

    it('should invalidate cache when content changes', () => {
      const text = new Text('Initial');
      const ctx = createContext(80, 24);

      text.draw(ctx);
      text.setContent('Changed');

      const result = text.draw(ctx);
      expect(result[0]).toContain('Changed');
    });

    it('should invalidate cache when width changes', () => {
      const text = new Text('Test', { wrap: true });
      const ctx1 = createContext(80, 24);
      text.draw(ctx1);

      const ctx2 = createContext(20, 24);
      const result = text.draw(ctx2);

      // Should recalc for new width
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('describe()', () => {
    it('should return plain text content for accessibility', () => {
      const text = new Text('Accessible content');
      expect(text.describe()).toBe('Accessible content');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero width', () => {
      const text = new Text('Test');
      const ctx = createContext(0, 24);
      const result = text.draw(ctx);

      // With width 0, contentWidth becomes at least 1
      expect(result.some(l => l.includes('Test'))).toBe(true);
    });

    it('should handle very long single word with no wrap/truncate', () => {
      const text = new Text('Supercalifragilisticexpialidocious', { wrap: false, truncate: false });
      const ctx = createContext(10, 24);
      const result = text.draw(ctx);

      expect(result.length).toBe(1);
      // Line will be longer than width
    });

    it('should handle tabs', () => {
      const text = new Text('A\tB\tC');
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      // Tabs are preserved
      expect(result[0]).toContain('A\tB\tC');
    });

    it('should handle special characters', () => {
      const text = new Text('✓ ❌ ★ ♥ ♻');
      const ctx = createContext(80, 24);
      const result = text.draw(ctx);

      expect(result[0]).toContain('✓');
      expect(result[0]).toContain('❌');
    });

    it('should handle ANSI codes in content gracefully', () => {
      const text = new Text('\x1b[31mRed\x1b[0m Normal');
      const ctx = createContext(80, 24);
      // Should not throw
      const result = text.draw(ctx);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

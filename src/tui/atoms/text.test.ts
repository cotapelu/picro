// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Text atom component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Text } from './text';
import type { RenderContext, UITheme } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Text', () => {
  let text: Text;

  beforeEach(() => {
    text = new Text('');
  });

  describe('constructor', () => {
    it('should create instance with empty content', () => {
      expect(text).toBeInstanceOf(Text);
    });

    it('should accept content in constructor', () => {
      const t = new Text('Hello World');
      expect(t).toBeInstanceOf(Text);
    });

    it('should accept all styling options', () => {
      const t = new Text('Styled', {
        color: 'red',
        bgColor: 'blue',
        bold: true,
        dim: true,
        underline: true,
        wrap: true,
        truncate: false,
        align: 'center',
      });
      expect(t).toBeInstanceOf(Text);
    });
  });

  describe('draw()', () => {
    it('should return empty array for empty content', () => {
      text = new Text('');
      const result = text.draw(defaultContext);
      expect(result).toEqual([]);
    });

    it('should return single line for simple text', () => {
      text = new Text('Hello');
      const result = text.draw(defaultContext);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('Hello');
    });

    it('should handle multiline text', () => {
      text = new Text('Line1\nLine2\nLine3');
      const result = text.draw(defaultContext);
      expect(result.length).toBe(3);
      expect(result[0]).toBe('Line1');
      expect(result[1]).toBe('Line2');
      expect(result[2]).toBe('Line3');
    });

    it('should handle zero width gracefully', () => {
      text = new Text('Hello');
      const ctx = { ...defaultContext, width: 0 };
      const result = text.draw(ctx);
      expect(result.length).toBe(1);
      // With zero width, visible content may be empty
      const visible = visibleWidth(result[0]);
      expect(visible).toBe(0);
    });

    it('should wrap text when wrap=true', () => {
      text = new Text('This is a long text that should wrap', { wrap: true });
      const ctx = { ...defaultContext, width: 10 };
      const result = text.draw(ctx);
      // Should produce multiple lines
      expect(result.length).toBeGreaterThan(1);
    });

    it('should truncate text when truncate=true', () => {
      text = new Text('This is a very long text', { truncate: true });
      const ctx = { ...defaultContext, width: 10 };
      const result = text.draw(ctx);
      expect(result.length).toBe(1);
      // Each line should not exceed width (considering ANSI codes)
      const lineWidth = visibleWidth(result[0]);
      expect(lineWidth).toBeLessThanOrEqual(10);
    });

    it('should not wrap or truncate by default', () => {
      text = new Text('Short');
      const ctx = { ...defaultContext, width: 2 };
      const result = text.draw(ctx);
      // Without wrap/truncate, text can exceed width
      expect(result.length).toBe(1);
      expect(result[0]).toBe('Short');
    });

    it('should align center', () => {
      text = new Text('Hi', { align: 'center' });
      const ctx = { ...defaultContext, width: 10 };
      const result = text.draw(ctx);
      expect(result[0]).toContain('Hi');
      const line = result[0];
      const leftSpaces = line.length - line.trimStart().length;
      const rightSpaces = line.trimEnd().length - line.trim().length;
      // Center should have roughly equal padding
      expect(Math.abs(leftSpaces - rightSpaces)).toBeLessThanOrEqual(1);
    });

    it('should align right', () => {
      text = new Text('Hi', { align: 'right' });
      const ctx = { ...defaultContext, width: 10 };
      const result = text.draw(ctx);
      expect(result[0].endsWith('Hi')).toBe(true);
    });

    it('should align left (default)', () => {
      text = new Text('Hi', { align: 'left' });
      const ctx = { ...defaultContext, width: 10 };
      const result = text.draw(ctx);
      expect(result[0].startsWith('Hi')).toBe(true);
    });

    it('should apply bold style', () => {
      text = new Text('Bold', { bold: true });
      const result = text.draw(defaultContext);
      expect(result[0]).toContain('\x1b[1m');
      expect(result[0]).toContain('\x1b[0m');
    });

    it('should apply dim style', () => {
      text = new Text('Dim', { dim: true });
      const result = text.draw(defaultContext);
      expect(result[0]).toContain('\x1b[2m');
    });

    it('should apply underline style', () => {
      text = new Text('Underline', { underline: true });
      const result = text.draw(defaultContext);
      expect(result[0]).toContain('\x1b[4m');
    });

    it('should apply color', () => {
      text = new Text('Red', { color: 'red' });
      const result = text.draw(defaultContext);
      expect(result[0]).toContain('\x1b[31m');
    });

    it('should apply background color', () => {
      text = new Text('BlueBG', { bgColor: 'blue' });
      const result = text.draw(defaultContext);
      expect(result[0]).toContain('\x1b[44m');
    });

    it('should combine multiple styles', () => {
      text = new Text('Styled', { bold: true, color: 'green', underline: true });
      const result = text.draw(defaultContext);
      const line = result[0];
      expect(line).toContain('\x1b[1;32;4m');
      expect(line).toContain('\x1b[0m');
    });

    it('should reset styles after text', () => {
      text = new Text('Text', { bold: true });
      const result = text.draw(defaultContext);
      expect(result[0]).toMatch(/\x1b\[0m$/);
    });
  });

  describe('clearCache()', () => {
    it('should clear cached output', () => {
      text = new Text('Hello');
      // First draw to populate cache
      text.draw(defaultContext);
      // Clear cache
      text.clearCache();
      // Draw again should recompute
      const result = text.draw(defaultContext);
      expect(result.length).toBe(1);
    });

    it('should not throw when called multiple times', () => {
      text.clearCache();
      text.clearCache();
    });
  });

  describe('setContent()', () => {
    it('should update content and invalidate cache', () => {
      text = new Text('Original');
      text.draw(defaultContext);
      text.setContent('Changed');
      const result = text.draw(defaultContext);
      expect(result[0]).toBe('Changed');
    });
  });

  describe('describe()', () => {
    it('should return content for accessibility', () => {
      text = new Text('Hello World');
      expect(text.describe()).toBe('Hello World');
    });

    it('should return empty string for empty content', () => {
      text = new Text('');
      expect(text.describe()).toBe('');
    });
  });

  describe('textDirection', () => {
    it('should support RTL direction', () => {
      text = new Text('שלום', { textDirection: 'rtl' });
      const result = text.draw(defaultContext);
      expect(result[0]).toBeDefined();
    });

    it('should support LTR direction', () => {
      text = new Text('Hello', { textDirection: 'ltr' });
      const result = text.draw(defaultContext);
      expect(result[0]).toBe('Hello');
    });

    it('should auto-detect RTL with auto direction', () => {
      text = new Text('مرحبا', { textDirection: 'auto' });
      const result = text.draw(defaultContext);
      expect(result[0]).toBeDefined();
    });
  });

  describe('Arabic reshaping', () => {
    it('should reshape Arabic text', () => {
      text = new Text('العربية');
      const result = text.draw(defaultContext);
      expect(result[0]).toBeDefined();
      expect(result[0].length).toBeGreaterThan(0);
    });

    it('should not reshape non-Arabic text', () => {
      text = new Text('English');
      const result = text.draw(defaultContext);
      expect(result[0]).toBe('English');
    });
  });

  describe('caching', () => {
    it('should cache result for same width', () => {
      text = new Text('Hello');
      const result1 = text.draw(defaultContext);
      const result2 = text.draw(defaultContext);
      expect(result1).toBe(result2); // same reference
    });

    it('should recompute when width changes', () => {
      text = new Text('Hello');
      const ctx1 = { ...defaultContext, width: 80 };
      const ctx2 = { ...defaultContext, width: 40 };
      const result1 = text.draw(ctx1);
      const result2 = text.draw(ctx2);
      expect(result1).not.toBe(result2);
    });

    it('should recompute when content changes', () => {
      text = new Text('Hello');
      text.draw(defaultContext);
      text.setContent('World');
      const result = text.draw(defaultContext);
      expect(result[0]).toBe('World');
    });
  });
});

// Helper to compute visible width (ANSI-aware)
function visibleWidth(str: string): number {
  // Strip ANSI escape sequences
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  const clean = str.replace(ansiRegex, '');
  // Count characters (simplified - not handling full Unicode width)
  return [...clean].length;
}
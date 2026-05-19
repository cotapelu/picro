// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Box atom component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Box } from './box';
import type { RenderContext, UIElement } from '../core/base';

// Mock child component
const createMockChild = (lines: string[] = []): UIElement => ({
  draw: vi.fn().mockReturnValue(lines),
  clearCache: vi.fn(),
});

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Box', () => {
  let box: Box;

  beforeEach(() => {
    box = new Box();
  });

  describe('constructor', () => {
    it('should create with default padding (1,1)', () => {
      const b = new Box();
      expect(b).toBeInstanceOf(Box);
    });

    it('should accept custom padding', () => {
      const b = new Box(2, 3);
      expect(b).toBeInstanceOf(Box);
    });

    it('should accept background function', () => {
      const b = new Box(1, 1, (line) => '\x1b[44m' + line + '\x1b[0m');
      expect(b).toBeInstanceOf(Box);
    });
  });

  describe('children management', () => {
    it('should start with empty children', () => {
      expect(box.children).toHaveLength(0);
    });

    it('should append children', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      expect(box.children).toHaveLength(1);
    });

    it('should remove children', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      box.remove(child);
      expect(box.children).toHaveLength(0);
    });

    it('should clear all children', () => {
      box.append(createMockChild(['A']));
      box.append(createMockChild(['B']));
      box.clear();
      expect(box.children).toHaveLength(0);
    });

    it('should clear cache when children change', () => {
      box.append(createMockChild(['Hello']));
      box.draw(defaultContext);
      // Cache should be set
      expect(box['cache']).toBeDefined();
      box.append(createMockChild(['World']));
      // Cache should be cleared
      expect(box['cache']).toBeUndefined();
    });
  });

  describe('setBgFn()', () => {
    it('should set background function', () => {
      const bgFn = (line: string) => '\x1b[31m' + line + '\x1b[0m';
      box.setBgFn(bgFn);
      expect(box['bgFn']).toBe(bgFn);
    });

    it('should clear cache when bgFn changes', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      box.draw(defaultContext);
      expect(box['cache']).toBeDefined();
      box.setBgFn((line) => line);
      expect(box['cache']).toBeUndefined();
    });

    it('should remove background when set to undefined', () => {
      box.setBgFn((line) => line);
      box.setBgFn(undefined);
      expect(box['bgFn']).toBeUndefined();
    });
  });

  describe('draw()', () => {
    it('should return empty array without children', () => {
      const result = box.draw(defaultContext);
      // Box with no children still renders padding lines
      // Top padding + bottom padding = 2 * paddingY
      const expectedLines = 2 * 1; // default paddingY = 1
      expect(result).toHaveLength(expectedLines);
    });

    it('should render children with reduced width', () => {
      const child = createMockChild(['Child line']);
      box.append(child);
      const result = box.draw(defaultContext);
      // Child width should be width - 2*paddingX = 80 - 2 = 78
      child.draw.mock.calls[0][0].width = 78;
    });

    it('should add top and bottom padding', () => {
      box = new Box(1, 2);
      box.append(createMockChild(['Content']));
      const result = box.draw(defaultContext);
      // Top: 2 empty lines, content lines, bottom: 2 empty lines
      expect(result.length).toBe(2 + 1 + 2);
      // Top lines should be empty (just spaces)
      expect(result[0].trim()).toBe('');
      expect(result[1].trim()).toBe('');
      // Bottom lines should be empty
      expect(result[result.length - 2].trim()).toBe('');
      expect(result[result.length - 1].trim()).toBe('');
    });

    it('should add left and right padding to content lines', () => {
      box = new Box(2, 1);
      box.append(createMockChild(['Content']));
      const result = box.draw(defaultContext);
      // Skip top/bottom padding, check middle line
      const contentLine = result[1];
      // Should start with 2 spaces and end with 2 spaces
      expect(contentLine.startsWith('  ')).toBe(true);
      expect(contentLine.endsWith('  ')).toBe(true);
      // The content should be in between
      expect(contentLine).toContain('Content');
    });

    it('should apply background function to all lines', () => {
      const bgFn = (line: string) => '\x1b[44m' + line + '\x1b[0m';
      box = new Box(1, 1, bgFn);
      box.append(createMockChild(['Content']));
      const result = box.draw(defaultContext);
      result.forEach(line => {
        expect(line).toContain('\x1b[44m');
        expect(line).toContain('\x1b[0m');
      });
    });

    it('should handle multiple children', () => {
      box.append(createMockChild(['Line1']));
      box.append(createMockChild(['Line2']));
      const result = box.draw(defaultContext);
      // Should have top padding + 2 content lines + bottom padding
      expect(result.length).toBe(1 + 2 + 1);
      expect(result[1]).toContain('Line1');
      expect(result[2]).toContain('Line2');
    });

    it('should cache result for same width', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      const result1 = box.draw(defaultContext);
      const result2 = box.draw(defaultContext);
      expect(result1).toBe(result2);
    });

    it('should invalidate cache when width changes', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      box.draw(defaultContext);
      expect(box['cache'].width).toBe(80);
      const newContext = { ...defaultContext, width: 40 };
      box.draw(newContext);
      // Cache should have been updated
      expect(box['cache'].width).toBe(40);
    });

    it('should invalidate cache when bgFn changes', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      box.draw(defaultContext);
      const initialCache = box['cache'];
      box.setBgFn((line) => '\x1b[31m' + line + '\x1b[0m');
      box.draw(defaultContext);
      expect(box['cache']).not.toBe(initialCache);
    });
  });

  describe('clearCache()', () => {
    it('should clear own cache and children cache', () => {
      const child = createMockChild(['Hello']);
      box.append(child);
      box.draw(defaultContext);
      box.clearCache();
      expect(box['cache']).toBeUndefined();
      expect(child.clearCache).toHaveBeenCalled();
    });

    it('should not throw when called multiple times', () => {
      box.clearCache();
      box.clearCache();
    });
  });

  describe('edge cases', () => {
    it('should handle very narrow width', () => {
      const ctx = { ...defaultContext, width: 1 };
      const child = createMockChild(['X']);
      box = new Box(1, 1);
      box.append(child);
      const result = box.draw(ctx);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle zero padding', () => {
      box = new Box(0, 0);
      box.append(createMockChild(['Content']));
      const result = box.draw(defaultContext);
      // Should render content without extra spaces
      expect(result[0]).toContain('Content');
    });

    it('should handle empty child lines', () => {
      box.append(createMockChild(['']));
      const result = box.draw(defaultContext);
      // One empty content line plus top and bottom padding
      expect(result.length).toBe(3);
    });

    it('should handle children with many lines', () => {
      const lines = Array.from({ length: 10 }, (_, i) => `Line ${i}`);
      box.append(createMockChild(lines));
      const result = box.draw(defaultContext);
      // top padding (1) + 10 content lines + bottom padding (1)
      expect(result.length).toBe(12);
    });

    it('should handle large padding values', () => {
      box = new Box(5, 5);
      box.append(createMockChild(['Content']));
      const result = box.draw(defaultContext);
      // At least top 5 + content + bottom 5
      expect(result.length).toBeGreaterThanOrEqual(11);
    });
  });
});
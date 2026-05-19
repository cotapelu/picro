// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for VisualTruncate atom
 */

import { describe, it, expect } from 'vitest';
import { VisualTruncate } from './visual-truncate';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('VisualTruncate', () => {
  describe('constructor', () => {
    it('should create with text and maxWidth', () => {
      const vt = new VisualTruncate({ text: 'Hello', maxWidth: 10 });
      expect(vt['text']).toBe('Hello');
      expect(vt['maxWidth']).toBe(10);
    });
  });

  describe('draw()', () => {
    it('should return text as-is if within maxWidth', () => {
      const vt = new VisualTruncate({ text: 'Hi', maxWidth: 10 });
      const result = vt.draw(defaultContext);
      expect(result).toEqual(['Hi']);
    });

    it('should truncate and add ellipsis if exceeding maxWidth', () => {
      const vt = new VisualTruncate({ text: 'Hello World', maxWidth: 8 });
      const result = vt.draw(defaultContext);
      expect(result[0]).toContain('...');
      expect(result[0].length).toBeLessThanOrEqual(8);
    });

    it('should respect context.width if smaller than maxWidth', () => {
      const vt = new VisualTruncate({ text: 'Hello World', maxWidth: 100 });
      const result = vt.draw({ ...defaultContext, width: 5 });
      expect(result[0].length).toBeLessThanOrEqual(5);
    });

    it('should handle wide characters', () => {
      const vt = new VisualTruncate({ text: '中', maxWidth: 1 }); // wide char width 2
      const result = vt.draw(defaultContext);
      // With maxWidth 1 < 2, it will truncate entirely maybe empty + ...
      expect(result[0]).toBe('...');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const vt = new VisualTruncate({ text: 'A', maxWidth: 5 });
      expect(() => vt.clearCache()).not.toThrow();
    });
  });
});
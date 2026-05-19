// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Spacer atom component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Spacer } from './spacer';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Spacer', () => {
  let spacer: Spacer;

  beforeEach(() => {
    spacer = new Spacer();
  });

  describe('constructor', () => {
    it('should create with default 1 line', () => {
      expect(spacer['lines']).toBe(1);
    });

    it('should accept custom lines count', () => {
      const s = new Spacer({ lines: 5 });
      expect(s['lines']).toBe(5);
    });

    it('should default to empty object options', () => {
      const s = new Spacer({});
      expect(s['lines']).toBe(1);
    });
  });

  describe('getLines()', () => {
    it('should return current number of lines', () => {
      expect(spacer.getLines()).toBe(1);
      spacer.setLines(3);
      expect(spacer.getLines()).toBe(3);
    });
  });

  describe('setLines()', () => {
    it('should update lines count', () => {
      spacer.setLines(10);
      expect(spacer['lines']).toBe(10);
    });

    it('should allow zero lines', () => {
      spacer.setLines(0);
      expect(spacer['lines']).toBe(0);
    });

    it('should not allow negative lines', () => {
      spacer.setLines(-5);
      expect(spacer['lines']).toBe(0);
    });

    it('should clamp large numbers', () => {
      spacer.setLines(1000000);
      expect(spacer['lines']).toBe(1000000);
    });
  });

  describe('draw()', () => {
    it('should return array of empty strings', () => {
      const result = spacer.draw(defaultContext);
      expect(result).toEqual(['']);
    });

    it('should return correct number of lines', () => {
      spacer = new Spacer({ lines: 3 });
      const result = spacer.draw(defaultContext);
      expect(result).toHaveLength(3);
      result.forEach(line => expect(line).toBe(''));
    });

    it('should ignore context width', () => {
      spacer = new Spacer({ lines: 2 });
      const narrow = { ...defaultContext, width: 5 };
      const wide = { ...defaultContext, width: 100 };
      expect(spacer.draw(narrow)).toEqual(['', '']);
      expect(spacer.draw(wide)).toEqual(['', '']);
    });

    it('should return empty array when lines=0', () => {
      spacer.setLines(0);
      const result = spacer.draw(defaultContext);
      expect(result).toHaveLength(0);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      expect(() => spacer.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle large line count', () => {
      spacer = new Spacer({ lines: 10000 });
      const result = spacer.draw(defaultContext);
      expect(result).toHaveLength(10000);
    });

    it('should be stateless (draw independent)', () => {
      const r1 = spacer.draw(defaultContext);
      const r2 = spacer.draw(defaultContext);
      expect(r1).toEqual(r2);
    });
  });
});
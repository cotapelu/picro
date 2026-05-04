import { describe, it, expect } from 'vitest';
import { DebugOverlay } from '../debug-overlay';
import type { RenderContext } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('DebugOverlay', () => {
  describe('Constructor', () => {
    it('should create instance with empty data', () => {
      const overlay = new DebugOverlay();
      expect(overlay).toBeInstanceOf(DebugOverlay);
    });
  });

  describe('setData', () => {
    it('should set data object', () => {
      const overlay = new DebugOverlay();
      overlay.setData({ fps: '60', entities: '100' });
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result[0]).toContain('fps: 60');
    });

    it('should replace existing data', () => {
      const overlay = new DebugOverlay();
      overlay.setData({ a: '1' });
      overlay.setData({ b: '2' });
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result[0]).toContain('b: 2');
      expect(result.some(l => l.includes('a'))).toBe(false);
    });

    it('should handle empty object', () => {
      const overlay = new DebugOverlay();
      overlay.setData({});
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result).toEqual([]);
    });

    it('should accept various data types as strings', () => {
      const overlay = new DebugOverlay();
      overlay.setData({ count: '42', flag: 'true', ratio: '0.5' });
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result).toHaveLength(3);
    });
  });

  describe('draw', () => {
    const overlay = new DebugOverlay();

    beforeEach(() => {
      overlay.setData({ key: 'value' });
    });

    it('should return array of lines', () => {
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should format each entry as "key: value"', () => {
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result[0]).toBe('key: value');
    });

    it('should order entries by object keys order', () => {
      overlay.setData({ z: 'last', a: 'first' });
      const ctx = createContext();
      const result = overlay.draw(ctx);
      // In JS, object keys order: numeric first, then string insertion order
      expect(result[0]).toBe('z: last');
      expect(result[1]).toBe('a: first');
    });

    it('should truncate lines longer than width', () => {
      overlay.setData({ long: 'a'.repeat(100) });
      const ctx = createContext(50, 24);
      const result = overlay.draw(ctx);
      expect(result[0].length).toBeLessThanOrEqual(50);
    });

    it('should not truncate lines shorter than width', () => {
      overlay.setData({ short: 'hi' });
      const ctx = createContext(80, 24);
      const result = overlay.draw(ctx);
      expect(result[0].length).toBe(8); // "short: hi"
    });

    it('should handle empty data', () => {
      overlay.setData({});
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result).toEqual([]);
    });

    it('should handle special characters in values', () => {
      overlay.setData({ path: '/home/user/file.txt' });
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result[0]).toContain('/home/user/file.txt');
    });

    it('should handle numeric keys', () => {
      overlay.setData({ 1: 'one', 2: 'two' });
      const ctx = createContext();
      const result = overlay.draw(ctx);
      expect(result.some(l => l.includes('1: one'))).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should be callable without error', () => {
      const overlay = new DebugOverlay();
      expect(() => overlay.clearCache()).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with realistic debug data', () => {
      const overlay = new DebugOverlay();
      overlay.setData({
        'FPS': '60',
        'Entities': '1,234',
        'Memory': '45.6 MB',
        'Position': 'x:100 y:200',
      });
      const ctx = createContext(120, 30);
      const result = overlay.draw(ctx);
      expect(result).toHaveLength(4);
      expect(result[0]).toContain('FPS: 60');
      expect(result[3]).toContain('Position:');
    });

    it('should handle narrow terminal width', () => {
      const overlay = new DebugOverlay();
      overlay.setData({
        'Very Long Key Name That Exceeds Width': 'value',
      });
      const ctx = createContext(20, 24);
      const result = overlay.draw(ctx);
      expect(result[0].length).toBeLessThanOrEqual(20);
    });
  });
});

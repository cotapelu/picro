import { describe, it, expect } from 'vitest';
import { Box } from '../src/atoms/box';
import { Text } from '../src/atoms/text';
import type { RenderContext } from '../src/atoms/base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Box Component', () => {
  describe('Basic rendering', () => {
    it('should render children with padding', () => {
      const box = new Box(1, 1);
      box.append(new Text('Hello'));
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result.some(l => l.includes('Hello'))).toBe(true);
    });

    it('should apply horizontal padding', () => {
      const box = new Box(2, 0);
      box.append(new Text('X'));
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      const line = result.find(l => l.includes('X'));
      expect(line?.startsWith('  ')).toBe(true);
    });

    it('should apply vertical padding', () => {
      const box = new Box(0, 2);
      box.append(new Text('Content'));
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      // Should have empty lines before content (paddingY)
      const firstContentLineIdx = result.findIndex(l => l.includes('Content'));
      expect(firstContentLineIdx).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Background function', () => {
    it('should apply background to each line', () => {
      const box = new Box(0, 0, (text) => `\x1b[41m${text}\x1b[0m`);
      box.append(new Text('Test'));
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result.some(l => l.includes('\x1b[41m'))).toBe(true);
    });
  });

  describe('Append/Remove', () => {
    it('should append multiple children', () => {
      const box = new Box(0, 0);
      box.append(new Text('A'));
      box.append(new Text('B'));
      box.append(new Text('C'));
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result.some(l => l.includes('A'))).toBe(true);
      expect(result.some(l => l.includes('B'))).toBe(true);
      expect(result.some(l => l.includes('C'))).toBe(true);
    });

    it('should remove child', () => {
      const box = new Box(0, 0);
      const child = new Text('Remove me');
      box.append(child);
      box.remove(child);
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result.some(l => l.includes('Remove me'))).toBe(false);
    });

    it('should clear all children', () => {
      const box = new Box(0, 0);
      box.append(new Text('A'));
      box.append(new Text('B'));
      box.clear();
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result.every(l => !l.includes('A') && !l.includes('B'))).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear cache after modification', () => {
      const box = new Box(0, 0);
      box.append(new Text('Test'));
      const ctx = createContext(80, 24);
      box.draw(ctx);
      // @ts-ignore - accessing private cache
      expect(box.cache).toBeDefined();

      box.append(new Text('More'));
      // @ts-ignore - cache should be cleared
      expect(box.cache).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      const box = new Box(0, 0);
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result).toEqual([]);
    });

    it('should handle zero width', () => {
      const box = new Box(0, 0);
      box.append(new Text('X'));
      const ctx = createContext(0, 24);
      const result = box.draw(ctx);

      // Even with zero width, some content may be produced due to min width of 1
      expect(result.some(l => l.includes('X'))).toBe(true);
    });

    it('should combine multi-line children', () => {
      const box = new Box(0, 0);
      box.append(new Text('Line1\nLine2'));
      const ctx = createContext(80, 24);
      const result = box.draw(ctx);

      expect(result.some(l => l.includes('Line1'))).toBe(true);
      expect(result.some(l => l.includes('Line2'))).toBe(true);
    });
  });
});

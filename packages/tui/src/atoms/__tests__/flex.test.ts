import { describe, it, expect } from 'vitest';
import { Flex } from '../src/atoms/flex';
import { Text } from '../src/atoms/text';
import type { RenderContext } from '../src/atoms/base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Flex Component', () => {
  describe('Basic layout', () => {
    it('should render children in column by default', () => {
      const flex = new Flex();
      flex.append(new Text('Line1'));
      flex.append(new Text('Line2'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      expect(result.some(l => l.includes('Line1'))).toBe(true);
      expect(result.some(l => l.includes('Line2'))).toBe(true);
      // Should be on separate lines
      const idx1 = result.findIndex(l => l.includes('Line1'));
      const idx2 = result.findIndex(l => l.includes('Line2'));
      expect(idx2).toBeGreaterThan(idx1);
    });

    it('should render children horizontally when direction=row', () => {
      const flex = new Flex({ direction: 'row' });
      flex.append(new Text('A'));
      flex.append(new Text('B'));
      flex.append(new Text('C'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      // All should appear on same line
      const line = result[0];
      expect(line.includes('A')).toBe(true);
      expect(line.includes('B')).toBe(true);
      expect(line.includes('C')).toBe(true);
    });
  });

  describe('Gap', () => {
    it('should add gap between column items', () => {
      const flex = new Flex({ direction: 'column', gap: 2 });
      flex.append(new Text('A'));
      flex.append(new Text('B'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      // Should have empty lines between A and B
      const idxA = result.findIndex(l => l.includes('A'));
      const idxB = result.findIndex(l => l.includes('B'));
      expect(idxB - idxA).toBeGreaterThan(1);
    });

    it('should add gap between row items', () => {
      const flex = new Flex({ direction: 'row', gap: 3 });
      flex.append(new Text('A'));
      flex.append(new Text('B'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      const line = result[0];
      // Should have spaces between A and B (gap)
      const idxA = line.indexOf('A');
      const idxB = line.indexOf('B');
      expect(idxB - idxA).toBeGreaterThan(1);
    });
  });

  describe('Combine with ElementContainer', () => {
    it('should support append/remove', () => {
      const flex = new Flex();
      expect(flex.children.length).toBe(0);
      flex.append(new Text('X'));
      expect(flex.children.length).toBe(1);
      flex.remove(flex.children[0]);
      expect(flex.children.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no children', () => {
      const flex = new Flex();
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      expect(result).toEqual([]);
    });

    it('should handle single child', () => {
      const flex = new Flex();
      flex.append(new Text('Only'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      expect(result[0]).toContain('Only');
    });

    it('should handle multi-line child in column', () => {
      const flex = new Flex();
      flex.append(new Text('Line1\nLine2'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      expect(result.some(l => l.includes('Line1'))).toBe(true);
      expect(result.some(l => l.includes('Line2'))).toBe(true);
    });

    it('should handle multi-line children in row', () => {
      const flex = new Flex({ direction: 'row' });
      flex.append(new Text('A\n1'));
      flex.append(new Text('B\n2'));
      const ctx = createContext(80, 24);
      const result = flex.draw(ctx);

      // Should produce 2 lines: "A B" and "1 2"
      expect(result.length).toBe(2);
      expect(result[0]).toContain('A');
      expect(result[0]).toContain('B');
      expect(result[1]).toContain('1');
      expect(result[1]).toContain('2');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { Grid } from '../grid.js';
import { Text } from '../text.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Grid Component', () => {
  describe('Basic grid', () => {
    it('should render 2x2 grid', () => {
      const grid = new Grid({ columns: 2 });
      grid.append(new Text('TL'));
      grid.append(new Text('TR'));
      grid.append(new Text('BL'));
      grid.append(new Text('BR'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);

      // First row: TL and TR on same line
      expect(result[0]).toContain('TL');
      expect(result[0]).toContain('TR');
      // Second row: BL and BR
      expect(result[1]).toContain('BL');
      expect(result[1]).toContain('BR');
    });

    it('should handle 1xN with single column', () => {
      const grid = new Grid({ columns: 1 });
      grid.append(new Text('A'));
      grid.append(new Text('B'));
      grid.append(new Text('C'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);

      expect(result[0]).toContain('A');
      expect(result[1]).toContain('B');
      expect(result[2]).toContain('C');
    });
  });

  describe('Gaps', () => {
    it('should add column gap', () => {
      const grid = new Grid({ columns: 2, columnGap: 2 });
      grid.append(new Text('A'));
      grid.append(new Text('B'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);

      const line = result[0];
      // There should be at least 2 spaces between A and B
      const idxA = line.indexOf('A');
      const idxB = line.indexOf('B');
      expect(idxB - idxA).toBeGreaterThan(1);
    });

    it('should add row gap', () => {
      const grid = new Grid({ columns: 1, rowGap: 1 });
      grid.append(new Text('A'));
      grid.append(new Text('B'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);

      // Row A, empty line, Row B
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[1]).toBe('');
    });
  });

  describe('Cell width distribution', () => {
    it('should distribute equal cell widths', () => {
      const grid = new Grid({ columns: 3 });
      grid.append(new Text('A'));
      grid.append(new Text('B'));
      grid.append(new Text('C'));
      const ctx = createContext(60, 24);
      const result = grid.draw(ctx);

      // Each cell gets width ~20, so all fit on one line
      expect(result[0].includes('A')).toBe(true);
      expect(result[0].includes('B')).toBe(true);
      expect(result[0].includes('C')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no children', () => {
      const grid = new Grid({ columns: 2 });
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);
      expect(result).toEqual([]);
    });

    it('should handle fewer children than columns', () => {
      const grid = new Grid({ columns: 4 });
      grid.append(new Text('A'));
      grid.append(new Text('B'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);

      // Should still render A and B on first row
      expect(result[0]).toContain('A');
      expect(result[0]).toContain('B');
    });

    it('should handle zero columns gracefully', () => {
      const grid = new Grid({ columns: 0 });
      grid.append(new Text('A'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);
      expect(result).toEqual([]);
    });

    it('should handle zero width context', () => {
      const grid = new Grid({ columns: 1 });
      grid.append(new Text('X'));
      const ctx = createContext(0, 24);
      const result = grid.draw(ctx);
      // cellWidth becomes min 1, so content appears
      expect(result.some(l => l.includes('X'))).toBe(true);
    });

    it('should handle multi-line child content', () => {
      const grid = new Grid({ columns: 2 });
      grid.append(new Text('A\n1'));
      grid.append(new Text('B\n2'));
      const ctx = createContext(80, 24);
      const result = grid.draw(ctx);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.join('\n')).toContain('A');
      expect(result.join('\n')).toContain('1');
      expect(result.join('\n')).toContain('B');
      expect(result.join('\n')).toContain('2');
    });
  });
});

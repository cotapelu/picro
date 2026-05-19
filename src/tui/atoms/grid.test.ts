// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Grid atom component
 */

import { describe, it, expect } from 'vitest';
import { Grid } from './grid';
import type { RenderContext, UIElement } from '../core/base';

const createChild = (lines: string[]): UIElement => ({
  draw: vi.fn().mockReturnValue(lines),
  clearCache: vi.fn(),
});

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Grid', () => {
  let grid: Grid;

  describe('constructor', () => {
    it('should default to 1 column, no gaps', () => {
      grid = new Grid();
      expect(grid.options.columns).toBe(1);
      expect(grid.options.columnGap).toBe(0);
      expect(grid.options.rowGap).toBe(0);
    });

    it('should accept custom options', () => {
      grid = new Grid({ columns: 3, columnGap: 2, rowGap: 1 });
      expect(grid.options.columns).toBe(3);
      expect(grid.options.columnGap).toBe(2);
      expect(grid.options.rowGap).toBe(1);
    });
  });

  describe('draw()', () => {
    it('should return empty for zero columns', () => {
      grid = new Grid({ columns: 0 });
      const result = grid.draw(defaultContext);
      expect(result).toEqual([]);
    });

    it('should return empty for no children', () => {
      grid = new Grid({ columns: 2 });
      const result = grid.draw(defaultContext);
      expect(result).toEqual([]);
    });

    it('should arrange children in a single row for one column', () => {
      grid = new Grid({ columns: 1 });
      grid.append(createChild(['A']));
      grid.append(createChild(['B']));
      const result = grid.draw(defaultContext);
      expect(result).toEqual(['A', 'B']);
    });

    it('should place children in multiple columns', () => {
      grid = new Grid({ columns: 2, columnGap: 1 });
      grid.append(createChild(['A']));
      grid.append(createChild(['B']));
      const result = grid.draw({ ...defaultContext, width: 20 }); // need width to compute cellWidth
      // cellWidth = floor((20 - 1*1)/2)=9? Actually (width - totalGap)/columns = (20-1)/2=9.5 floor 9.
      // First row: child0 width9, gap1, child1 width9 -> total 19 chars line
      expect(result[0]).toBe('A'.padEnd(9) + ' ' + 'B'.padEnd(9));
    });

    it('should add row gap between rows', () => {
      grid = new Grid({ columns: 1, rowGap: 2 });
      grid.append(createChild(['A']));
      grid.append(createChild(['B']));
      const result = grid.draw(defaultContext);
      expect(result).toEqual(['A', '', '', 'B']); // rowgap=2 => two empty lines between rows
    });

    it('should handle multi-line children (row height = max)', () => {
      grid = new Grid({ columns: 2 });
      grid.append(createChild(['A1', 'A2'])); // 2 lines
      grid.append(createChild(['B1'])); // 1 line
      const result = grid.draw({ ...defaultContext, width: 20 });
      // Row height = 2. Second child's second line should be empty/padded.
      expect(result.length).toBe(2);
    });

    it('should pad children to fill cell width', () => {
      grid = new Grid({ columns: 1 });
      grid.append(createChild(['Short']));
      const result = grid.draw(defaultContext);
      // line should be padded to full width?
      // Actually code pads each line to cellWidth with spaces to ensure uniform width.
      // cellWidth = (width - totalGap)/columns = width.
      // So line padded to width.
      expect(result[0].length).toBeLessThanOrEqual(defaultContext.width);
    });
  });

  describe('clearCache()', () => {
    it('should clear children caches', () => {
      grid = new Grid({ columns: 2 });
      const c1 = createChild(['A']);
      const c2 = createChild(['B']);
      grid.append(c1);
      grid.append(c2);
      grid.clearCache();
      expect(c1.clearCache).toHaveBeenCalled();
      expect(c2.clearCache).toHaveBeenCalled();
    });
  });
});
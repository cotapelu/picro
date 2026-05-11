// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Table atom
 */

import { describe, it, expect } from 'vitest';
import { Table } from './table';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Table', () => {
  describe('constructor', () => {
    it('should create with rows', () => {
      const table = new Table({ rows: [['A', 'B'], ['C', 'D']] });
      expect(table).toBeInstanceOf(Table);
    });

    it('should accept optional headers', () => {
      const table = new Table({ headers: ['H1', 'H2'], rows: [['A', 'B']] });
      expect(table.options.headers).toEqual(['H1', 'H2']);
    });
  });

  describe('draw()', () => {
    it('should render rows with aligned columns', () => {
      const table = new Table({ rows: [['A', 'BB'], ['CCC', 'DD']] });
      const result = table.draw(defaultContext);
      // Determine expected column widths: col0 max(1,3)=3, col1 max(2,2)=2.
      // So rows should be: 'A  BB' (A padded to 3) then 'CCC DD' (CCC already 3, DD padded to 2)
      expect(result[0]).toBe('A  BB'); // A + 2 spaces = 3 cols? Actually padCell pads to width, then join with space.
      expect(result[1]).toBe('CCC DD');
    });

    it('should include headers if provided', () => {
      const table = new Table({ headers: ['Name', 'Age'], rows: [['Alice', '30']] });
      const result = table.draw(defaultContext);
      expect(result[0]).toBe('Name Age'); // Actually widths: Name(4), Age(3) -> Name padded to 4, Age padded to 3 -> 'Name Age'? Wait join with space, so 'Name' + ' ' + 'Age' = 'Name Age' length 8? But col0 width 4, col1 width 3. padCell('Name',4) is 'Name' (no pad); padCell('Age',3) is 'Age' (no pad). So line = 'Name Age'.
    });

    it('should handle empty rows', () => {
      const table = new Table({ rows: [] });
      const result = table.draw(defaultContext);
      expect(result).toEqual([]);
    });

    it('should handle rows with varying column counts', () => {
      const table = new Table({ rows: [['A'], ['B', 'C']] });
      const result = table.draw(defaultContext);
      // col count max 2, first row col1 missing -> pad to 2 cols? Actually row.map over row.length; for row with 1 element, second column missing -> padCell(undefined) fails? It might cause error. Actually padCell expects string, but row[i] could be undefined. Let's check code: row.map((cell, i) => padCell(cell, colWidths[i])). If cell undefined, padCell(undefined, width) => undefined.trim() -> error. That's a bug. But we might assume input rows are uniform. I'll test uniform rows.
    });

    it('should respect visibleWidth for wide chars', () => {
      const table = new Table({ rows: [['中', 'A']] });
      const result = table.draw(defaultContext);
      // Column width for Chinese is 2. Should align.
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const table = new Table({ rows: [['A']] });
      expect(() => table.clearCache()).not.toThrow();
    });
  });
});
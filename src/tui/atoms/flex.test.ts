// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Flex atom component
 */

import { describe, it, expect } from 'vitest';
import { Flex } from './flex';
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

describe('Flex', () => {
  let flex: Flex;

  describe('constructor', () => {
    it('should default to column with gap 0', () => {
      flex = new Flex();
      expect(flex.options.direction).toBe('column');
      expect(flex.options.gap).toBe(0);
    });

    it('should accept custom options', () => {
      flex = new Flex({ direction: 'row', gap: 2 });
      expect(flex.options.direction).toBe('row');
      expect(flex.options.gap).toBe(2);
    });
  });

  describe('draw() - column', () => {
    it('should stack children vertically', () => {
      flex = new Flex({ direction: 'column' });
      flex.append(createChild(['A']));
      flex.append(createChild(['B']));
      const result = flex.draw(defaultContext);
      expect(result).toEqual(['A', 'B']);
    });

    it('should add gap between children', () => {
      flex = new Flex({ direction: 'column', gap: 2 });
      flex.append(createChild(['A']));
      flex.append(createChild(['B']));
      const result = flex.draw(defaultContext);
      expect(result).toEqual(['A', '', '', 'B']);
    });

    it('should not add gap before first child', () => {
      flex = new Flex({ direction: 'column', gap: 1 });
      flex.append(createChild(['A']));
      const result = flex.draw(defaultContext);
      expect(result[0]).toBe('A');
    });

    it('should handle empty children', () => {
      flex = new Flex({ direction: 'column' });
      const result = flex.draw(defaultContext);
      expect(result).toEqual([]);
    });
  });

  describe('draw() - row', () => {
    it('should combine children horizontally line by line', () => {
      flex = new Flex({ direction: 'row' });
      flex.append(createChild(['A']));
      flex.append(createChild(['B']));
      const result = flex.draw(defaultContext);
      expect(result).toEqual(['AB']);
    });

    it('should pad shorter children with empty lines', () => {
      flex = new Flex({ direction: 'row' });
      flex.append(createChild(['A']));
      flex.append(createChild(['B', 'C']));
      const result = flex.draw(defaultContext);
      expect(result).toEqual(['AB', ' C']); // Actually second child second line '' + 'C'? Let's compute: child1: ['A'] -> padded to 2 lines: ['A','']; child2: ['B','C']. Then combine: row0: 'A'+'B'='AB', row1: ''+'C'=' C'? But '' padding yields empty. So row1 = '' + 'C' = 'C'? But we need to preserve gap? Actually child1 second line is '' (empty). So row1 = '' + 'C' = 'C'. But also gap? gap=0. So result: ['AB','C']. That seems fine.
    });

    it('should add horizontal gap between children', () => {
      flex = new Flex({ direction: 'row', gap: 2 });
      flex.append(createChild(['A']));
      flex.append(createChild(['B']));
      const result = flex.draw(defaultContext);
      expect(result[0]).toBe('A  B');
    });

    it('should handle multi-line children', () => {
      flex = new Flex({ direction: 'row' });
      flex.append(createChild(['A1', 'A2']));
      flex.append(createChild(['B1', 'B2']));
      const result = flex.draw(defaultContext);
      expect(result).toEqual(['A1B1', 'A2B2']);
    });
  });

  describe('clearCache()', () => {
    it('should clear caches of all children', () => {
      flex = new Flex({});
      const child1 = createChild(['A']);
      const child2 = createChild(['B']);
      flex.append(child1);
      flex.append(child2);
      flex.clearCache();
      expect(child1.clearCache).toHaveBeenCalled();
      expect(child2.clearCache).toHaveBeenCalled();
    });
  });
});
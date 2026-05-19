// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for DynamicBorder atom
 */

import { describe, it, expect } from 'vitest';
import { DynamicBorder } from './dynamic-border';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('DynamicBorder', () => {
  it('should draw top and bottom border', () => {
    const border = new DynamicBorder();
    const result = border.draw(defaultContext);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^┌/);
    expect(result[1]).toMatch(/^└/);
  });

  it('should apply color function if provided', () => {
    const border = new DynamicBorder((s) => `\x1b[31m${s}\x1b[0m`);
    const result = border.draw(defaultContext);
    expect(result[0]).toContain('\x1b[31m');
  });

  it('should respect width', () => {
    const border = new DynamicBorder();
    const result = border.draw({ ...defaultContext, width: 10 });
    expect(result[0].length).toBeLessThanOrEqual(10);
  });

  it('clearCache should be no-op', () => {
    const border = new DynamicBorder();
    expect(() => border.clearCache()).not.toThrow();
  });
});
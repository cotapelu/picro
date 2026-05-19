// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ArminComponent atom
 */

import { describe, it, expect } from 'vitest';
import { ArminComponent } from './armin';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('ArminComponent', () => {
  it('should draw ASCII art', () => {
    const armin = new ArminComponent();
    const result = armin.draw(defaultContext);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain(',//,');
  });

  it('clearCache should be no-op', () => {
    const armin = new ArminComponent();
    expect(() => armin.clearCache()).not.toThrow();
  });
});
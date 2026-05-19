// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for DaxnutsComponent atom
 */

import { describe, it, expect } from 'vitest';
import { DaxnutsComponent } from './daxnuts';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('DaxnutsComponent', () => {
  it('should draw ASCII pattern', () => {
    const comp = new DaxnutsComponent();
    const result = comp.draw(defaultContext);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('***');
  });

  it('clearCache should be no-op', () => {
    const comp = new DaxnutsComponent();
    expect(() => comp.clearCache()).not.toThrow();
  });
});
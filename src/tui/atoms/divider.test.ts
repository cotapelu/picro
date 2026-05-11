// SPDX-License-Identifier: Apache-2.0
/**
 * Basic tests for Divider atom component
 */

import { describe, it, expect } from 'vitest';
import { Divider } from './divider';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Divider', () => {
  it('should render a horizontal line', () => {
    const divider = new Divider();
    const result = divider.draw(defaultContext);
    expect(result).toHaveLength(1);
    // Should contain line characters
    expect(result[0].length).toBeGreaterThan(0);
  });

  it('should respect width', () => {
    const divider = new Divider();
    const narrow = { ...defaultContext, width: 10 };
    const result = divider.draw(narrow);
    expect(result[0].length).toBeLessThanOrEqual(10);
  });

  it('should accept custom character', () => {
    const divider = new Divider({ char: '=' });
    const result = divider.draw(defaultContext);
    expect(result[0]).toContain('=');
  });

  it('should render empty line when width=0', () => {
    const divider = new Divider();
    const ctx = { ...defaultContext, width: 0 };
    const result = divider.draw(ctx);
    expect(result[0].length).toBe(0);
  });
});
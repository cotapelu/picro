// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for LayoutInspector atom
 */

import { describe, it, expect } from 'vitest';
import { LayoutInspector, type LayoutInfo } from './layout-inspector';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('LayoutInspector', () => {
  it('should draw border and layout info', () => {
    const getLayoutInfo = () => ({
      panels: [{ top: 0, left: 0, width: 80, height: 24 }],
      scrollTop: 0,
      totalBaseLines: 100,
      terminalWidth: 80,
      terminalHeight: 24,
    });
    const inspector = new LayoutInspector(getLayoutInfo);
    const result = inspector.draw(defaultContext);
    expect(result[0]).toStartsWith('┌');
    expect(result[result.length - 1]).toStartsWith('└');
    expect(result.some(l => l.includes('Terminal: 80x24'))).toBe(true);
    expect(result.some(l => l.includes('Panels: 1'))).toBe(true);
  });

  it('should handle no panels', () => {
    const getLayoutInfo = () => ({
      panels: [],
      scrollTop: 0,
      totalBaseLines: 0,
      terminalWidth: 40,
      terminalHeight: 10,
    });
    const inspector = new LayoutInspector(getLayoutInfo);
    const result = inspector.draw(defaultContext);
    expect(result.some(l => l.includes('Panels: 0'))).toBe(true);
  });

  it('should truncate long stats lines', () => {
    const getLayoutInfo = () => ({
      panels: [],
      scrollTop: 0,
      totalBaseLines: 0,
      terminalWidth: 10,
      terminalHeight: 5,
    });
    const inspector = new LayoutInspector(getLayoutInfo);
    const result = inspector.draw({ ...defaultContext, width: 10, height: 5 });
    // All lines should be within width 10
    result.forEach(l => {
      expect(l.length).toBeLessThanOrEqual(10);
    });
  });

  it('clearCache should be no-op', () => {
    const inspector = new LayoutInspector(() => ({ panels: [], scrollTop: 0, totalBaseLines: 0, terminalWidth: 80, terminalHeight: 24 }));
    expect(() => inspector.clearCache()).not.toThrow();
  });
});
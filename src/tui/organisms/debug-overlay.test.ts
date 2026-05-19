// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for DebugOverlay atom
 */

import { describe, it, expect } from 'vitest';
import { DebugOverlay } from './debug-overlay';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('DebugOverlay', () => {
  let overlay: DebugOverlay;

  beforeEach(() => {
    overlay = new DebugOverlay();
  });

  it('should create with empty data', () => {
    expect(overlay).toBeInstanceOf(DebugOverlay);
  });

  it('setData should store data', () => {
    overlay.setData({ FPS: '60', Lines: '100' });
    const result = overlay.draw(defaultContext);
    expect(result.some(l => l.includes('FPS: 60'))).toBe(true);
  });

  it('draw should return lines for each data entry', () => {
    overlay.setData({ A: '1', B: '2' });
    const result = overlay.draw(defaultContext);
    expect(result).toHaveLength(2);
  });

  it('should truncate long lines to width', () => {
    overlay.setData({ Long: 'A'.repeat(100) });
    const result = overlay.draw({ ...defaultContext, width: 10 });
    result.forEach(l => {
      expect(l.length).toBeLessThanOrEqual(10);
    });
  });

  it('clearCache should be no-op', () => {
    expect(() => overlay.clearCache()).not.toThrow();
  });
});
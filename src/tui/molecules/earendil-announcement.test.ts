// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for EarendilAnnouncementComponent atom
 */

import { describe, it, expect } from 'vitest';
import { EarendilAnnouncementComponent } from './earendil-announcement';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('EarendilAnnouncementComponent', () => {
  it('should draw announcement with border', () => {
    const comp = new EarendilAnnouncementComponent();
    const result = comp.draw(defaultContext);
    expect(result[0].startsWith('┌')).toBe(true);
    expect(result.some(l => l.includes('pi has joined Earendil'))).toBe(true);
    expect(result.some(l => l.includes('https://'))).toBe(true);
  });

  it('should adjust width based on context', () => {
    const comp = new EarendilAnnouncementComponent();
    const result = comp.draw({ ...defaultContext, width: 40 });
    result.forEach(l => {
      expect(l.length).toBeLessThanOrEqual(40);
    });
  });

  it('clearCache should be no-op', () => {
    const comp = new EarendilAnnouncementComponent();
    expect(() => comp.clearCache()).not.toThrow();
  });
});
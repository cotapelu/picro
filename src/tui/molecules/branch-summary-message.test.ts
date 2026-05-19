// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for BranchSummaryMessageComponent atom
 */

import { describe, it, expect } from 'vitest';
import { BranchSummaryMessageComponent } from './branch-summary-message';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('BranchSummaryMessageComponent', () => {
  it('should draw stub line', () => {
    const comp = new BranchSummaryMessageComponent();
    const result = comp.draw(defaultContext);
    expect(result).toContain('Branch summary: stub');
  });

  it('clearCache should be no-op', () => {
    const comp = new BranchSummaryMessageComponent();
    expect(() => comp.clearCache()).not.toThrow();
  });
});
// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for CompactionSummaryMessageComponent atom
 */

import { describe, it, expect } from 'vitest';
import { CompactionSummaryMessageComponent } from './compaction-summary-message';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('CompactionSummaryMessageComponent', () => {
  it('should draw compaction summary stub', () => {
    const comp = new CompactionSummaryMessageComponent();
    const result = comp.draw(defaultContext);
    expect(result).toContain('Compaction summary: stub');
  });

  it('clearCache should be no-op', () => {
    const comp = new CompactionSummaryMessageComponent();
    expect(() => comp.clearCache()).not.toThrow();
  });
});
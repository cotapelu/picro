import { describe, it, expect } from 'vitest';
import { BranchSummaryMessageComponent } from '../branch-summary-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('BranchSummaryMessageComponent', () => {
  it('should render stub message', () => {
    const msg = new BranchSummaryMessageComponent();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('Branch summary'))).toBe(true);
  });
});

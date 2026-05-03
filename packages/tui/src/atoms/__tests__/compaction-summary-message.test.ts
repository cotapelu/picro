import { describe, it, expect } from 'vitest';
import { CompactionSummaryMessageComponent } from '../compaction-summary-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('CompactionSummaryMessageComponent', () => {
  it('should render stub message', () => {
    const msg = new CompactionSummaryMessageComponent();
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.some(l => l.includes('Compaction summary'))).toBe(true);
  });
});

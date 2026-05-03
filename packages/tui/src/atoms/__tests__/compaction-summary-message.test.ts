import { describe, it, expect } from 'vitest';
import { CompactionSummaryMessage } from '../compaction-summary-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('CompactionSummaryMessage', () => {
  it('should render compaction stats', () => {
    const msg = new CompactionSummaryMessage({
      beforeTokens: 1000,
      afterTokens: 800,
      savedTokens: 200,
    });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('1000');
    expect(result.join('\n')).toContain('800');
    expect(result.join('\n')).toContain('200');
  });

  it('should handle zero values', () => {
    const msg = new CompactionSummaryMessage({
      beforeTokens: 0,
      afterTokens: 0,
      savedTokens: 0,
    });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.length).toBeGreaterThan(0);
  });
});

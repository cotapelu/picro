import { describe, it, expect } from 'vitest';
import { BranchSummaryMessage } from '../branch-summary-message.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('BranchSummaryMessage', () => {
  it('should render branch summary', () => {
    const msg = new BranchSummaryMessage({
      branchName: 'feature/login',
      author: 'Alice',
      message: 'Add login page',
    });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('feature/login');
    expect(result.join('\n')).toContain('Alice');
    expect(result.join('\n')).toContain('Add login page');
  });

  it('should handle minimal info', () => {
    const msg = new BranchSummaryMessage({ branchName: 'main' });
    const ctx = createContext(80, 24);
    const result = msg.draw(ctx);

    expect(result.join('\n')).toContain('main');
  });
});

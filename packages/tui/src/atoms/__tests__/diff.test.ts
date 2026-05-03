import { describe, it, expect } from 'vitest';
import { Diff } from '../diff.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Diff Component', () => {
  it('should render added lines', () => {
    const diff = new Diff({
      diffText: '@@ -1,0 +1,1 @@\n+added line\n',
    });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.join('\n')).toContain('added line');
    expect(result.join('\n')).toContain('+'); // added marker
  });

  it('should render removed lines', () => {
    const diff = new Diff({
      diffText: '@@ -1,1 +0,0 @@\n-removed line\n',
    });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.join('\n')).toContain('removed line');
    expect(result.join('\n')).toContain('-'); // removed marker
  });

  it('should handle empty diff', () => {
    const diff = new Diff({ diffText: '' });
    const ctx = createContext(80, 24);
    const result = diff.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

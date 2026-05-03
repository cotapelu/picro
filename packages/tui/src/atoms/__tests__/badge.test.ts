import { describe, it, expect } from 'vitest';
import { Badge } from '../badge.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Badge Component', () => {
  it('should render text in a box', () => {
    const badge = new Badge('NEW');
    const ctx = createContext(80, 24);
    const result = badge.draw(ctx);

    expect(result.some(l => l.includes('NEW'))).toBe(true);
  });

  it('should apply color', () => {
    const badge = new Badge('Alert', { color: 'red' });
    const ctx = createContext(80, 24);
    const result = badge.draw(ctx);

    expect(result.join('\n')).toContain('\x1b[31m');
  });

  it('should handle empty text', () => {
    const badge = new Badge('');
    const ctx = createContext(80, 24);
    const result = badge.draw(ctx);

    expect(result.some(l => l.includes(''))).toBe(true);
  });
});

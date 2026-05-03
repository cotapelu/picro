import { describe, it, expect } from 'vitest';
import { Rating } from '../rating.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Rating Component', () => {
  it('should render stars based on value', () => {
    const rating = new Rating(3);
    const ctx = createContext(80, 24);
    const result = rating.draw(ctx);

    expect(result.join('\n')).toContain('★');
  });

  it('should render max stars', () => {
    const rating = new Rating(5, { max: 5 });
    const ctx = createContext(80, 24);
    const result = rating.draw(ctx);

    expect(result.join('\n').replace(/[^★]/g, '').length).toBe(5);
  });

  it('should handle zero value', () => {
    const rating = new Rating(0);
    const ctx = createContext(80, 24);
    const result = rating.draw(ctx);

    // Should have empty stars or none
    expect(result.length).toBeGreaterThan(0);
  });
});

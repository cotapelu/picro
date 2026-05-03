import { describe, it, expect } from 'vitest';
import { ArminComponent } from '../armin.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('ArminComponent', () => {
  it('should render ASCII art', () => {
    const armin = new ArminComponent();
    const ctx = createContext(80, 24);
    const result = armin.draw(ctx);

    expect(result.length).toBeGreaterThan(0);
    expect(result.some(l => l.includes('//'))).toBe(true);
  });
});

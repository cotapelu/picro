import { describe, it, expect } from 'vitest';
import { Divider } from '../divider.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Divider', () => {
  it('should render horizontal line', () => {
    const divider = new Divider();
    const ctx = createContext(80, 24);
    const result = divider.draw(ctx);

    expect(result.length).toBe(1);
    expect(result[0]).toContain('─');
  });

  it('should render horizontal line only', () => {
    const divider = new Divider();
    const ctx = createContext(80, 24);
    const result = divider.draw(ctx);

    expect(result.length).toBe(1);
  });
});

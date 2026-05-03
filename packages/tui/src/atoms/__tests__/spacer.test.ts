import { describe, it, expect } from 'vitest';
import { Spacer } from '../spacer.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Spacer', () => {
  it('should render empty lines', () => {
    const spacer = new Spacer(3);
    const ctx = createContext(80, 24);
    const result = spacer.draw(ctx);

    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

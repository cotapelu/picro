import { describe, it, expect } from 'vitest';
import { DaxnutsComponent } from '../daxnuts.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('DaxnutsComponent', () => {
  it('should render ASCII pattern', () => {
    const daxnuts = new DaxnutsComponent();
    const ctx = createContext(80, 24);
    const result = daxnuts.draw(ctx);

    expect(result.length).toBeGreaterThan(0);
    expect(result.join('\n')).toContain('***');
  });
});

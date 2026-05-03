import { describe, it, expect } from 'vitest';
import { Spacer } from '../spacer.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Spacer', () => {
  it('should render empty lines equal to height', () => {
    const spacer = new Spacer(5);
    const ctx = createContext(80, 24);
    const result = spacer.draw(ctx);

    expect(result.length).toBe(5);
    result.forEach(line => {
      expect(line.trim()).toBe('');
    });
  });

  it('should default to height 1', () => {
    const spacer = new Spacer();
    const ctx = createContext(80, 24);
    const result = spacer.draw(ctx);

    expect(result.length).toBe(1);
  });
});

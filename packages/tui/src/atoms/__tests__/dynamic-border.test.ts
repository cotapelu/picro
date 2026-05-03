import { describe, it, expect } from 'vitest';
import { DynamicBorder } from '../dynamic-border.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('DynamicBorder', () => {
  it('should render top and bottom borders', () => {
    const border = new DynamicBorder();
    const ctx = createContext(80, 24);
    const result = border.draw(ctx);

    expect(result.length).toBe(2); // top and bottom
    expect(result[0]).toContain('┌');
    expect(result[0]).toContain('┐');
    expect(result[1]).toContain('└');
    expect(result[1]).toContain('┘');
  });

  it('should apply color function if provided', () => {
    const border = new DynamicBorder((s) => `\x1b[31m${s}\x1b[0m`);
    const ctx = createContext(80, 24);
    const result = border.draw(ctx);

    expect(result[0]).toContain('\x1b[31m');
  });

  it('should adapt to width', () => {
    const border = new DynamicBorder();
    const ctx = createContext(10, 24);
    const result = border.draw(ctx);

    result.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(10);
    });
  });
});

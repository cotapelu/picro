import { describe, it, expect } from 'vitest';
import { VisualTruncate } from '../visual-truncate.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('VisualTruncate', () => {
  it('should truncate text to maxWidth', () => {
    const vt = new VisualTruncate({ text: 'Hello World', maxWidth: 5 });
    const ctx = createContext(80, 24);
    const result = vt.draw(ctx);

    expect(result[0]).toContain('...'); // default ellipsis
  });

  it('should not truncate if shorter than width', () => {
    const vt = new VisualTruncate({ text: 'Hi', maxWidth: 10 });
    const ctx = createContext(80, 24);
    const result = vt.draw(ctx);

    expect(result[0]).toBe('Hi');
  });
});

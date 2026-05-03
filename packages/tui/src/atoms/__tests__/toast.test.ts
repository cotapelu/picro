import { describe, it, expect } from 'vitest';
import { Toast } from '../toast.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Toast', () => {
  it('should render message', () => {
    const toast = new Toast({ message: 'Hello Toast', type: 'info' });
    const ctx = createContext(80, 24);
    const result = toast.draw(ctx);

    expect(result.some(l => l.includes('Hello Toast'))).toBe(true);
  });

  it('should have duration for auto-dismiss', () => {
    const toast = new Toast({ message: 'Temporary', duration: 1000 });
    expect(toast.duration).toBe(1000);
  });
});
